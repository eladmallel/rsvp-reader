import { test, expect, type TestInfo } from '@playwright/test';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

const mockUserProfile = {
  id: 'user-123',
  email: 'testuser@example.com',
  name: 'Test User',
  initials: 'TU',
  isPro: false,
  readerConnected: true,
};

const mockUserPreferences = {
  defaultWpm: 350,
  skipAmount: 3,
  rsvpFont: 'monospace',
  theme: 'dark',
};

// Mock APIs
async function mockSettingsAPIs(page: import('@playwright/test').Page) {
  await page.route('/api/user/profile', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserProfile),
    });
  });

  await page.route('/api/user/preferences', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserPreferences),
    });
  });

  // Mock the disconnect endpoint
  await page.route('/api/auth/connect-reader', (route) => {
    if (route.request().method() === 'DELETE') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.continue();
    }
  });
}

// Mock APIs with disconnected Reader
async function mockSettingsAPIsDisconnected(page: import('@playwright/test').Page) {
  await page.route('/api/user/profile', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...mockUserProfile,
        readerConnected: false,
      }),
    });
  });

  await page.route('/api/user/preferences', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserPreferences),
    });
  });
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockSettingsAPIs(page);
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });
  });

  test('displays the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  });

  test('displays user profile information', async ({ page }) => {
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('testuser@example.com')).toBeVisible();
    await expect(page.getByText('TU')).toBeVisible();
  });

  test('displays section headers', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reading Preferences' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  });

  test('displays Readwise Reader connection status when connected', async ({ page }) => {
    await expect(page.getByText('Readwise Reader')).toBeVisible();
    await expect(page.getByText('Connected')).toBeVisible();
  });

  test('displays reading preferences with correct values', async ({ page }) => {
    await expect(page.getByText('Default Speed')).toBeVisible();
    await expect(page.getByText('350 WPM')).toBeVisible();
    await expect(page.getByText('Skip Amount')).toBeVisible();
    await expect(page.getByText('3 words')).toBeVisible();
    await expect(page.getByText('RSVP Font')).toBeVisible();
  });

  test('displays appearance toggles', async ({ page }) => {
    await expect(page.getByText('Dark Mode')).toBeVisible();
    await expect(page.getByText('System Theme')).toBeVisible();
  });

  test('displays support links', async ({ page }) => {
    await expect(page.getByText('Help & FAQ')).toBeVisible();
    await expect(page.getByText('Contact Support')).toBeVisible();
    await expect(page.getByText('Privacy Policy')).toBeVisible();
  });

  test('displays logout button', async ({ page }) => {
    await expect(page.getByText('Log Out')).toBeVisible();
  });

  test('displays version footer', async ({ page }) => {
    await expect(page.getByText(/RSVP Reader v/)).toBeVisible();
  });

  test('dark mode toggle works', async ({ page }) => {
    // Set to light mode first
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // Find the dark mode toggle
    const darkModeRow = page.locator('text=Dark Mode').locator('..');
    const toggle = darkModeRow.locator('[role="switch"]');

    // Toggle dark mode on
    await toggle.click();

    // Verify theme changed
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('screenshot: settings page - dark mode', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: settings page - light mode', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Settings Page - Disconnected State', () => {
  test.beforeEach(async ({ page }) => {
    await mockSettingsAPIsDisconnected(page);
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });
  });

  test('displays not connected status when Reader is disconnected', async ({ page }) => {
    await expect(page.getByText('Readwise Reader')).toBeVisible();
    await expect(page.getByText('Not connected')).toBeVisible();
  });

  test('clicking Readwise Reader when disconnected navigates to connect page', async ({ page }) => {
    const readerItem = page.locator('text=Readwise Reader').locator('..').locator('..');
    await readerItem.click();

    await expect(page).toHaveURL(/\/auth\/connect-reader/);
  });
});

test.describe('Settings Page - Loading State', () => {
  test('shows loading state while fetching data', async ({ page }) => {
    // Delay API responses to observe loading state
    await page.route('/api/user/profile', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUserProfile),
      });
    });

    await page.route('/api/user/preferences', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUserPreferences),
      });
    });

    await page.goto('/settings');

    // Should show loading indicator in profile
    await expect(page.getByText('Loading...')).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('text=Test User', { timeout: 10000 });
  });
});

test.describe('Settings Page - Pro Badge', () => {
  test('shows Pro badge for pro users', async ({ page }) => {
    await page.route('/api/user/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockUserProfile,
          isPro: true,
        }),
      });
    });

    await page.route('/api/user/preferences', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUserPreferences),
      });
    });

    await page.goto('/settings');
    await page.waitForSelector('text=Test User', { timeout: 10000 });

    await expect(page.getByText('Pro')).toBeVisible();
  });

  test('does not show Pro badge for non-pro users', async ({ page }) => {
    await mockSettingsAPIs(page);
    await page.goto('/settings');
    await page.waitForSelector('text=Test User', { timeout: 10000 });

    await expect(page.getByText('Pro')).not.toBeVisible();
  });
});
