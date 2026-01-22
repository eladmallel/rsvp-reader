import { test, expect, type TestInfo } from '@playwright/test';

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  return testInfo.outputPath('screenshots', today, filename);
}

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    // Hide Next.js dev overlay to prevent it from intercepting clicks on mobile
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    });
  });

  test('displays chat interface elements', async ({ page }) => {
    // Header
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();

    // Initial assistant message
    await expect(page.getByRole('list', { name: /chat messages/i })).toBeVisible();

    // Input area
    await expect(page.getByRole('textbox', { name: /message input/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();

    // Suggested prompts (should be visible at start)
    await expect(page.getByText('Suggested questions:')).toBeVisible();
  });

  test('can send a message', async ({ page }) => {
    const input = page.getByRole('textbox', { name: /message input/i });
    const sendButton = page.getByRole('button', { name: /send/i });

    // Type a message
    await input.fill('Tell me about this article');
    await expect(sendButton).toBeEnabled();

    // Send the message
    await sendButton.click();

    // User message should appear
    await expect(page.getByText('Tell me about this article')).toBeVisible();

    // Should see typing indicator or response
    // Wait for response (mock delay is 1-2 seconds)
    await page.waitForTimeout(2500);

    // Suggested prompts should be hidden after first message
    await expect(page.getByText('Suggested questions:')).not.toBeVisible();
  });

  test('suggested prompts send messages when clicked', async ({ page }) => {
    // Click a suggested prompt
    await page.getByRole('button', { name: 'Summarize this article' }).click();

    // User message should appear
    await expect(page.getByText('Summarize this article')).toBeVisible();

    // Wait for response (mock has 1-2s delay) - look for text unique to the response
    await expect(page.getByText(/reduce.*bundle size/i)).toBeVisible({ timeout: 5000 });
  });

  test('back link navigates to home', async ({ page }) => {
    await page.getByRole('link', { name: /back/i }).click();
    // Without authentication, redirects to login page
    // With authentication, would go to home page
    await expect(page).toHaveURL(/\/(auth\/login)?$/);
  });
});

test.describe('Chat Page Screenshots', () => {
  test('mobile dark mode', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'chat-mobile-dark.png'),
      fullPage: false,
    });
  });

  test('mobile light mode', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'chat-mobile-light.png'),
      fullPage: false,
    });
  });

  test('mobile with conversation', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');

    // Send a message using suggested prompt
    await page.getByRole('button', { name: 'What are the key takeaways?' }).click();

    // Wait for response
    await page.waitForTimeout(2500);

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'chat-mobile-dark-conversation.png'),
      fullPage: false,
    });
  });

  test('desktop dark mode', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'chat-desktop-dark.png'),
      fullPage: false,
    });
  });

  test('desktop light mode', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: getScreenshotPath(testInfo, 'chat-desktop-light.png'),
      fullPage: false,
    });
  });
});
