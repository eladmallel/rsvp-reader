/**
 * E2E Integration Tests with Real Readwise Data
 *
 * These tests use the production Readwise sync flow to populate the database cache,
 * then verify the UI reads correctly from cached data. This matches production behavior:
 *
 * 1. Sync endpoint calls Readwise API once (with minimal budget)
 * 2. Data is cached in cached_documents and cached_articles tables
 * 3. UI reads exclusively from the database cache
 *
 * Prerequisites (environment variables):
 * - READWISE_ACCESS_TOKEN: Valid Readwise API token
 * - READWISE_INTEGRATION_TESTS=true: Explicit opt-in flag
 * - SYNC_API_KEY: Secret for triggering the sync endpoint
 * - ENCRYPTION_KEY: For encrypting the Readwise token in the database
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase URL
 * - SUPABASE_SERVICE_ROLE_KEY: Admin access to create test users
 *
 * To run locally:
 *   set -a && source .env.local && set +a && READWISE_INTEGRATION_TESTS=true npm run test:e2e -- integration-real-data
 *
 * Rate limiting strategy:
 * - Sync state is seeded to allow only 2 API requests (safety margin)
 * - Only the 'later' (library) location is synced
 * - Page size is reduced via READWISE_SYNC_PAGE_SIZE_OVERRIDE=10
 * - Result: Minimal Readwise API calls for the entire test suite
 */

import { test, expect, type TestInfo } from '@playwright/test';
import {
  setupTestUserForSync,
  deleteTestUser,
  triggerSync,
  waitForSyncComplete,
  waitForCachedData,
  type TestUser,
} from './helpers/sync-state';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

// Environment configuration
const READWISE_TOKEN = process.env.READWISE_ACCESS_TOKEN;
const READWISE_INTEGRATION_ENABLED = process.env.READWISE_INTEGRATION_TESTS === 'true';
const TEST_PORT = process.env.TEST_PORT || '3099';
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Validation: Ensure token looks valid
const isValidToken =
  !!READWISE_TOKEN &&
  !READWISE_TOKEN.includes('placeholder') &&
  !READWISE_TOKEN.includes('test-token') &&
  READWISE_TOKEN.length > 20;

const shouldRunIntegrationTests = READWISE_INTEGRATION_ENABLED && isValidToken;

// Generate unique test user credentials per run
const TEST_USER_ID = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_EMAIL = `${TEST_USER_ID}@test.local`;
const TEST_PASSWORD = `Test${TEST_USER_ID}!`;

// Store path for reusing authenticated session
const AUTH_STATE_PATH = './test-results/.auth/real-data-user.json';

// Shared test state
let testUser: TestUser | null = null;
let syncCompleted = false;

test.describe('Real Readwise Data Integration', () => {
  // Skip all tests if prerequisites not met
  test.skip(
    !shouldRunIntegrationTests,
    'Skipping: READWISE_INTEGRATION_TESTS not enabled or READWISE_ACCESS_TOKEN missing/invalid'
  );

  // Run tests serially - setup must complete before other tests
  test.describe.configure({ mode: 'serial' });

  // Only run on Mobile Chrome to minimize API usage
  test.beforeEach(async ({}, testInfo) => {
    const isMobileProject = testInfo.project.name.toLowerCase().includes('mobile');
    test.skip(!isMobileProject, 'Runs only on Mobile Chrome to limit API calls');
  });

  test.describe('Setup', () => {
    test('creates test user and triggers sync', async ({ page }) => {
      // Create test user with Readwise token
      console.log(`Creating test user: ${TEST_EMAIL}`);
      const userResult = await setupTestUserForSync({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        readwiseToken: READWISE_TOKEN!,
        remainingBudget: 2, // Allow 2 requests for pagination safety
        completedLocations: ['new', 'feed', 'archive', 'shortlist'],
      });

      if (!userResult.user) {
        throw new Error(`Failed to create test user: ${userResult.error}`);
      }
      testUser = userResult.user;
      console.log(`Test user created: ${testUser.id}`);

      // Trigger sync via API endpoint
      console.log('Triggering Readwise sync...');
      const syncResult = await triggerSync(BASE_URL);
      if (!syncResult.success) {
        throw new Error(`Failed to trigger sync: ${syncResult.error}`);
      }
      console.log('Sync triggered, results:', syncResult.results);

      // Wait for sync to complete
      const completeResult = await waitForSyncComplete(testUser.id, { timeoutMs: 60000 });
      if (!completeResult.completed) {
        throw new Error(`Sync did not complete: ${completeResult.error}`);
      }
      console.log('Sync completed');

      // Wait for cached data to be available
      const cacheResult = await waitForCachedData(testUser.id, {
        timeoutMs: 30000,
        minDocuments: 1,
      });
      if (!cacheResult.success) {
        throw new Error(`Cache not populated: ${cacheResult.error}`);
      }
      console.log(
        `Cache populated: ${cacheResult.documentCount} documents, ${cacheResult.articleCount} articles`
      );
      syncCompleted = true;

      // Login via UI and save auth state for subsequent tests
      await page.goto('/auth/login');
      await page.getByLabel('Email address').fill(TEST_EMAIL);
      await page.locator('#password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Wait for successful login redirect
      await page.waitForURL('/', { timeout: 15000 });
      console.log('Login successful, saving auth state');

      // Save authenticated state for reuse
      await page.context().storageState({ path: AUTH_STATE_PATH });
    });
  });

  test.describe('Library with Cached Data', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!syncCompleted, 'Sync setup did not complete');

      // Restore auth state by loading cookies
      try {
        const fs = await import('fs').then((m) => m.promises);
        const stateData = await fs.readFile(AUTH_STATE_PATH, 'utf-8');
        const state = JSON.parse(stateData);
        if (state.cookies?.length) {
          await page.context().addCookies(state.cookies);
        }
      } catch {
        // Auth state file doesn't exist yet
      }

      await page.goto('/');
      // Hide Next.js dev overlay
      await page.addStyleTag({
        content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
      });
    });

    test('loads and displays documents from cache', async ({ page }) => {
      // Wait for articles to load from cache
      await page.waitForSelector('article', { timeout: 30000 });

      // Check that articles are visible
      const articles = page.locator('article');
      const count = await articles.count();
      expect(count).toBeGreaterThan(0);

      // Verify at least one article has real content
      const firstArticle = articles.first();
      const title = await firstArticle.locator('h3').textContent();
      expect(title).toBeTruthy();
      expect(title!.length).toBeGreaterThan(0);
      console.log(`Library loaded ${count} articles, first title: "${title}"`);
    });

    test('screenshot: library with cached data - dark mode', async ({ page }, testInfo) => {
      await page.waitForSelector('article', { timeout: 30000 });

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `library-cached-${viewport}-dark.png`),
      });
    });

    test('screenshot: library with cached data - light mode', async ({ page }, testInfo) => {
      await page.waitForSelector('article', { timeout: 30000 });

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `library-cached-${viewport}-light.png`),
      });
    });
  });

  test.describe('RSVP with Cached Article', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!syncCompleted, 'Sync setup did not complete');

      // Restore auth state by loading cookies
      try {
        const fs = await import('fs').then((m) => m.promises);
        const stateData = await fs.readFile(AUTH_STATE_PATH, 'utf-8');
        const state = JSON.parse(stateData);
        if (state.cookies?.length) {
          await page.context().addCookies(state.cookies);
        }
      } catch {
        // Auth state file doesn't exist yet
      }

      // Hide Next.js dev overlay
      await page.addStyleTag({
        content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
      });
    });

    test('loads cached article content in RSVP mode', async ({ page }) => {
      // Load library to get a cached document
      await page.goto('/');
      await page.waitForSelector('article', { timeout: 30000 });

      // Click first article to navigate to RSVP
      const firstArticle = page.locator('article').first();
      await firstArticle.click();

      // Wait for RSVP page
      await page.waitForURL(/\/rsvp\?id=/, { timeout: 10000 });

      // Wait for content to load (not loading state)
      await page.waitForFunction(
        () => {
          const heading = document.querySelector('h1');
          return heading && heading.textContent !== 'Loading...';
        },
        { timeout: 30000 }
      );

      // Verify real content
      const title = await page.locator('h1').textContent();
      expect(title).not.toBe('RSVP Demo');
      expect(title).toBeTruthy();
      console.log(`RSVP loaded article: "${title}"`);

      // Verify controls are available
      const wordArea = page.locator('[class*="displayArea"]');
      await expect(wordArea).toBeVisible();
      await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    });

    test('screenshot: rsvp with cached article - dark mode', async ({ page }, testInfo) => {
      await page.goto('/');
      await page.waitForSelector('article', { timeout: 30000 });

      const firstArticle = page.locator('article').first();
      await firstArticle.click();

      await page.waitForURL(/\/rsvp\?id=/);
      await page.waitForFunction(
        () => {
          const heading = document.querySelector('h1');
          return heading && heading.textContent !== 'Loading...';
        },
        { timeout: 30000 }
      );

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `rsvp-cached-${viewport}-dark.png`),
      });
    });

    test('screenshot: rsvp with cached article - light mode', async ({ page }, testInfo) => {
      await page.goto('/');
      await page.waitForSelector('article', { timeout: 30000 });

      const firstArticle = page.locator('article').first();
      await firstArticle.click();

      await page.waitForURL(/\/rsvp\?id=/);
      await page.waitForFunction(
        () => {
          const heading = document.querySelector('h1');
          return heading && heading.textContent !== 'Loading...';
        },
        { timeout: 30000 }
      );

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `rsvp-cached-${viewport}-light.png`),
      });
    });
  });

  test.describe('Cleanup', () => {
    test('deletes test user and cached data', async () => {
      if (!testUser) {
        console.log('No test user to clean up');
        return;
      }

      console.log(`Cleaning up test user: ${testUser.id}`);
      const deleteResult = await deleteTestUser(testUser.id);
      if (!deleteResult.success) {
        console.warn(`Warning: Cleanup failed: ${deleteResult.error}`);
      } else {
        console.log('Test user deleted successfully');
      }
      testUser = null;
    });
  });
});
