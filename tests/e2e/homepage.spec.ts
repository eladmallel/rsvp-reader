import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');

    // Verify the page loaded by checking for body content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display Next.js default page content', async ({ page }) => {
    await page.goto('/');

    // Check for any content on the page (Next.js default has a main element)
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
