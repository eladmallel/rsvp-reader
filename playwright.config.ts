import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for RSVP Reader E2E tests.
 * See https://playwright.dev/docs/test-configuration
 *
 * Port is automatically detected by scripts/run-e2e.ts to avoid conflicts
 * when multiple agents run tests in different git worktrees.
 */
const TEST_PORT = process.env.TEST_PORT || '3099';

export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Run with 4 workers in CI for faster execution */
  workers: process.env.CI ? 4 : undefined,

  /* Reporter to use */
  reporter: [['html', { open: 'never' }], ['list']],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: `http://localhost:${TEST_PORT}`,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for Chrome (mobile + desktop viewports) */
  projects: [
    // Mobile viewport
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    // Desktop viewport
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `npm run dev -- --port ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Screenshot output directory */
  outputDir: './test-results',
});
