import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { addButton, expectPage, useScenario } from './helpers';

// F12 exit criteria in the browser, with Playwright's offline switch: installability,
// the service worker's cold offline load and /offline fallback, a create queued offline
// and synced on reconnect exactly once even when its answer is lost three times (WAC-17),
// a refused entry in Needs attention with Edit / Discard, the operations §19.1 disables,
// and the logout warning with an accurate count.

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/**
 * Really offline. `setOffline` makes the page offline (navigator.onLine, its requests),
 * but doesn't reliably reach the service worker's own network requests, so those are
 * aborted too: whatever the worker serves then comes from its caches.
 */
async function goOffline(context: BrowserContext) {
  await context.route('**/*', (route) => route.abort('internetdisconnected'));
  await context.setOffline(true);
}

async function goOnline(context: BrowserContext) {
  await context.unrouteAll({ behavior: 'ignoreErrors' });
  await context.setOffline(false);
}

/** The service worker controls the page (installed, activated, claimed). */
async function workerReady(page: Page) {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null && navigator.serviceWorker.controller !== null;
  });
}

async function addExpenseOffline(page: Page, amount: string, note: string) {
  await addButton(page).click();
  // Offline the form opens in the sheet itself: a route change would need the server.
  await page.getByRole('button', { name: /^Expense/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  await expect(dialog.getByText(/will be saved on this device/)).toBeVisible();
  await dialog.getByLabel('Amount').fill(amount);
  await page.getByRole('button', { name: /^Category:/ }).click();
  await page.getByRole('button', { name: /^Food$/ }).click();
  await dialog.getByLabel('Note (optional)').fill(note);
  await dialog.getByRole('button', { name: 'Save expense' }).click();
  await expect(page.getByText('Saved offline — will sync', { exact: true })).toBeVisible();
}

async function goToActivity(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Activity' })
    .first()
    .click();
  await expectPage(page, 'Activity');
}

test('installable: manifest, icons and standalone display (F12-02)', async ({ page, request }) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = (await (await request.get(href ?? '')).json()) as {
    display: string;
    start_url: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/home' });
  expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual([
    '192x192 any',
    '512x512 any',
    '512x512 maskable',
  ]);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#/);
  await workerReady(page);
});

test('cold offline load: a visited route renders from cache; an unvisited one shows /offline', async ({
  page,
  context,
}) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await workerReady(page);
  // Let the persisted read cache be written (throttled to 1 s).
  await page.waitForTimeout(1_500);

  await goOffline(context);
  await page.reload();
  await expectPage(page, 'Home');
  await expect(page.getByText("You're offline. These are your last saved figures.")).toBeVisible();
  await expect(page.getByRole('button', { name: /^Offline/ })).toBeVisible();

  await page.goto('/activity/00000000-0000-4000-8000-0000000000aa');
  await expect(page.getByRole('heading', { level: 1, name: "You're offline" })).toBeVisible();
  await goOnline(context);
});

test('WAC-17: an expense added offline syncs once, even when its answer is lost 3 times', async ({
  page,
  context,
}) => {
  test.slow();
  await useScenario(page, 'reference', { lostResponses: 3 });
  await page.goto('/home');
  await expectPage(page, 'Home');
  await workerReady(page);

  await goOffline(context);
  await addExpenseOffline(page, '7.25', 'Offline taxi');
  await expect(page.getByRole('button', { name: 'Offline · Sync pending (1)' })).toBeVisible();

  await goToActivity(page);
  const pending = page.getByRole('button', {
    name: /^minus \$7\.25, expense, Food, Offline taxi.*sync pending/,
  });
  await expect(pending).toBeVisible();
  await axeClean(page);

  // Back online: three answers are lost (retried with backoff), the fourth arrives.
  await goOnline(context);
  await expect(page.getByText('1 offline entry synced', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(pending).toHaveCount(0);
  await page.getByLabel('Search activity').fill('Offline taxi');
  await expect(page.getByRole('link', { name: /Offline taxi/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Sync pending/ })).toHaveCount(0);
});

test('a queued entry edited offline is still one record (§19.3 point 3)', async ({
  page,
  context,
}) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await workerReady(page);
  await goOffline(context);
  await addExpenseOffline(page, '3.00', 'Coffee');
  await page.getByRole('button', { name: /Sync pending \(1\)/ }).click();
  const queue = page.getByRole('dialog', { name: 'Waiting to sync' });
  await queue.getByRole('button', { name: 'Edit expense Food' }).click();
  const form = page.getByRole('dialog', { name: 'Edit entry' });
  await form.getByLabel('Amount').fill('3.50');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Entry updated — will sync', { exact: true })).toBeVisible();
  // Back on the list: still one entry, now $3.50.
  await expect(queue.getByText('Sync pending (1)')).toBeVisible();
  await expect(queue.getByText('$3.50')).toBeVisible();
  await queue.getByRole('button', { name: 'Close' }).click();

  await goOnline(context);
  await expect(page.getByText('1 offline entry synced', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await goToActivity(page);
  await page.getByLabel('Search activity').fill('Coffee');
  const rows = page.getByRole('link', { name: /Coffee/ });
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('$3.50');
});

test('a refused contribution lands in Needs attention with the reason; Discard asks first', async ({
  page,
  context,
}) => {
  await useScenario(page, 'reference', { rejecting: ['createContribution'] });
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await page.getByRole('link', { name: /^New Laptop/ }).click();
  await expectPage(page, 'Goal');
  await expect(page.getByRole('heading', { name: 'New Laptop' })).toBeVisible();
  await workerReady(page);

  await goOffline(context);
  // §19.1: goal management is disabled offline, with the reason; contributing isn't.
  await expect(
    page.getByRole('button', { name: /Edit goal\. Connect to the internet/ }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Add contribution' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add contribution to New Laptop' });
  await dialog.getByLabel('Amount').fill('25');
  await dialog.getByRole('button', { name: 'Add contribution' }).click();
  await expect(page.getByText('Saved offline — will sync', { exact: true })).toBeVisible();
  // Recomputed locally: $600 + $25.
  await expect(page.getByText('$625.00', { exact: true })).toBeVisible();
  await expect(page.getByText(/Includes 1 contribution waiting to sync/)).toBeVisible();

  await goOnline(context);
  const chip = page.getByRole('button', { name: 'Needs attention (1)' });
  await expect(chip).toBeVisible({ timeout: 20_000 });
  await chip.click();
  const queue = page.getByRole('dialog', { name: 'Waiting to sync' });
  await expect(
    queue.getByText('This goal was archived, so it no longer takes contributions.'),
  ).toBeVisible();
  await expect(queue.getByRole('button', { name: 'Edit contribution New Laptop' })).toBeVisible();
  await axeClean(page);
  await queue.getByRole('button', { name: 'Discard contribution New Laptop' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Discard this entry?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByText('Entry discarded', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Needs attention/ })).toHaveCount(0);
});

test('offline: synced records and goal creation are disabled with the reason (§19.1)', async ({
  page,
  context,
}) => {
  await page.goto('/activity');
  await expectPage(page, 'Activity');
  await workerReady(page);
  await page
    .getByRole('link', { name: /^minus \$45\.00, expense, Bills/ })
    .first()
    .click();
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
  await goOffline(context);
  await expect(page.getByText('Connect to the internet to do this.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled();

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Goals' })
    .first()
    .click();
  await expectPage(page, 'Goals');
  await expect(
    page.getByRole('button', { name: /^Create goal\. Connect to the internet/ }),
  ).toBeDisabled();
  await goOnline(context);
});

test('logout with an unsynced entry warns with the count, and can be cancelled (§19.3.6)', async ({
  page,
}) => {
  await useScenario(page, 'reference', { rejecting: ['createTransaction'] });
  await page.goto('/home');
  await expectPage(page, 'Home');
  await addButton(page).click();
  await page.getByRole('link', { name: /^Expense/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  await dialog.getByLabel('Amount').fill('1');
  await page.getByRole('button', { name: /^Category:/ }).click();
  await page.getByRole('button', { name: /^Food$/ }).click();
  // Online, the refusal is shown on the form; nothing is queued.
  await dialog.getByRole('button', { name: 'Save expense' }).click();
  await expect(dialog.getByText(/couldn't save this/)).toBeVisible();
  await page.keyboard.press('Escape');

  // Queue one through the offline path, which the server then refuses.
  await goOffline(page.context());
  await addExpenseOffline(page, '2.00', 'Refused later');
  await goOnline(page.context());
  await expect(page.getByRole('button', { name: 'Needs attention (1)' })).toBeVisible({
    timeout: 20_000,
  });

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Profile' })
    .first()
    .click();
  await expectPage(page, 'Profile');
  await page.getByRole('button', { name: 'Log out' }).click();
  const warn = page.getByRole('alertdialog', { name: 'Log out and lose unsynced entries?' });
  await expect(warn).toContainText("1 entry hasn't synced. Log out anyway and lose it?");
  await warn.getByRole('button', { name: 'Stay logged in' }).click();
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('button', { name: 'Log out anyway' }).click();
  await expect(page).toHaveURL(/\/$/);
  // Every offline store is empty: the outbox and the persisted read cache.
  const left = await page.evaluate(async () => {
    const open = indexedDB.open('spendtogether');
    const dbase = await new Promise<IDBDatabase>((resolve) => {
      open.onsuccess = () => {
        resolve(open.result);
      };
    });
    const count = (store: string) =>
      new Promise<number>((resolve) => {
        const req = dbase.transaction(store).objectStore(store).count();
        req.onsuccess = () => {
          resolve(req.result);
        };
      });
    return { outbox: await count('outbox'), kv: await count('kv') };
  });
  expect(left.outbox).toBe(0);
});
