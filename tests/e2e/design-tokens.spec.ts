import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Get today's date for screenshot directory
function getScreenshotDir(): string {
  const today = new Date().toISOString().split('T')[0];
  return `screenshots/${today}`;
}

// Ensure screenshot directory exists
function ensureScreenshotDir(): string {
  const dir = getScreenshotDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

test.describe('Design Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with design tokens applied', async ({ page }) => {
    // Verify the page has loaded - Library page is now the home
    await expect(page.getByRole('heading', { name: 'RSVP Reader', level: 1 })).toBeVisible();

    // Verify body has correct styling from tokens
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('dark mode colors are applied when forced', async ({ page, browserName }) => {
    // Skip color checks on webkit as computed colors may differ
    test.skip(browserName === 'webkit', 'Color checks unreliable on webkit');

    // Force dark mode by setting data-theme attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Wait for transition
    await page.waitForTimeout(300);

    const body = page.locator('body');

    // Get computed background color - should be dark mode
    const bgColor = await body.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });

    // Dark mode bg-primary: #0a0a0b = rgb(10, 10, 11)
    expect(bgColor).toMatch(/rgb\(10,\s*10,\s*11\)/);
  });

  test('light mode colors are applied when theme is set', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Color checks unreliable on webkit');

    // Switch to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // Wait for transition
    await page.waitForTimeout(300);

    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });

    // Light mode bg-primary: #ffffff = rgb(255, 255, 255)
    expect(bgColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
  });

  test('accent-secondary (blue) is used for interactive elements', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Color checks unreliable on webkit');

    // The All button when active should use accent-secondary color
    const allButton = page.getByRole('button', { name: 'All' });
    await expect(allButton).toBeVisible();

    // Get background color of active filter
    const bgColor = await allButton.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });

    // accent-secondary: #3b82f6 = rgb(59, 130, 246)
    expect(bgColor).toMatch(/rgb\(59,\s*130,\s*246\)/);
  });

  test('typography tokens are applied to headings', async ({ page }) => {
    // Check heading exists and is styled
    const h1 = page.getByRole('heading', { name: 'RSVP Reader', level: 1 });
    await expect(h1).toBeVisible();

    // Verify font is applied
    const fontFamily = await h1.evaluate((el) => {
      return getComputedStyle(el).fontFamily;
    });

    // Should include Inter font
    expect(fontFamily.toLowerCase()).toContain('inter');
  });

  test('screenshot: design tokens - dark mode', async ({ page, browserName }, testInfo) => {
    // Only take screenshots on one browser per viewport type
    if (browserName !== 'chromium') {
      test.skip();
    }

    // Force dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `design-tokens-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: design tokens - light mode', async ({ page, browserName }, testInfo) => {
    // Only take screenshots on one browser per viewport type
    if (browserName !== 'chromium') {
      test.skip();
    }

    // Switch to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // Wait for transition
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `design-tokens-${viewport}-light.png`),
      fullPage: true,
    });
  });
});
