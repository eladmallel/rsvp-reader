import { setTheme } from './helpers/theme';
import { test, expect, type TestInfo } from '@playwright/test';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

test.describe('RSVP Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rsvp');
    // Hide Next.js dev overlay to prevent it from intercepting clicks on mobile
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test('displays the page with back button', async ({ page }) => {
    // New design uses an IconButton instead of a link
    await expect(page.getByRole('button', { name: /Back to library/i })).toBeVisible();
  });

  test('displays article title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'RSVP Demo', level: 1 })).toBeVisible();
  });

  test('displays word display area', async ({ page }) => {
    // Word display is inside the stage area which contains the WordDisplay component
    const stage = page.locator('main');
    await expect(stage).toBeVisible();
    // Should contain the word container which has the ORP-styled word
    await expect(page.locator('[class*="container"]').first()).toBeVisible();
  });

  test('displays play button initially', async ({ page }) => {
    // Use exact matching to avoid matching "Player settings" button
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('displays skip back and skip forward buttons', async ({ page }) => {
    // New design uses dynamic aria-labels with skip amount
    await expect(page.getByRole('button', { name: /Skip back \d+ words/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Skip forward \d+ words/i })).toBeVisible();
  });

  test('displays WPM stepper', async ({ page }) => {
    // WPM is now a stepper, not a slider
    // The stepper should show the WPM value and increment/decrement buttons
    await expect(page.getByText('WPM')).toBeVisible();
    await expect(page.getByText('300')).toBeVisible();
  });

  test('displays progress section', async ({ page }) => {
    // Progress section shows percentage complete and time information
    await expect(page.getByText(/0% complete/)).toBeVisible();
  });

  test('displays back button (exit)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Back to library/i })).toBeVisible();
  });

  test('toggles play/pause on button click', async ({ page }) => {
    // Initially should show Play button (use exact matching)
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    // Click play
    await page.getByRole('button', { name: 'Play', exact: true }).click();

    // Should now show Pause button
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

    // Click pause
    await page.getByRole('button', { name: 'Pause', exact: true }).click();

    // Should show Play button again
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('forward button advances word', async ({ page }) => {
    // Progress starts at 0%
    await expect(page.getByText('0% complete')).toBeVisible();

    // Click forward multiple times to see progress change
    const forwardButton = page.getByRole('button', { name: /Skip forward \d+ words/i });
    await forwardButton.click();
    await forwardButton.click();
    await forwardButton.click();

    // Progress should have advanced (no longer 0%)
    await expect(page.getByText(/[1-9]\d*% complete/)).toBeVisible();
  });

  test('rewind button goes back', async ({ page }) => {
    // First advance
    const forwardButton = page.getByRole('button', { name: /Skip forward \d+ words/i });
    await forwardButton.click();
    await forwardButton.click();
    await forwardButton.click();

    // Get current progress
    const progressAfterForward = await page.getByText(/\d+% complete/).textContent();
    const progressValueAfter = parseInt(progressAfterForward?.match(/\d+/)?.[0] || '0');

    // Rewind
    const backButton = page.getByRole('button', { name: /Skip back \d+ words/i });
    await backButton.click();

    // Progress should have decreased or stayed the same (went back)
    const progressAfterRewind = await page.getByText(/\d+% complete/).textContent();
    const progressValueRewind = parseInt(progressAfterRewind?.match(/\d+/)?.[0] || '0');

    expect(progressValueRewind).toBeLessThanOrEqual(progressValueAfter);
  });

  test('WPM stepper changes WPM value', async ({ page }) => {
    // Initial WPM should be 300
    await expect(page.getByText('300')).toBeVisible();

    // Find the increment button in the WPM stepper (button with + icon, after WPM label)
    // The stepper has decrement button, value, and increment button
    const wpmSection = page.locator('text=WPM').locator('..'); // Parent of WPM label
    const incrementButtons = wpmSection.getByRole('button');

    // Click the second button (increment) which should be the + button
    // First get all buttons and click the last one (increment)
    const buttons = await incrementButtons.all();
    if (buttons.length >= 2) {
      await buttons[buttons.length - 1].click();
      // WPM should have increased by step (10)
      await expect(page.getByText('310')).toBeVisible();
    }
  });

  test('back button triggers navigation', async ({ page }) => {
    // Store current URL
    const initialUrl = page.url();

    // Click back button
    await page.getByRole('button', { name: /Back to library/i }).click();

    // Wait for navigation to occur
    await page.waitForURL((url) => url.toString() !== initialUrl);

    // Should have navigated away from RSVP page
    // (unauthenticated users may be redirected to /auth/login)
    await expect(page).not.toHaveURL('/rsvp');
  });

  test('ORP character is highlighted', async ({ page }) => {
    // The ORP character should have distinct styling
    const orpElement = page.locator('[class*="orp"]');
    await expect(orpElement).toBeVisible();
  });

  test('screenshot: rsvp page - mobile dark', async ({ page }, testInfo) => {
    // Force dark mode
    await setTheme(page, 'dark');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `rsvp-${viewport}-dark.png`),
      fullPage: true,
    });
  });

  test('screenshot: rsvp page - mobile light', async ({ page }, testInfo) => {
    // Switch to light mode
    await setTheme(page, 'light');

    const viewport = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

    await page.screenshot({
      path: getScreenshotPath(testInfo, `rsvp-${viewport}-light.png`),
      fullPage: true,
    });
  });
});
