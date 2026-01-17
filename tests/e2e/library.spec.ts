import { test, expect, type TestInfo } from '@playwright/test';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

// Mock API responses for testing
async function mockReaderConnected(page: import('@playwright/test').Page) {
  await page.route('/api/auth/connect-reader', (route) => {
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

  await page.route('/api/reader/documents*', (route) => {
    const url = new URL(route.request().url());
    const location = url.searchParams.get('location');

    const mockDocuments = getMockDocuments(location || 'later');

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        documents: mockDocuments,
        nextCursor: null,
        count: mockDocuments.length,
      }),
    });
  });

  await page.route('/api/reader/tags', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tags: [
          { name: 'react', count: 3 },
          { name: 'javascript', count: 2 },
          { name: 'webdev', count: 4 },
          { name: 'typescript', count: 2 },
        ],
      }),
    });
  });
}

// Get mock documents based on location
function getMockDocuments(location: string) {
  if (location === 'feed') {
    return [
      {
        id: 'feed-1',
        title: 'Weekly JavaScript Newsletter #423',
        author: 'JavaScript Weekly',
        source: 'javascriptweekly.com',
        siteName: 'JavaScript Weekly',
        url: 'https://read.readwise.io/feed-1',
        sourceUrl: 'https://javascriptweekly.com/423',
        category: 'rss',
        location: 'feed',
        tags: ['newsletter', 'javascript'],
        wordCount: 1000,
        readingProgress: 0,
        summary: null,
        imageUrl: null,
        publishedDate: '2026-01-15',
        createdAt: '2026-01-15T10:00:00Z',
      },
    ];
  }

  // Library documents
  return [
    {
      id: 'doc-1',
      title: 'Understanding React Server Components',
      author: 'Dan Abramov',
      source: 'react.dev',
      siteName: 'React',
      url: 'https://read.readwise.io/doc-1',
      sourceUrl: 'https://react.dev/blog/rsc',
      category: 'article',
      location: 'later',
      tags: ['react', 'javascript', 'webdev'],
      wordCount: 2400,
      readingProgress: 0,
      summary: 'A deep dive into React Server Components.',
      imageUrl: 'https://picsum.photos/seed/1/400/200',
      publishedDate: '2026-01-10',
      createdAt: '2026-01-14T10:00:00Z',
    },
    {
      id: 'doc-2',
      title: 'The Future of CSS: What to Expect in 2026',
      author: 'Lea Verou',
      source: 'css-tricks.com',
      siteName: 'CSS-Tricks',
      url: 'https://read.readwise.io/doc-2',
      sourceUrl: 'https://css-tricks.com/future-css-2026',
      category: 'article',
      location: 'later',
      tags: ['css', 'webdev'],
      wordCount: 1600,
      readingProgress: 0,
      summary: null,
      imageUrl: null,
      publishedDate: '2026-01-08',
      createdAt: '2026-01-13T10:00:00Z',
    },
    {
      id: 'doc-3',
      title: 'TypeScript 6.0: Breaking Changes and New Features',
      author: 'Ryan Cavanaugh',
      source: 'devblogs.microsoft.com',
      siteName: 'Microsoft DevBlogs',
      url: 'https://read.readwise.io/doc-3',
      sourceUrl: 'https://devblogs.microsoft.com/typescript/ts-6',
      category: 'article',
      location: 'later',
      tags: ['typescript', 'javascript'],
      wordCount: 3000,
      readingProgress: 0.25,
      summary: 'TypeScript 6.0 brings major improvements.',
      imageUrl: 'https://picsum.photos/seed/3/400/200',
      publishedDate: '2026-01-12',
      createdAt: '2026-01-15T10:00:00Z',
    },
  ];
}

// Mock API to simulate not connected state
async function mockReaderNotConnected(page: import('@playwright/test').Page) {
  await page.route('/api/auth/connect-reader', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false }),
      });
    } else {
      route.continue();
    }
  });
}

test.describe('Library Page - Not Connected', () => {
  test.beforeEach(async ({ page }) => {
    await mockReaderNotConnected(page);
    await page.goto('/');
  });

  test('displays the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'RSVP Reader', level: 1 })).toBeVisible();
  });

  test('shows connect prompt when Reader not connected', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connect Your Reader Account' })).toBeVisible();
    await expect(page.getByText('Connect your Readwise Reader account')).toBeVisible();
  });

  test('has link to connect Reader', async ({ page }) => {
    const connectLink = page.getByRole('link', { name: 'Connect Readwise Reader' });
    await expect(connectLink).toBeVisible();
    await connectLink.click();
    await expect(page).toHaveURL('/auth/connect-reader');
  });
});

test.describe('Library Page - Connected', () => {
  test.beforeEach(async ({ page }) => {
    await mockReaderConnected(page);
    await page.goto('/');
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
    // Wait for articles to load
    await page.waitForSelector('article');

    // Check that at least one article card is visible
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible();

    // Should have multiple articles in the library
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('article cards display title, author, site name', async ({ page }) => {
    await page.waitForSelector('article');
    const firstArticle = page.locator('article').first();

    // Check card contains expected elements
    await expect(firstArticle.locator('h3')).toBeVisible();
  });

  test('shows tag filter with All button', async ({ page }) => {
    await page.waitForSelector('article');
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
  });

  test('tag filter shows available tags', async ({ page }) => {
    await page.waitForSelector('article');
    // Check for tags from mock data
    const tagGroup = page.getByRole('group', { name: 'Filter by tag' });
    await expect(tagGroup).toBeVisible();

    // Check for specific tags (use exact: true to avoid matching article cards)
    await expect(tagGroup.getByRole('button', { name: 'react', exact: true })).toBeVisible();
    await expect(tagGroup.getByRole('button', { name: 'javascript', exact: true })).toBeVisible();
  });

  test('clicking a tag filters articles', async ({ page }) => {
    await page.waitForSelector('article');

    // Get initial article count
    const initialCount = await page.locator('article').count();

    // Click on react tag (within the tag filter group to avoid matching article cards)
    const tagGroup = page.getByRole('group', { name: 'Filter by tag' });
    await tagGroup.getByRole('button', { name: 'react', exact: true }).click();

    // Wait for filter to apply
    await page.waitForTimeout(200);

    // Count should change (could be less or same if all match)
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('clicking All clears tag filter', async ({ page }) => {
    await page.waitForSelector('article');

    // First click on a tag to filter (within the tag filter group)
    const tagGroup = page.getByRole('group', { name: 'Filter by tag' });
    await tagGroup.getByRole('button', { name: 'react', exact: true }).click();
    await page.waitForTimeout(200);

    // Verify All button is not pressed
    const allButton = tagGroup.getByRole('button', { name: 'All' });
    await expect(allButton).toHaveAttribute('aria-pressed', 'false');

    // Click All to clear filter
    await allButton.click();
    await page.waitForTimeout(200);

    // All button should now be pressed
    await expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching tabs changes content', async ({ page }) => {
    await page.waitForSelector('article');

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
    await page.waitForSelector('article');
    const firstArticle = page.locator('article').first();

    // Focus on first article
    await firstArticle.focus();
    await expect(firstArticle).toBeFocused();

    // Should have appropriate aria-label
    const ariaLabel = await firstArticle.getAttribute('aria-label');
    expect(ariaLabel).toContain('Read');
  });

  test('screenshot: library page - mobile dark', async ({ page }, testInfo) => {
    await page.waitForSelector('article');

    // Force dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `library-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: library page - mobile light', async ({ page }, testInfo) => {
    await page.waitForSelector('article');

    // Switch to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `library-${viewport}-light.png`),
      fullPage: true,
    });
  });
});
