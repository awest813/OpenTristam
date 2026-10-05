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

test('missing shareware data points players to Select MPQ', async ({ page }) => {
  await page.route('**/spawn.mpq', (route) => route.fulfill({ status: 404, body: 'Not found' }));
  await page.goto(APP);

  await page.getByRole('button', { name: 'Play Shareware' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('doesn’t host the shareware data');
  await expect(dialog).not.toContainText('Connection problem');
  await page.getByRole('button', { name: 'Back to start' }).click();
  await expect(page.getByRole('button', { name: 'Select MPQ' })).toBeVisible();
});

test('shareware boots into the game and caches its data', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(APP);

  await page.getByRole('button', { name: 'Play Shareware' }).click();
  await expect(page.locator('.App.started')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  // The archive is persisted so the next visit skips the download.
  const cached = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.open('diablo_fs');
        request.onsuccess = () => {
          const query = request.result.transaction('kv').objectStore('kv').getAllKeys();
          query.onsuccess = () => {
            request.result.close();
            resolve(query.result.includes('spawn.mpq'));
          };
        };
      })
  );
  expect(cached).toBe(true);
});

test.describe('lazy screen failure', () => {
  // The service worker would fetch the chunk itself, bypassing page.route.
  test.use({ serviceWorkers: 'block' });

  test('a lazy screen that fails to load does not blank the app', async ({ page }) => {
    await page.goto(APP);
    await seedSave(page);
    await page.reload();
    // Simulate offline or a redeploy that removed the old hashed chunk.
    await page.route('**/SaveManager-*.js', (route) => route.abort());

    await page.getByRole('button', { name: 'Manage Saves' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Couldn’t open this screen');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('button', { name: 'Play Shareware' })).toBeVisible();
  });
});
