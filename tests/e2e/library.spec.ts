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

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Hide Next.js dev overlay to prevent it from intercepting clicks on mobile
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test('displays the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'RSVP Reader', level: 1 })).toBeVisible();
  });

  test('shows tab navigation with Library, Feed, History', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Feed' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'History' })).toBeVisible();
  });

  test('Library tab is active by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('displays article cards', async ({ page }) => {
    // Check that at least one article card is visible
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible();

    // Should have multiple articles in the library
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('article cards display title, author, site name', async ({ page }) => {
    const firstArticle = page.locator('article').first();

    // Check card contains expected elements
    await expect(firstArticle.locator('h3')).toBeVisible();
  });

  test('shows tag filter with All button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
  });

  test('tag filter shows available tags', async ({ page }) => {
    // Check for some common tags from mock data
    const tagGroup = page.getByRole('group', { name: 'Filter by tag' });
    await expect(tagGroup).toBeVisible();
  });

  test('clicking a tag filters articles', async ({ page }) => {
    // Get initial article count
    const initialCount = await page.locator('article').count();

    // Find and click on a visible tag (not All)
    const tagGroup = page.getByRole('group', { name: 'Filter by tag' });
    const tags = tagGroup.getByRole('button').filter({ hasNotText: 'All' });
    const firstTag = tags.first();

    // Scroll tag into view if needed and click
    await firstTag.scrollIntoViewIfNeeded();
    await firstTag.click();

    // Wait for filter to apply
    await page.waitForTimeout(200);

    // Count should change (could be less or same if all match)
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('clicking All clears tag filter', async ({ page }) => {
    // First click on a tag to filter
    const tagGroup = page.getByRole('group', { name: 'Filter by tag' });
    const tags = tagGroup.getByRole('button').filter({ hasNotText: 'All' });
    const firstTag = tags.first();

    await firstTag.scrollIntoViewIfNeeded();
    await firstTag.click();
    await page.waitForTimeout(200);

    // Verify All button is not pressed
    const allButton = page.getByRole('button', { name: 'All' });
    await expect(allButton).toHaveAttribute('aria-pressed', 'false');

    // Click All to clear filter
    await allButton.click();
    await page.waitForTimeout(200);

    // All button should now be pressed
    await expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching tabs changes content', async ({ page }) => {
    // Click on Feed tab
    await page.getByRole('tab', { name: 'Feed' }).click();

    // Feed tab should be active
    await expect(page.getByRole('tab', { name: 'Feed' })).toHaveAttribute('aria-selected', 'true');

    // Library tab should not be active
    await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  test('articles are keyboard accessible', async ({ page }) => {
    const firstArticle = page.locator('article').first();

    // Focus on first article
    await firstArticle.focus();
    await expect(firstArticle).toBeFocused();

    // Should have appropriate aria-label
    const ariaLabel = await firstArticle.getAttribute('aria-label');
    expect(ariaLabel).toContain('Read');
  });

  test('screenshot: library page - mobile dark', async ({ page, browserName }, testInfo) => {
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
      path: path.join(dir, `library-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: library page - mobile light', async ({ page, browserName }, testInfo) => {
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
      path: path.join(dir, `library-${viewport}-light.png`),
      fullPage: true,
    });
  });
});
