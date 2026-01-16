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

test.describe('RSVP Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rsvp');
  });

  test('displays the page with back link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Back to Library/i })).toBeVisible();
  });

  test('displays article title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sample Article', level: 1 })).toBeVisible();
  });

  test('displays word display area', async ({ page }) => {
    // Word display should show the first word
    const wordArea = page.locator('[class*="displayArea"]');
    await expect(wordArea).toBeVisible();
  });

  test('displays play button initially', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('displays rewind and forward buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Rewind' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forward' })).toBeVisible();
  });

  test('displays WPM slider', async ({ page }) => {
    await expect(page.getByRole('slider', { name: 'Words per minute' })).toBeVisible();
  });

  test('displays WPM value', async ({ page }) => {
    await expect(page.getByText('300 WPM')).toBeVisible();
  });

  test('displays exit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Exit reading mode' })).toBeVisible();
  });

  test('displays progress bar', async ({ page }) => {
    await expect(page.getByRole('progressbar')).toBeVisible();
  });

  test('shows paused status initially', async ({ page }) => {
    await expect(page.getByText('Paused')).toBeVisible();
  });

  test('toggles play/pause on button click', async ({ page }) => {
    // Initially should show Play button and Paused status
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByText('Paused')).toBeVisible();

    // Click play
    await page.getByRole('button', { name: 'Play' }).click();

    // Should now show Pause button and Playing status
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(page.getByText('Playing')).toBeVisible();
  });

  test('forward button advances word', async ({ page }) => {
    // Get initial progress text
    const progressText = page.getByText(/1 \//).first();
    await expect(progressText).toBeVisible();

    // Click forward
    await page.getByRole('button', { name: 'Forward' }).click();

    // Progress should advance
    await expect(page.getByText(/2 \//)).toBeVisible();
  });

  test('rewind button goes back', async ({ page }) => {
    // First advance
    await page.getByRole('button', { name: 'Forward' }).click();
    await page.getByRole('button', { name: 'Forward' }).click();

    // Now at word 3
    await expect(page.getByText(/3 \//)).toBeVisible();

    // Rewind
    await page.getByRole('button', { name: 'Rewind' }).click();

    // Should be back to word 2
    await expect(page.getByText(/2 \//)).toBeVisible();
  });

  test('WPM slider changes display', async ({ page }) => {
    const slider = page.getByRole('slider', { name: 'Words per minute' });

    // Change slider value
    await slider.fill('500');

    // Should show new WPM value
    await expect(page.getByText('500 WPM')).toBeVisible();
  });

  test('back link navigates to library', async ({ page }) => {
    await page.getByRole('link', { name: /Back to Library/i }).click();

    // Should be on home page (library)
    await expect(page.getByRole('heading', { name: 'RSVP Reader' })).toBeVisible();
  });

  test('ORP character is highlighted', async ({ page }) => {
    // The ORP character should have distinct styling
    const orpElement = page.locator('[class*="orp"]');
    await expect(orpElement).toBeVisible();
  });

  test('screenshot: rsvp page - mobile dark', async ({ page, browserName }, testInfo) => {
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
      path: path.join(dir, `rsvp-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: rsvp page - mobile light', async ({ page, browserName }, testInfo) => {
    if (browserName !== 'chromium') {
      test.skip();
    }

    // Switch to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `rsvp-${viewport}-light.png`),
      fullPage: true,
    });
  });
});
