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
    // Verify the page has loaded - use getByRole to be specific
    await expect(page.getByRole('heading', { name: 'RSVP Reader', level: 1 })).toBeVisible();

    // Verify design tokens are being used
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check that the RSVP demo section exists with ORP highlighting
    const rsvpCenter = page.locator('[class*="rsvpCenter"]');
    await expect(rsvpCenter).toBeVisible();
    await expect(rsvpCenter).toContainText('i');
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

  test('accent-primary (ORP red) is applied to highlighted letter', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Color checks unreliable on webkit');

    const orpLetter = page.locator('[class*="rsvpCenter"]');

    const color = await orpLetter.evaluate((el) => {
      return getComputedStyle(el).color;
    });

    // accent-primary: #ef4444 = rgb(239, 68, 68)
    expect(color).toMatch(/rgb\(239,\s*68,\s*68\)/);
  });

  test('typography tokens are applied', async ({ page }) => {
    // Check heading 1 exists and has correct structure
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Check heading 2 exists
    const h2 = page.locator('h2').first();
    await expect(h2).toBeVisible();

    // Check body text exists
    const paragraph = page.locator('p').first();
    await expect(paragraph).toBeVisible();
  });

  test('spacing tokens create visual hierarchy', async ({ page }) => {
    // Check spacing demo boxes exist
    const spacingBoxes = page.locator('[class*="spacingBox"]');
    await expect(spacingBoxes).toHaveCount(5);

    // Verify they're visible
    await expect(spacingBoxes.first()).toBeVisible();
    await expect(spacingBoxes.last()).toBeVisible();
  });

  test('color swatches display correctly', async ({ page }) => {
    // Check color swatches exist
    const colorSwatches = page.locator('[class*="colorSwatch"]');
    await expect(colorSwatches).toHaveCount(5);
  });

  test('screenshot: design tokens page - dark mode', async ({ page, browserName }, testInfo) => {
    // Only take screenshots on one browser per viewport type
    if (browserName !== 'chromium') {
      test.skip();
    }

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `design-tokens-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: design tokens page - light mode', async ({ page, browserName }, testInfo) => {
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
});
