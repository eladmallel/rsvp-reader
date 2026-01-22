/**
 * E2E Integration Tests with Real Readwise Data
 *
 * These tests use the real Readwise API to fetch actual documents and verify
 * that the UI renders correctly with real data. They are automatically skipped
 * when the READWISE_ACCESS_TOKEN environment variable is not set.
 *
 * Screenshots taken by these tests include real data from the user's Readwise
 * library, providing visual verification of how the app handles production-like
 * content.
 *
 * IMPORTANT: These tests run serially and only on one viewport (Mobile Chrome)
 * to avoid rate limiting from the Readwise API (20 requests/minute).
 *
 * To run locally:
 *   set -a && source .env.local && set +a && npm run test:e2e -- integration-real-data
 *
 * In CI, set READWISE_ACCESS_TOKEN as a GitHub Actions secret.
 */

import { test, expect, type TestInfo } from '@playwright/test';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

// Check if Readwise token is available and valid (not a placeholder)
const READWISE_TOKEN = process.env.READWISE_ACCESS_TOKEN;
const shouldRunIntegrationTests =
  !!READWISE_TOKEN &&
  !READWISE_TOKEN.includes('placeholder') &&
  !READWISE_TOKEN.includes('test-token') &&
  READWISE_TOKEN.length > 20;

// Simple in-memory cache for API responses to reduce rate limiting
const responseCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Fetch with caching and retry logic for rate limiting
 */
async function fetchWithCache(
  url: string,
  options: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const cacheKey = url;
  const cached = responseCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ok: true, status: 200, data: cached.data };
  }

  // Retry logic for rate limiting
  const maxRetries = 3;
  const baseDelay = 3000; // 3 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) {
      const data = await response.json();
      responseCache.set(cacheKey, { data, timestamp: Date.now() });
      return { ok: true, status: response.status, data };
    }

    if (response.status === 429) {
      // Rate limited - wait and retry
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    // Other error - don't retry
    return { ok: false, status: response.status, data: null };
  }

  return { ok: false, status: 429, data: null };
}

// Skip entire test suite if no token
// Run only on Mobile Chrome to reduce API calls (screenshots still named by viewport)
test.describe('Real Readwise Data Integration', () => {
  // Skip all tests if token is not available
  test.skip(!shouldRunIntegrationTests, 'Skipping: READWISE_ACCESS_TOKEN not set');

  // Run tests serially to avoid rate limiting
  test.describe.configure({ mode: 'serial' });

  /**
   * Helper to mock auth as connected and proxy real Readwise API calls
   * This allows us to bypass Supabase authentication while still using
   * the real Readwise API for document fetching.
   */
  async function setupRealReadwiseIntegration(page: import('@playwright/test').Page) {
    // Mock auth to appear as connected
    await page.route('**/api/auth/connect-reader', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: true }),
        });
      } else {
        route.continue();
      }
    });

    // Intercept document list requests and proxy to real Readwise API
    await page.route('**/api/reader/documents?**', async (route) => {
      const url = new URL(route.request().url());
      const location = url.searchParams.get('location') || 'later';
      const category = url.searchParams.get('category');
      const tag = url.searchParams.get('tag');

      try {
        // Build Readwise API URL
        const readwiseUrl = new URL('https://readwise.io/api/v3/list/');
        readwiseUrl.searchParams.set('location', location);
        if (category) readwiseUrl.searchParams.set('category', category);
        if (tag) readwiseUrl.searchParams.set('tag', tag);
        readwiseUrl.searchParams.set('page_size', '20');

        // Fetch from real Readwise API with caching
        const result = await fetchWithCache(readwiseUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Token ${READWISE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!result.ok) {
          throw new Error(`Readwise API error: ${result.status}`);
        }

        const data = result.data as {
          results?: Record<string, unknown>[];
          nextPageCursor?: string;
          count?: number;
        };

        // Transform to our API format
        const documents = (data.results || []).map((doc: Record<string, unknown>) => ({
          id: doc.id,
          title: doc.title || 'Untitled',
          author: doc.author,
          source: doc.source,
          siteName: doc.site_name,
          url: doc.url,
          sourceUrl: doc.source_url,
          category: doc.category,
          location: doc.location,
          tags: doc.tags ? Object.keys(doc.tags as Record<string, unknown>) : [],
          wordCount: doc.word_count,
          readingProgress: doc.reading_progress || 0,
          summary: doc.summary,
          imageUrl: doc.image_url,
          publishedDate: doc.published_date,
          createdAt: doc.created_at,
        }));

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents,
            nextCursor: data.nextPageCursor,
            count: data.count || documents.length,
          }),
        });
      } catch (error) {
        console.error('Error fetching from Readwise:', error);
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to fetch from Readwise' }),
        });
      }
    });

    // Intercept tags requests and aggregate from real documents
    await page.route('**/api/reader/tags', async (route) => {
      try {
        // Fetch documents to aggregate tags
        const readwiseUrl = new URL('https://readwise.io/api/v3/list/');
        readwiseUrl.searchParams.set('location', 'later');
        readwiseUrl.searchParams.set('page_size', '100');

        const result = await fetchWithCache(readwiseUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Token ${READWISE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!result.ok) {
          throw new Error(`Readwise API error: ${result.status}`);
        }

        const data = result.data as { results?: Record<string, unknown>[] };

        // Aggregate tags
        const tagCounts: Record<string, number> = {};
        for (const doc of data.results || []) {
          if (doc.tags && typeof doc.tags === 'object') {
            for (const tag of Object.keys(doc.tags as Record<string, unknown>)) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          }
        }

        // Convert to array and sort by count
        const tags = Object.entries(tagCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tags }),
        });
      } catch (error) {
        console.error('Error fetching tags from Readwise:', error);
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tags: [] }),
        });
      }
    });
  }

  /**
   * Helper to setup document content fetching with real Readwise data
   */
  async function setupRealDocumentFetching(page: import('@playwright/test').Page) {
    await page.route('**/api/reader/documents/*', async (route) => {
      const url = route.request().url();
      const match = url.match(/\/api\/reader\/documents\/([^?]+)/);
      const documentId = match ? match[1] : null;

      if (!documentId) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Document ID required' }),
        });
        return;
      }

      try {
        // Fetch document from Readwise API with content
        const readwiseUrl = new URL('https://readwise.io/api/v3/list/');
        readwiseUrl.searchParams.set('id', documentId);
        readwiseUrl.searchParams.set('html_content', 'true');

        const result = await fetchWithCache(readwiseUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Token ${READWISE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!result.ok) {
          throw new Error(`Readwise API error: ${result.status}`);
        }

        const data = result.data as { results?: Record<string, unknown>[] };

        if (!data.results || data.results.length === 0) {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Document not found' }),
          });
          return;
        }

        const doc = data.results[0];

        // Transform to our API format
        const document = {
          id: doc.id,
          title: doc.title || 'Untitled',
          author: doc.author,
          content: doc.content || '',
          html: doc.html_content || null,
          wordCount: doc.word_count,
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ document }),
        });
      } catch (error) {
        console.error('Error fetching document from Readwise:', error);
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to fetch document' }),
        });
      }
    });
  }

  test.describe('Library with Real Data', () => {
    test.beforeEach(async ({ page }) => {
      await setupRealReadwiseIntegration(page);
      await page.goto('/');
      // Hide Next.js dev overlay
      await page.addStyleTag({
        content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
      });
    });

    test('loads and displays real documents from Readwise', async ({ page }) => {
      // Wait for real articles to load
      await page.waitForSelector('article', { timeout: 30000 });

      // Check that articles are visible
      const articles = page.locator('article');
      const count = await articles.count();
      expect(count).toBeGreaterThan(0);

      // Verify at least one article has real content (title)
      const firstArticle = articles.first();
      const title = await firstArticle.locator('h3').textContent();
      expect(title).toBeTruthy();
      expect(title!.length).toBeGreaterThan(0);
    });

    test('screenshot: library with real data - dark mode', async ({ page }, testInfo) => {
      // Wait for real articles to load
      await page.waitForSelector('article', { timeout: 30000 });

      // Force dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `library-real-data-${viewport}-dark.png`),
      });
    });

    test('screenshot: library with real data - light mode', async ({ page }, testInfo) => {
      // Wait for real articles to load
      await page.waitForSelector('article', { timeout: 30000 });

      // Force light mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `library-real-data-${viewport}-light.png`),
      });
    });
  });

  test.describe('RSVP with Real Article', () => {
    test.beforeEach(async ({ page }) => {
      await setupRealReadwiseIntegration(page);
      await setupRealDocumentFetching(page);
      // Hide Next.js dev overlay
      await page.addStyleTag({
        content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
      });
    });

    test('loads real article content in RSVP mode', async ({ page }) => {
      // First, load the library to get a real document ID
      await page.goto('/');
      await page.waitForSelector('article', { timeout: 30000 });

      // Get the first article and click it to navigate to RSVP page
      const firstArticle = page.locator('article').first();
      await firstArticle.click();

      // Wait for RSVP page to load
      await page.waitForURL(/\/rsvp\?id=/);

      // Wait for the page to load content (no loading state)
      await page.waitForFunction(
        () => {
          const heading = document.querySelector('h1');
          return heading && heading.textContent !== 'Loading...';
        },
        { timeout: 30000 }
      );

      // Verify title is not the demo title
      const title = await page.locator('h1').textContent();
      expect(title).not.toBe('RSVP Demo');
      expect(title).toBeTruthy();

      // Verify word display area is visible
      const wordArea = page.locator('[class*="displayArea"]');
      await expect(wordArea).toBeVisible();

      // Verify play button is available
      await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    });

    test('screenshot: rsvp with real article - dark mode', async ({ page }, testInfo) => {
      // Navigate to library first to get a document ID
      await page.goto('/');
      await page.waitForSelector('article', { timeout: 30000 });

      // Get the first article and click it to navigate to RSVP page
      const firstArticle = page.locator('article').first();
      await firstArticle.click();

      // Wait for RSVP page to load with real content
      await page.waitForURL(/\/rsvp\?id=/);
      await page.waitForFunction(
        () => {
          const heading = document.querySelector('h1');
          return heading && heading.textContent !== 'Loading...';
        },
        { timeout: 30000 }
      );

      // Force dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `rsvp-real-article-${viewport}-dark.png`),
      });
    });

    test('screenshot: rsvp with real article - light mode', async ({ page }, testInfo) => {
      // Navigate to library first to get a document ID
      await page.goto('/');
      await page.waitForSelector('article', { timeout: 30000 });

      // Get the first article and click it to navigate to RSVP page
      const firstArticle = page.locator('article').first();
      await firstArticle.click();

      // Wait for RSVP page to load with real content
      await page.waitForURL(/\/rsvp\?id=/);
      await page.waitForFunction(
        () => {
          const heading = document.querySelector('h1');
          return heading && heading.textContent !== 'Loading...';
        },
        { timeout: 30000 }
      );

      // Force light mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      const viewport = testInfo.project.name.toLowerCase().includes('mobile')
        ? 'mobile'
        : 'desktop';

      await page.screenshot({
        path: getScreenshotPath(testInfo, `rsvp-real-article-${viewport}-light.png`),
      });
    });
  });
});
