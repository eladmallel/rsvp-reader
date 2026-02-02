import { setTheme, waitForAnimation } from './helpers/theme';
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
    // Use exact: true to avoid matching the email which also contains 'TU'
    await expect(page.getByText('TU', { exact: true })).toBeVisible();
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

  test('can open and close WPM setting modal', async ({ page }) => {
    // Click on Default Speed setting
    const defaultSpeedItem = page.locator('text=Default Speed').locator('..').locator('..');
    await defaultSpeedItem.click();

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Default Speed' })).toBeVisible();
    await expect(page.getByText(/Set your preferred reading speed/)).toBeVisible();

    // Close button should be visible
    const closeButton = page.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeVisible();

    // Click close button
    await closeButton.click();

    // Modal should be hidden
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can adjust WPM value in modal', async ({ page }) => {
    let updatedPreferences = { ...mockUserPreferences };

    // Mock the PUT endpoint to update preferences
    await page.route('/api/user/preferences', (route) => {
      if (route.request().method() === 'PUT') {
        const postData = route.request().postDataJSON();
        updatedPreferences = { ...updatedPreferences, ...postData };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedPreferences),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedPreferences),
        });
      }
    });

    // Open modal
    const defaultSpeedItem = page.locator('text=Default Speed').locator('..').locator('..');
    await defaultSpeedItem.click();

    // Find and click increment button
    const incrementButton = page.getByRole('button', { name: /Increase/ });
    await incrementButton.click();

    // Save button should be visible
    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can open and close Skip Amount modal', async ({ page }) => {
    // Click on Skip Amount setting
    const skipAmountItem = page.locator('text=Skip Amount').locator('..').locator('..');
    await skipAmountItem.click();

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Skip Amount' })).toBeVisible();

    // Cancel button should work
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();

    // Modal should be hidden
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can select font in font selector modal', async ({ page }) => {
    let updatedPreferences = { ...mockUserPreferences };

    // Mock the PUT endpoint
    await page.route('/api/user/preferences', (route) => {
      if (route.request().method() === 'PUT') {
        const postData = route.request().postDataJSON();
        updatedPreferences = { ...updatedPreferences, ...postData };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedPreferences),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedPreferences),
        });
      }
    });

    // Open font modal
    const fontItem = page.locator('text=RSVP Font').locator('..').locator('..');
    await fontItem.click();

    // Modal should be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'RSVP Font' })).toBeVisible();

    // Should show font options - look for the description text
    await expect(dialog.getByText(/Choose the font used to display words/)).toBeVisible();

    // Select Sans Serif font
    const sansSerifOption = dialog.getByRole('button', { name: /Sans Serif/ });
    await sansSerifOption.click();

    // Save
    const saveButton = page.getByRole('button', { name: 'Save' });
    await saveButton.click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
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
    // First, ensure system theme is OFF so the dark mode toggle is enabled
    // The System Theme toggle controls whether dark mode toggle is disabled
    const systemThemeToggle = page.getByRole('switch', { name: 'System theme' });
    const darkModeToggle = page.getByRole('switch', { name: 'Dark mode' });

    // If system theme is on, turn it off first
    const isSystemThemeOn = await systemThemeToggle.getAttribute('aria-checked');
    if (isSystemThemeOn === 'true') {
      await systemThemeToggle.click();
      // Wait for the dark mode toggle to become enabled
      await expect(darkModeToggle).toBeEnabled();
    }

    // Set to light mode first via the toggle if it's currently dark
    const isDarkMode = await darkModeToggle.getAttribute('aria-checked');
    if (isDarkMode === 'true') {
      await darkModeToggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    }

    // Now toggle dark mode on
    await darkModeToggle.click();

    // Verify theme changed to dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('screenshot: settings page - dark mode', async ({ page }, testInfo) => {
    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: settings page - light mode', async ({ page }, testInfo) => {
    await setTheme(page, 'light');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-${viewport}-light.png`),
      fullPage: true,
    });
  });

  test('screenshot: WPM setting modal - dark mode', async ({ page }, testInfo) => {
    await setTheme(page, 'dark');

    // Open modal
    const defaultSpeedItem = page.locator('text=Default Speed').locator('..').locator('..');
    await defaultSpeedItem.click();

    // Wait for modal animation
    await waitForAnimation(page);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-wpm-modal-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: WPM setting modal - light mode', async ({ page }, testInfo) => {
    await setTheme(page, 'light');

    // Open modal
    const defaultSpeedItem = page.locator('text=Default Speed').locator('..').locator('..');
    await defaultSpeedItem.click();

    // Wait for modal animation
    await waitForAnimation(page);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-wpm-modal-${viewport}-light.png`),
      fullPage: true,
    });
  });

  test('screenshot: Skip Amount modal - dark mode', async ({ page }, testInfo) => {
    await setTheme(page, 'dark');

    // Open modal
    const skipAmountItem = page.locator('text=Skip Amount').locator('..').locator('..');
    await skipAmountItem.click();

    // Wait for modal animation
    await waitForAnimation(page);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-skip-modal-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: Font selector modal - light mode', async ({ page }, testInfo) => {
    await setTheme(page, 'light');

    // Open modal
    const fontItem = page.locator('text=RSVP Font').locator('..').locator('..');
    await fontItem.click();

    // Wait for modal animation
    await waitForAnimation(page);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `settings-font-modal-${viewport}-light.png`),
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
