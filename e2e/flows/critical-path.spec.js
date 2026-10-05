const { test, expect } = require('@playwright/test');

// The app is served under the Vite base path (see vite.config.js), so pages are
// opened relative to baseURL rather than at the server root.
const APP = './';

async function seedSave(page, name = 'single_0.sv') {
  await page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('diablo_fs');
        request.onupgradeneeded = () =>
          request.result.createObjectStore('kv', { autoIncrement: true });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const tx = request.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(new Uint8Array(64), key);
          tx.oncomplete = () => {
            request.result.close();
            resolve();
          };
        };
      }),
    name
  );
}

test('start screen offers both ways to play', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByRole('button', { name: 'Play Shareware' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select MPQ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Shareware' })).toBeFocused();
});

test('browser storage initializes (no read-only fallback banner)', async ({ page }) => {
  await page.goto(APP);
  await expect(page.locator('.start')).toBeVisible();
  // Give create_fs time to settle; a fallback would show the storage banner.
  await page.waitForTimeout(500);
  await expect(page.locator('.storageBanner')).toHaveCount(0);
});

test('save manager lists saves and closes with Escape', async ({ page }) => {
  await page.goto(APP);
  await seedSave(page);
  await page.reload();

  await page.getByRole('button', { name: 'Manage Saves' }).click();
  await expect(page.locator('.saveList')).toContainText('single_0.sv');
  // Focus must stay inside the dialog so keyboard shortcuts keep working.
  await expect(page.locator('.saveManager')).toContainText('single_0.sv');
  expect(await page.evaluate(() => !!document.activeElement.closest('.saveManager'))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Play Shareware' })).toBeVisible();
});

test('a failed shareware download shows a recoverable connection error', async ({ page }) => {
  await page.route('**/spawn.mpq', (route) => route.fulfill({ status: 503, body: 'Offline' }));
  await page.goto(APP);

  await page.getByRole('button', { name: 'Play Shareware' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Connection problem');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Play Shareware' })).toBeVisible();
});

test('the loading screen reports download progress', async ({ page }) => {
  // Hold the shareware download open so the loading screen stays up.
  await page.route('**/spawn.mpq', () => {});
  await page.goto(APP);

  await page.getByRole('button', { name: 'Play Shareware' }).click();
  await expect(
    page.getByRole('status').filter({ has: page.locator('.loadingText') })
  ).toBeVisible();
});
