import { test, expect, type TestInfo, type Page } from '@playwright/test';
import { setTheme } from './helpers/theme';

/**
 * Visual Alignment E2E Tests
 *
 * Verifies that all screens match the prototype designs in docs/redesign/prototypes/
 * Tests layout, measurements, navigation visibility, and captures screenshots for review.
 */

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

// Mock user and data for consistent screenshots
const mockUserProfile = {
  id: 'user-visual',
  email: 'visual@example.com',
  name: 'Visual Test',
  initials: 'VT',
  isPro: true,
  readerConnected: true,
};

const mockUserPreferences = {
  defaultWpm: 320,
  skipAmount: 3,
  rsvpFont: 'monospace',
  theme: 'dark',
};

const mockArticles = [
  {
    id: 'visual-1',
    title: 'Understanding React Server Components',
    author: 'Dan Abramov',
    source: 'react.dev',
    siteName: 'React',
    url: 'https://read.readwise.io/visual-1',
    sourceUrl: 'https://react.dev/blog/rsc',
    category: 'article',
    location: 'new',
    tags: ['react', 'javascript'],
    wordCount: 2400,
    readingProgress: 0,
    summary: 'A deep dive into React Server Components and how they work.',
    imageUrl: 'https://picsum.photos/seed/v1/400/200',
    publishedDate: '2026-01-10',
    createdAt: '2026-01-14T10:00:00Z',
  },
  {
    id: 'visual-2',
    title: 'The Future of CSS: What to Expect in 2026',
    author: 'Lea Verou',
    source: 'css-tricks.com',
    siteName: 'CSS-Tricks',
    url: 'https://read.readwise.io/visual-2',
    sourceUrl: 'https://css-tricks.com/future-css-2026',
    category: 'article',
    location: 'new',
    tags: ['css'],
    wordCount: 1600,
    readingProgress: 0.3,
    summary: 'What new CSS features are coming this year.',
    imageUrl: null,
    publishedDate: '2026-01-08',
    createdAt: '2026-01-13T10:00:00Z',
  },
];

async function mockAPIs(page: Page) {
  // Mock user profile
  await page.route('/api/user/profile', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserProfile),
    });
  });

  // Mock user preferences
  await page.route('/api/user/preferences', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserPreferences),
    });
  });

  // Mock Reader connection status
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

  // Mock Reader documents
  await page.route('/api/reader/documents*', (route) => {
    const url = new URL(route.request().url());
    const location = url.searchParams.get('location');

    let documents = mockArticles;
    if (location === 'feed') {
      documents = mockArticles.slice(0, 1);
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        documents,
        nextCursor: null,
        count: documents.length,
      }),
    });
  });

  // Mock Reader tags
  await page.route('/api/reader/tags', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tags: [
          { name: 'react', count: 3 },
          { name: 'javascript', count: 2 },
        ],
      }),
    });
  });

  // Mock search API
  await page.route('/api/search*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: mockArticles,
        count: mockArticles.length,
      }),
    });
  });
}

test.describe('Visual Alignment: Navigation Shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('bottom nav appears on all main screens', async ({ page }) => {
    // Skip home page for now - Phase 7 not complete yet
    const mainRoutes = ['/library', '/feed', '/search', '/settings'];

    for (const route of mainRoutes) {
      await page.goto(route);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Bottom nav should be visible
      const bottomNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(bottomNav).toBeVisible();

      // Verify all 5 nav items exist
      const navItems = bottomNav.locator('a');
      await expect(navItems).toHaveCount(5);

      // Verify nav items are: Home, Library, Feed, Search, Settings
      await expect(navItems.nth(0)).toContainText('Home');
      await expect(navItems.nth(1)).toContainText('Library');
      await expect(navItems.nth(2)).toContainText('Feed');
      await expect(navItems.nth(3)).toContainText('Search');
      await expect(navItems.nth(4)).toContainText('Settings');
    }
  });

  test('bottom nav is hidden on RSVP player', async ({ page }) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');
    await expect(bottomNav).not.toBeVisible();
  });

  test('bottom nav is hidden on auth screens', async ({ page }) => {
    const authRoutes = ['/auth/login', '/auth/signup', '/auth/connect-reader'];

    for (const route of authRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const bottomNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(bottomNav).not.toBeVisible();
    }
  });

  test('bottom nav has correct measurements', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    const bottomNav = page.locator('nav[aria-label="Main navigation"]');

    // Height should be 72px (plus safe area)
    const height = await bottomNav.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.height);
    });
    expect(height).toBeGreaterThanOrEqual(72);

    // Should have border-top
    await expect(bottomNav).toHaveCSS('border-top-width', '1px');

    // Nav items should have correct styling
    const firstNavItem = bottomNav.locator('a').first();
    const fontSize = await firstNavItem.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.fontSize;
    });

    // Font size should be around 0.7rem (roughly 11-12px)
    const fontSizeNum = parseFloat(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(10);
    expect(fontSizeNum).toBeLessThanOrEqual(13);
  });
});

test.describe('Visual Alignment: Page Headers', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('library page header matches prototype', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    // Page title should be h1
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Title should use correct typography
    const titleStyles = await heading.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        letterSpacing: styles.letterSpacing,
      };
    });

    // Should be 2rem (32px)
    expect(parseFloat(titleStyles.fontSize)).toBeGreaterThanOrEqual(30);
    expect(parseFloat(titleStyles.fontSize)).toBeLessThanOrEqual(34);

    // Weight should be 700
    expect(parseInt(titleStyles.fontWeight)).toBeGreaterThanOrEqual(700);
  });

  test('settings page header matches prototype', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    const heading = page.getByRole('heading', { name: 'Settings', level: 1 });
    await expect(heading).toBeVisible();

    // Verify header measurements
    const headerHeight = await heading.evaluate((el) => {
      const header = el.closest('header');
      if (!header) return 0;
      return parseInt(window.getComputedStyle(header).height);
    });

    // Header should be at least 70px (actual implementation is 72px)
    expect(headerHeight).toBeGreaterThanOrEqual(70);
  });
});

test.describe('Visual Alignment: RSVP Player', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('RSVP player is full-screen', async ({ page }) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    // Player should fill viewport - using the correct class name
    const player = page.locator('[class*="container"]').first();
    await expect(player).toBeVisible();

    const dimensions = await player.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      };
    });

    // Should be positioned at top edge
    expect(dimensions.top).toBeLessThanOrEqual(5);

    // On desktop (width >= 900), player is centered with max-width 900px
    // On mobile, player is centered with max-width 560px
    if (dimensions.viewportWidth >= 900) {
      // Desktop: centered, max-width 900px
      expect(dimensions.left).toBeGreaterThanOrEqual(0);
      expect(dimensions.width).toBeLessThanOrEqual(900);
    } else {
      // Mobile: centered, max-width 560px
      expect(dimensions.width).toBeLessThanOrEqual(560);
    }

    // Should fill viewport height
    expect(dimensions.height).toBeGreaterThanOrEqual(dimensions.viewportHeight * 0.95);
  });

  test('RSVP player cockpit has correct height', async ({ page }) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    const cockpit = page.locator('[class*="cockpit"]').first();
    if ((await cockpit.count()) > 0) {
      const height = await cockpit.evaluate((el) => {
        return parseInt(window.getComputedStyle(el).height);
      });

      // Cockpit should be around 200px
      expect(height).toBeGreaterThanOrEqual(180);
      expect(height).toBeLessThanOrEqual(220);
    }
  });
});

test.describe('Visual Alignment: Typography', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('article titles have consistent styling', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    const firstArticleTitle = page.locator('article h2').first();
    await expect(firstArticleTitle).toBeVisible();

    const styles = await firstArticleTitle.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
      };
    });

    // Should be around 1rem (16px)
    expect(parseFloat(styles.fontSize)).toBeGreaterThanOrEqual(15);
    expect(parseFloat(styles.fontSize)).toBeLessThanOrEqual(18);

    // Weight should be 600
    expect(parseInt(styles.fontWeight)).toBeGreaterThanOrEqual(600);
  });

  test('source names have consistent styling', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    // Find source name element using correct class - sourceName from ArticleListItem.module.css
    const sourceName = page.locator('article').first().locator('[class*="sourceName"]').first();

    if ((await sourceName.count()) > 0) {
      const styles = await sourceName.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontSize: computed.fontSize,
          textTransform: computed.textTransform,
        };
      });

      // Should be around 0.7rem (11-12px)
      expect(parseFloat(styles.fontSize)).toBeGreaterThanOrEqual(10);
      expect(parseFloat(styles.fontSize)).toBeLessThanOrEqual(13);

      // Should be uppercase
      expect(styles.textTransform).toBe('uppercase');
    }
  });
});

test.describe('Visual Alignment: Screenshots - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size from prototypes
  });

  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('screenshot: home - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'home-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: home - mobile light', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'home-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: library - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'library-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: library - mobile light', async ({ page }, testInfo) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'library-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: feed - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'feed-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: feed - mobile light', async ({ page }, testInfo) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'feed-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: search - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'search-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: search - mobile light', async ({ page }, testInfo) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'search-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: settings - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'settings-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: settings - mobile light', async ({ page }, testInfo) => {
    await page.goto('/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'settings-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: rsvp-player - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'rsvp-player-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: rsvp-player - mobile light', async ({ page }, testInfo) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'rsvp-player-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-login - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-login-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-login - mobile light', async ({ page }, testInfo) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-login-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-signup - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-signup-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-signup - mobile light', async ({ page }, testInfo) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-signup-mobile-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-connect-reader - mobile dark', async ({ page }, testInfo) => {
    await page.goto('/auth/connect-reader');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-connect-reader-mobile-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-connect-reader - mobile light', async ({ page }, testInfo) => {
    await page.goto('/auth/connect-reader');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-connect-reader-mobile-light.png'),
      fullPage: true,
    });
  });
});

test.describe('Visual Alignment: Screenshots - Desktop', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('screenshot: home - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'home-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: home - desktop light', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'home-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: library - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'library-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: library - desktop light', async ({ page }, testInfo) => {
    await page.goto('/library');
    await page.waitForSelector('article', { timeout: 10000 });

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'library-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: feed - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'feed-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: feed - desktop light', async ({ page }, testInfo) => {
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'feed-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: search - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'search-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: search - desktop light', async ({ page }, testInfo) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'search-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: settings - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'settings-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: settings - desktop light', async ({ page }, testInfo) => {
    await page.goto('/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'settings-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: rsvp-player - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'rsvp-player-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: rsvp-player - desktop light', async ({ page }, testInfo) => {
    await page.goto('/rsvp?demo=true');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'rsvp-player-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-login - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-login-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-login - desktop light', async ({ page }, testInfo) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-login-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-signup - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-signup-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-signup - desktop light', async ({ page }, testInfo) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-signup-desktop-light.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-connect-reader - desktop dark', async ({ page }, testInfo) => {
    await page.goto('/auth/connect-reader');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'dark');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-connect-reader-desktop-dark.png'),
      fullPage: true,
    });
  });

  test('screenshot: auth-connect-reader - desktop light', async ({ page }, testInfo) => {
    await page.goto('/auth/connect-reader');
    await page.waitForLoadState('networkidle');

    await setTheme(page, 'light');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'auth-connect-reader-desktop-light.png'),
      fullPage: true,
    });
  });
});
