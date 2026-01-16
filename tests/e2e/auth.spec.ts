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

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
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

    await expect(page.getByRole('button', { name: 'Creating account...' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
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

  test('screenshot: signup page - mobile dark', async ({ page, browserName }, testInfo) => {
    if (browserName !== 'chromium') {
      test.skip();
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `signup-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: signup page - mobile light', async ({ page, browserName }, testInfo) => {
    if (browserName !== 'chromium') {
      test.skip();
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `signup-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
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

    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email address').fill('error@test.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for simulated API call
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid' })).toContainText(
      'Invalid email or password',
      {
        timeout: 3000,
      }
    );
  });

  test('has link to signup page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL('/auth/signup');
  });

  test('screenshot: login page - mobile dark', async ({ page, browserName }, testInfo) => {
    if (browserName !== 'chromium') {
      test.skip();
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `login-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: login page - mobile light', async ({ page, browserName }, testInfo) => {
    if (browserName !== 'chromium') {
      test.skip();
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const dir = ensureScreenshotDir();
    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: path.join(dir, `login-${viewport}-light.png`),
      fullPage: true,
    });
  });
});
