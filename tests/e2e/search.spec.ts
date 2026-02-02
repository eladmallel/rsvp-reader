import { setTheme, waitForDebounce } from './helpers/theme';
import { test, expect, type TestInfo } from '@playwright/test';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

const mockSearchResults = [
  {
    id: 'doc-1',
    title: 'AI Agents Guide: Building Autonomous Systems',
    titleHighlight: 'AI <mark>Agents</mark> Guide: Building Autonomous Systems',
    snippet: 'A comprehensive guide to building AI agents with LangChain and modern tools...',
    snippetHighlight:
      'A comprehensive guide to building AI <mark>agents</mark> with LangChain and modern tools...',
    source: 'https://read.readwise.io/doc-1',
    sourceName: 'Medium',
    author: 'John Doe',
    readTime: '8 min',
    tags: ['dev', 'ai'],
    thumbnail: null,
    location: 'later',
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'doc-2',
    title: 'Machine Learning Basics: Introduction to ML Agents',
    titleHighlight: 'Machine Learning Basics: Introduction to ML <mark>Agents</mark>',
    snippet: 'Introduction to machine learning concepts and how agents work in ML systems...',
    snippetHighlight:
      'Introduction to machine learning concepts and how <mark>agents</mark> work in ML systems...',
    source: 'https://read.readwise.io/doc-2',
    sourceName: 'Substack',
    author: 'Jane Smith',
    readTime: '10 min',
    tags: ['ml'],
    thumbnail: 'https://picsum.photos/seed/2/100/100',
    location: 'new',
    createdAt: '2026-01-14T10:00:00Z',
  },
  {
    id: 'doc-3',
    title: 'The Future of Autonomous Agents in Industry',
    titleHighlight: 'The Future of Autonomous <mark>Agents</mark> in Industry',
    snippet: 'How autonomous agents are transforming various industries and workflows...',
    snippetHighlight:
      'How autonomous <mark>agents</mark> are transforming various industries and workflows...',
    source: 'https://read.readwise.io/doc-3',
    sourceName: 'GitHub',
    author: 'Tech Team',
    readTime: '5 min',
    tags: [],
    thumbnail: null,
    location: 'feed',
    createdAt: '2026-01-12T10:00:00Z',
  },
];

// Mock search API
async function mockSearchAPI(page: import('@playwright/test').Page) {
  await page.route('/api/search*', (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const filter = url.searchParams.get('filter') || 'all';

    // No results for specific query
    if (query === 'xyz123nonexistent') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          count: 0,
        }),
      });
      return;
    }

    // Filter results based on location filter
    let filteredResults = mockSearchResults;
    if (filter === 'library') {
      filteredResults = mockSearchResults.filter((r) =>
        ['new', 'later', 'shortlist'].includes(r.location)
      );
    } else if (filter === 'feed') {
      filteredResults = mockSearchResults.filter((r) => r.location === 'feed');
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: filteredResults,
        count: filteredResults.length,
      }),
    });
  });
}

// Mock search API with error
async function mockSearchAPIError(page: import('@playwright/test').Page) {
  await page.route('/api/search*', (route) => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Authentication required',
      }),
    });
  });
}

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockSearchAPI(page);
    await page.goto('/search');
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Search")', { timeout: 10000 });
  });

  test('displays the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Search', level: 1 })).toBeVisible();
  });

  test('shows search input with placeholder', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Articles, highlights, notes...');
  });

  test('displays filter chips', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Feed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Highlights' })).toBeVisible();
  });

  test('All filter is active by default', async ({ page }) => {
    const allChip = page.getByRole('button', { name: 'All' });
    await expect(allChip).toHaveClass(/active/);
  });

  test('shows empty state when no search and no recent searches', async ({ page }) => {
    // Clear localStorage to ensure no recent searches
    await page.evaluate(() => {
      localStorage.removeItem('rsvp-recent-searches');
    });
    await page.reload();
    await page.waitForSelector('h1:has-text("Search")');

    await expect(page.getByText('Search your library')).toBeVisible();
    await expect(page.getByText('Find articles by title, author, or content')).toBeVisible();
  });

  test('shows search results when query is entered', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    // Wait for results to load (debounced)
    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    // Should show results count
    await expect(page.getByText(/\d+ results? for "agents"/)).toBeVisible();

    // Should show result items
    const results = page.locator('article');
    await expect(results.first()).toBeVisible();
    expect(await results.count()).toBe(3);
  });

  test('highlights search terms in results', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    // Check that mark tags exist in the results (highlighted text)
    const marks = page.locator('article mark');
    expect(await marks.count()).toBeGreaterThan(0);
  });

  test('shows no results state when search has no matches', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('xyz123nonexistent');

    await waitForDebounce(page);

    await expect(page.getByText('No results found')).toBeVisible();
    await expect(page.getByText('Try different keywords or check your filters')).toBeVisible();
  });

  test('clear button appears when input has text', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    const clearButton = page.getByRole('button', { name: 'Clear search' });

    // Clear button should not have 'visible' class initially (it's hidden with opacity: 0)
    await expect(clearButton).not.toHaveClass(/visible/);

    // Type in the input
    await searchInput.fill('test');

    // Clear button should have 'visible' class now
    await expect(clearButton).toHaveClass(/visible/);
  });

  test('clear button clears the search', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    // Click clear button
    await page.getByRole('button', { name: 'Clear search' }).click();

    // Input should be empty
    await expect(searchInput).toHaveValue('');

    // Results should be gone
    await expect(page.locator('article')).toHaveCount(0);
  });

  test('filter chips filter results', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    // Click on Feed filter
    await page.getByRole('button', { name: 'Feed' }).click();

    // Feed chip should be active
    await expect(page.getByRole('button', { name: 'Feed' })).toHaveClass(/active/);

    await waitForDebounce(page);

    // Should show fewer results (only feed items)
    const results = page.locator('article');
    expect(await results.count()).toBe(1);
  });

  test('clicking a result navigates to RSVP player', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    // Click on first result
    await page.locator('article').first().click();

    // Should navigate to RSVP page
    await expect(page).toHaveURL(/\/rsvp\?id=doc-1/);
  });

  test('results are keyboard accessible', async ({ page }) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    const firstResult = page.locator('article').first();

    // Focus on first result
    await firstResult.focus();
    await expect(firstResult).toBeFocused();

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/rsvp\?id=doc-1/);
  });

  test('screenshot: search page - empty state', async ({ page }, testInfo) => {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.removeItem('rsvp-recent-searches');
    });
    await page.reload();
    await page.waitForSelector('h1:has-text("Search")');

    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `search-empty-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: search page - with results', async ({ page }, testInfo) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `search-results-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: search page - no results', async ({ page }, testInfo) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('xyz123nonexistent');

    await waitForDebounce(page);
    await page.waitForSelector('text=No results found', { timeout: 5000 });

    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `search-no-results-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: search page - light mode', async ({ page }, testInfo) => {
    const searchInput = page.getByRole('textbox');
    await searchInput.fill('agents');

    await waitForDebounce(page);
    await page.waitForSelector('article', { timeout: 5000 });

    await setTheme(page, 'light');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `search-results-${viewport}-light.png`),
      fullPage: true,
    });
  });
});

test.describe('Search Page - Recent Searches', () => {
  test.beforeEach(async ({ page }) => {
    await mockSearchAPI(page);
    // Set up recent searches in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem(
        'rsvp-recent-searches',
        JSON.stringify(['AI agents', 'React components', 'TypeScript tips'])
      );
    });
    await page.goto('/search');
    await page.waitForSelector('h1:has-text("Search")', { timeout: 10000 });
  });

  test('displays recent searches when available', async ({ page }) => {
    await expect(page.getByText('Recent', { exact: false })).toBeVisible();
    await expect(page.getByText('AI agents')).toBeVisible();
    await expect(page.getByText('React components')).toBeVisible();
    await expect(page.getByText('TypeScript tips')).toBeVisible();
  });

  test('clicking a recent search performs the search', async ({ page }) => {
    await page.getByText('AI agents').click();

    // Input should be filled
    await expect(page.getByRole('textbox')).toHaveValue('AI agents');

    // Should show results
    await page.waitForSelector('article', { timeout: 5000 });
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('can remove a recent search', async ({ page }) => {
    // Find the remove button for 'React components'
    const recentItem = page.locator('text=React components').locator('..');
    await recentItem.getByRole('button', { name: /Remove/i }).click();

    // 'React components' should no longer be visible
    await expect(page.getByText('React components')).not.toBeVisible();

    // Other recent searches should still be there
    await expect(page.getByText('AI agents')).toBeVisible();
  });

  test('can clear all recent searches', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear All' }).click();

    // All recent searches should be gone
    await expect(page.getByText('AI agents')).not.toBeVisible();
    await expect(page.getByText('React components')).not.toBeVisible();
    await expect(page.getByText('TypeScript tips')).not.toBeVisible();

    // Should show empty state
    await expect(page.getByText('Search your library')).toBeVisible();
  });

  test('screenshot: search page - with recent searches', async ({ page }, testInfo) => {
    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `search-recent-${viewport}-dark.png`),
      fullPage: true,
    });
  });
});

test.describe('Search Page - Error Handling', () => {
  test('shows error message when API fails', async ({ page }) => {
    await mockSearchAPIError(page);
    await page.goto('/search');
    await page.waitForSelector('h1:has-text("Search")', { timeout: 10000 });

    const searchInput = page.getByRole('textbox');
    await searchInput.fill('test');

    await waitForDebounce(page);

    await expect(page.getByText('Authentication required')).toBeVisible();
  });
});
