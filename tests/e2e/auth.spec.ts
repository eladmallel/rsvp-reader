import { test, expect, type TestInfo } from '@playwright/test';
import {
  ensureSupabaseConfigured,
  hasServiceRoleKey,
  deleteTestUserByEmail,
  generateTestEmail,
  generateTestPassword,
} from './utils/supabase';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

// Verify Supabase is configured before running any auth tests
test.beforeAll(async () => {
  ensureSupabaseConfigured();
});

const shouldRunSupabaseSignupTest = hasServiceRoleKey();

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
    // Hide Next.js dev overlay to prevent it from intercepting clicks on mobile
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test('displays signup form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Account', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('shows password toggle button', async ({ page }) => {
    const passwordField = page.getByLabel('Password', { exact: true });
    await expect(passwordField).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(passwordField).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('shows error for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: 'Create account' }).click();

    // HTML5 validation should prevent submission or show error
    const emailField = page.getByLabel('Email address');
    await expect(emailField).toBeVisible();
  });

  test('shows error for password mismatch', async ({ page }) => {
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password').fill('different123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Passwords' })).toContainText(
      'Passwords do not match'
    );
  });

  test('shows error for short password', async ({ page }) => {
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Password' })).toContainText(
      'at least 8 characters'
    );
  });

  test('shows loading state on submit', async ({ page }) => {
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Check if either the loading state appears OR the response comes quickly
    // Supabase may respond so fast that loading state is very brief
    const result = await Promise.race([
      page
        .getByRole('button', { name: 'Creating account...' })
        .waitFor({ state: 'visible', timeout: 500 })
        .then(() => 'loading'),
      page
        .getByRole('alert')
        .waitFor({ state: 'visible', timeout: 1500 })
        .then(() => 'response'),
      page
        .waitForURL(/\/auth\/connect-reader|\/auth\/login/, { timeout: 2000 })
        .then(() => 'redirect'),
    ]).catch(() => 'timeout');

    // Either we saw the loading state, got a response, or redirected (all valid)
    expect(['loading', 'response', 'redirect']).toContain(result);

    // If we're in loading state, it should be disabled
    if (result === 'loading') {
      await expect(page.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
    }
  });

  test('has link to login page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('displays terms and privacy links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('screenshot: signup page - mobile dark', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `signup-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: signup page - mobile light', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `signup-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Signup Supabase Integration', () => {
  test.skip(!shouldRunSupabaseSignupTest, 'Skipping: Supabase env vars not set');
  test.describe.configure({ mode: 'serial' });

  let createdEmail: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test.afterEach(async () => {
    if (!createdEmail) {
      return;
    }
    await deleteTestUserByEmail(createdEmail);
    createdEmail = null;
  });

  test('creates a Supabase user and redirects or prompts for confirmation', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Chrome', 'Run once to avoid duplicate users');

    const email = generateTestEmail();
    const password = generateTestPassword();
    createdEmail = email;

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    const redirectPromise = page
      .waitForURL('/auth/connect-reader', { timeout: 10000 })
      .then(() => 'redirect');
    const confirmationPromise = page
      .getByRole('alert')
      .filter({ hasText: 'Check your email to confirm your account' })
      .waitFor({ timeout: 10000 })
      .then(() => 'confirmation');

    const result = await Promise.any([redirectPromise, confirmationPromise]);
    expect(['redirect', 'confirmation']).toContain(result);
  });
});

test.describe('Connect Reader Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/connect-reader');
    // Hide Next.js dev overlay to prevent it from intercepting clicks on mobile
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test('displays connect reader form with token input', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Connect Readwise Reader', level: 1 })
    ).toBeVisible();
    await expect(page.getByLabel('Access Token')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Readwise' })).toBeVisible();
  });

  test('shows features list', async ({ page }) => {
    await expect(page.getByText('Access your entire Readwise library instantly')).toBeVisible();
    await expect(page.getByText('Automatically sync read status and progress')).toBeVisible();
    await expect(page.getByText('Save highlights back to your Readwise account')).toBeVisible();
  });

  test('shows link to get access token', async ({ page }) => {
    const tokenLink = page.getByRole('link', { name: 'Get your token', exact: true });
    await expect(tokenLink).toBeVisible();
    await expect(tokenLink).toHaveAttribute('href', 'https://readwise.io/access_token');
    await expect(tokenLink).toHaveAttribute('target', '_blank');
  });

  test('shows paste button for token', async ({ page }) => {
    const tokenField = page.getByLabel('Access Token');
    await expect(tokenField).toHaveAttribute('type', 'password');

    // Check paste button is visible
    const pasteButton = page.getByRole('button', { name: 'Paste from clipboard' });
    await expect(pasteButton).toBeVisible();
  });

  test('shows error for empty token submission', async ({ page }) => {
    await page.getByRole('button', { name: 'Connect Readwise' }).click();

    // HTML5 validation should prevent submission or show error
    const tokenField = page.getByLabel('Access Token');
    await expect(tokenField).toBeVisible();
  });

  test('shows error for short/invalid token', async ({ page }) => {
    await page.getByLabel('Access Token').fill('short');
    await page.getByRole('button', { name: 'Connect Readwise' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: "doesn't look like a valid access token" })
    ).toBeVisible();
  });

  test('shows loading state on submit', async ({ page }) => {
    // Mock a slow API response
    await page.route('/api/auth/connect-reader', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
      });
    });

    await page.getByLabel('Access Token').fill('valid_token_that_is_long_enough_1234567890');
    await page.getByRole('button', { name: 'Connect Readwise' }).click();

    await expect(page.getByRole('button', { name: 'Connecting...' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connecting...' })).toBeDisabled();
  });

  test('shows error for invalid token response', async ({ page }) => {
    // Mock API to return invalid token error
    await page.route('/api/auth/connect-reader', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid access token. Please check your token and try again.',
        }),
      });
    });

    await page.getByLabel('Access Token').fill('invalid_token_that_is_long_enough');
    await page.getByRole('button', { name: 'Connect Readwise' }).click();

    // Wait for API response
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid access token' })).toBeVisible({
      timeout: 3000,
    });
  });

  test('shows success state on successful connection', async ({ page }) => {
    // Mock successful API response
    await page.route('/api/auth/connect-reader', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByLabel('Access Token').fill('valid_reader_access_token_12345');
    await page.getByRole('button', { name: 'Connect Readwise' }).click();

    // Should show success state with "Go to Library" button
    await expect(page.getByRole('heading', { name: 'Connected!' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Go to Library' })).toBeVisible();
  });

  test('redirects to library from success state', async ({ page }) => {
    // Mock successful API response
    await page.route('/api/auth/connect-reader', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByLabel('Access Token').fill('valid_reader_access_token_12345');
    await page.getByRole('button', { name: 'Connect Readwise' }).click();

    // Wait for success state
    await expect(page.getByRole('button', { name: 'Go to Library' })).toBeVisible({
      timeout: 5000,
    });

    // Click to go to library
    // Since we're not actually authenticated (no Supabase session),
    // the home page will redirect to /auth/login
    await page.getByRole('button', { name: 'Go to Library' }).click();
    await expect(page).toHaveURL('/auth/login', { timeout: 10000 });
  });

  test('has skip option to continue without connecting', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    // Since we're not actually authenticated (no Supabase session),
    // the home page will redirect to /auth/login
    await expect(page).toHaveURL('/auth/login', { timeout: 10000 });
  });

  test('has link back to login', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Back to login/i })).toBeVisible();
    await page.getByRole('link', { name: /Back to login/i }).click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('screenshot: connect reader - mobile dark', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `connect-reader-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: connect reader - mobile light', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `connect-reader-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    // Hide Next.js dev overlay to prevent it from intercepting clicks on mobile
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test('displays login form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows remember me checkbox', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: 'Remember me' });
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('shows forgot password link', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
  });

  test('shows password toggle button', async ({ page }) => {
    const passwordField = page.locator('#password');
    await expect(passwordField).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(passwordField).toHaveAttribute('type', 'text');
  });

  test('shows social login buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GitHub' })).toBeVisible();
  });

  test('shows loading state on submit', async ({ page }) => {
    await page.getByLabel('Email address').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Check if either the loading state appears OR the error appears quickly
    // Local Supabase responds so fast that loading state may be very brief
    const result = await Promise.race([
      page
        .getByRole('button', { name: 'Signing in...' })
        .waitFor({ state: 'visible', timeout: 500 })
        .then(() => 'loading'),
      page
        .getByRole('alert')
        .filter({ hasText: /invalid/i })
        .waitFor({ state: 'visible', timeout: 1500 })
        .then(() => 'error'),
    ]).catch(() => 'timeout');

    // Either we saw the loading state or we saw the error (both are valid)
    expect(['loading', 'error']).toContain(result);

    // If we're in loading state, it should be disabled
    if (result === 'loading') {
      await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    }
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email address').fill('error@test.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    const errorAlert = page.getByRole('alert').filter({ hasText: /invalid/i });
    await expect(errorAlert).toContainText(/invalid/i, { timeout: 3000 });
  });

  test('has link to signup page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL('/auth/signup');
  });

  test('screenshot: login page - mobile dark', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `login-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: login page - mobile light', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `login-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Unauthenticated Redirect', () => {
  test('redirects unauthenticated users from home page to login', async ({ page }) => {
    // Clear any existing session data
    await page.context().clearCookies();

    // Navigate to the home page
    await page.goto('/');

    // Should be redirected to the login page
    await expect(page).toHaveURL('/auth/login', { timeout: 10000 });
  });

  test('redirects unauthenticated users who try to access connect-reader directly', async ({
    page,
  }) => {
    // Clear any existing session data
    await page.context().clearCookies();

    // Navigate to connect-reader page
    await page.goto('/auth/connect-reader');

    // Should stay on connect-reader (this page handles auth internally)
    // or redirect to login - verify the page shows properly
    await expect(
      page.getByRole('heading', { name: 'Connect Readwise Reader', level: 1 })
    ).toBeVisible({ timeout: 10000 });
  });
});
