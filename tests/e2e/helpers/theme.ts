import type { Page } from '@playwright/test';

/**
 * Helper to set theme with minimal wait time.
 * In CI, CSS transitions are typically instant, so we can reduce the wait time.
 */
export async function setTheme(page: Page, theme: 'dark' | 'light'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);

  // In CI, use shorter wait since CSS transitions are fast/instant
  // Locally, use slightly longer wait for visual debugging
  const waitTime = process.env.CI ? 50 : 300;
  await page.waitForTimeout(waitTime);
}

/**
 * Wait for theme-dependent CSS to apply.
 * Uses minimal timeout in CI environments.
 */
export async function waitForThemeTransition(page: Page): Promise<void> {
  const waitTime = process.env.CI ? 50 : 300;
  await page.waitForTimeout(waitTime);
}

/**
 * Wait for modal/animation to complete.
 * Uses minimal timeout in CI environments.
 */
export async function waitForAnimation(page: Page): Promise<void> {
  const waitTime = process.env.CI ? 100 : 400;
  await page.waitForTimeout(waitTime);
}

/**
 * Wait for debounced operations (search, tab changes, etc).
 * Reduced in CI since debounce timers fire faster under load.
 */
export async function waitForDebounce(page: Page): Promise<void> {
  const waitTime = process.env.CI ? 150 : 500;
  await page.waitForTimeout(waitTime);
}
