import { setTheme, waitForDebounce } from './helpers/theme';
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

    const mockDocuments = getMockDocuments(location || 'new');

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
        summary: 'The latest JavaScript news and updates from around the web.',
        imageUrl: null,
        publishedDate: '2026-01-15',
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: 'feed-2',
        title: 'Morning Tech Digest',
        author: 'Tech News',
        source: 'technews.com',
        siteName: 'Tech News Daily',
        url: 'https://read.readwise.io/feed-2',
        sourceUrl: 'https://technews.com/digest',
        category: 'rss',
        location: 'feed',
        tags: [],
        wordCount: 500,
        readingProgress: 0.5, // This one is "seen"
        summary: 'Daily roundup of tech news.',
        imageUrl: null,
        publishedDate: '2026-01-14',
        createdAt: '2026-01-14T08:00:00Z',
      },
    ];
  }

  if (location === 'later') {
    return [
      {
        id: 'doc-later-1',
        title: 'System Design Interview Prep Guide',
        author: 'Alex Xu',
        source: 'medium.com',
        siteName: 'Medium',
        url: 'https://read.readwise.io/doc-later-1',
        sourceUrl: 'https://medium.com/system-design',
        category: 'article',
        location: 'later',
        tags: ['dev', 'career'],
        wordCount: 5000,
        readingProgress: 0,
        summary: 'Everything you need to know for system design interviews.',
        imageUrl: null,
        publishedDate: '2026-01-10',
        createdAt: '2026-01-12T10:00:00Z',
      },
    ];
  }

  if (location === 'archive') {
    return [
      {
        id: 'doc-archive-1',
        title: 'What Great Managers Do',
        author: 'Marcus Buckingham',
        source: 'hbr.org',
        siteName: 'HBR',
        url: 'https://read.readwise.io/doc-archive-1',
        sourceUrl: 'https://hbr.org/managers',
        category: 'article',
        location: 'archive',
        tags: ['leadership'],
        wordCount: 3000,
        readingProgress: 1,
        summary: 'The best managers discover what is unique about each person.',
        imageUrl: null,
        publishedDate: '2026-01-01',
        createdAt: '2026-01-05T10:00:00Z',
      },
    ];
  }

  // Default: new (inbox) documents
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
      location: 'new',
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
      location: 'new',
      tags: ['css', 'webdev'],
      wordCount: 1600,
      readingProgress: 0,
      summary: 'What new CSS features are coming this year.',
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
      location: 'new',
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
    await page.goto('/library');
    // Wait for the connect prompt to appear (indicates page is loaded)
    await page.waitForSelector('text=Connect Your Reader Account', { timeout: 10000 });
  });

  test('displays the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Library', level: 1 })).toBeVisible();
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
    await page.goto('/library');
    // Wait for articles to load
    await page.waitForSelector('article', { timeout: 10000 });
  });

  test('displays the page title with count', async ({ page }) => {
    // The title should be "Inbox" (default sub-tab) with count
    await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();
  });

  test('shows sub-tabs for Inbox, Later, Archive', async ({ page }) => {
    const tablist = page.getByRole('tablist', { name: 'Filter tabs' });
    await expect(tablist.getByRole('tab', { name: 'Inbox' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Later' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Archive' })).toBeVisible();
  });

  test('Inbox tab is active by default', async ({ page }) => {
    const inboxTab = page.getByRole('tab', { name: 'Inbox' });
    await expect(inboxTab).toHaveAttribute('aria-selected', 'true');
  });

  test('displays article cards', async ({ page }) => {
    const articles = page.locator('article');
    await expect(articles.first()).toBeVisible();

    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('article cards show title and metadata', async ({ page }) => {
    const firstArticle = page.locator('article').first();

    // Check card contains title (h2)
    await expect(firstArticle.locator('h2')).toBeVisible();
  });

  test('switching sub-tabs changes content', async ({ page }) => {
    // Click on Later tab
    await page.getByRole('tab', { name: 'Later' }).click();

    // Wait for content update
    await waitForDebounce(page);

    // Later tab should be active
    await expect(page.getByRole('tab', { name: 'Later' })).toHaveAttribute('aria-selected', 'true');

    // Title should update to "Later"
    await expect(page.getByRole('heading', { name: 'Later', level: 1 })).toBeVisible();
  });

  test('switching to Archive tab shows archived articles', async ({ page }) => {
    // Click on Archive tab
    await page.getByRole('tab', { name: 'Archive' }).click();

    // Wait for content update
    await waitForDebounce(page);

    // Archive tab should be active
    await expect(page.getByRole('tab', { name: 'Archive' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Title should update to "Archive"
    await expect(page.getByRole('heading', { name: 'Archive', level: 1 })).toBeVisible();
  });

  test('articles are keyboard accessible', async ({ page }) => {
    const firstArticle = page.locator('article').first();

    // Focus on first article
    await firstArticle.focus();
    await expect(firstArticle).toBeFocused();

    // Should have appropriate aria-label
    const ariaLabel = await firstArticle.getAttribute('aria-label');
    expect(ariaLabel).toContain('Read');
  });

  test('screenshot: library page - mobile dark', async ({ page }, testInfo) => {
    // Force dark mode
    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `library-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: library page - mobile light', async ({ page }, testInfo) => {
    // Switch to light mode
    await setTheme(page, 'light');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `library-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Feed Page - Connected', () => {
  test.beforeEach(async ({ page }) => {
    await mockReaderConnected(page);
    await page.goto('/feed');
    // Wait for content to load - either articles or empty state
    await page.waitForSelector('article, [class*="emptyState"]', { timeout: 10000 });
  });

  test('displays the page title with count', async ({ page }) => {
    // The title should be "Unseen" (default sub-tab)
    await expect(page.getByRole('heading', { name: 'Unseen', level: 1 })).toBeVisible();
  });

  test('shows sub-tabs for Unseen and Seen', async ({ page }) => {
    const tablist = page.getByRole('tablist', { name: 'Filter tabs' });
    await expect(tablist.getByRole('tab', { name: 'Unseen', exact: true })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Seen', exact: true })).toBeVisible();
  });

  test('Unseen tab is active by default', async ({ page }) => {
    const unseenTab = page.getByRole('tab', { name: 'Unseen', exact: true });
    await expect(unseenTab).toHaveAttribute('aria-selected', 'true');
  });

  test('switching to Seen tab changes content', async ({ page }) => {
    // Click on Seen tab
    await page.getByRole('tab', { name: 'Seen', exact: true }).click();

    // Wait for content update
    await waitForDebounce(page);

    // Seen tab should be active
    await expect(page.getByRole('tab', { name: 'Seen', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Title should update to "Seen"
    await expect(page.getByRole('heading', { name: 'Seen', level: 1 })).toBeVisible();
  });

  test('screenshot: feed page - mobile dark', async ({ page }, testInfo) => {
    // Force dark mode
    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `feed-${viewport}-dark.png`),
      fullPage: true,
    });
  });
});
