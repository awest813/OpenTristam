const { test, expect } = require('@playwright/test');

test('start screen visual baseline', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.start')).toHaveScreenshot('start-screen.png');
});

test('loading screen visual baseline', async ({ page }) => {
  await page.goto('./');
  // Hold the shareware download open so the loading screen stays up.
  await page.route('**/spawn.mpq', () => {});
  await page.getByRole('button', { name: 'Play Shareware' }).click();
  await expect(page.locator('.loading')).toHaveScreenshot('loading-screen.png');
});
