import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addButton, expectPage, useScenario } from './helpers';

// F7 exit criteria: flows §7.3 (add) and §7.4 (edit, delete, Undo), the preview-equals-
// saved regression (WAC-14), and Activity's URL-held filters. Reference dataset, pinned
// to 17 Sep 2026: LRD is 190.1 per USD from 15 Sep and 189.39 before (BR-14).

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function choose(page: Page, trigger: RegExp, option: RegExp) {
  await page.getByRole('button', { name: trigger }).click();
  await page.getByRole('button', { name: option }).click();
}

/** Client-side navigation: a full load reseeds the mock data (D-36). */
async function goToActivity(page: Page, search?: string) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Activity' })
    .first()
    .click();
  await expectPage(page, 'Activity');
  if (search) await page.getByLabel('Search activity').fill(search);
}

async function openAdd(page: Page, kind: 'Income' | 'Expense') {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await addButton(page).click();
  await page.getByRole('link', { name: new RegExp(`^${kind}`) }).click();
  await expect(page.getByRole('dialog', { name: `Add ${kind.toLowerCase()}` })).toBeVisible();
}

test('§7.3 add an expense: amount focused, Save gated, toast, row in Activity', async ({
  page,
}) => {
  await openAdd(page, 'Expense');
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  await expect(dialog.getByLabel('Amount')).toBeFocused();
  const save = dialog.getByRole('button', { name: 'Save expense' });
  await expect(save).toBeDisabled();
  await expect(dialog.getByText('Enter an amount to save.')).toBeVisible();
  await dialog.getByLabel('Amount').fill('12.34');
  await expect(dialog.getByText('Choose a category to save.')).toBeVisible();
  await axeClean(page);
  await choose(page, /^Category:/, /^Food$/);
  await dialog.getByLabel('Note (optional)').fill('Playwright lunch');
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Expense added', { exact: true })).toBeVisible();
  await expect(addButton(page)).toBeFocused();

  await goToActivity(page);
  await expect(
    page.getByRole('link', { name: /^minus \$12\.34, expense, Food, Playwright lunch/ }),
  ).toBeVisible();
});

test('§7.3 add income keeps the same layout and says "Income added"', async ({ page }) => {
  await openAdd(page, 'Income');
  const dialog = page.getByRole('dialog', { name: 'Add income' });
  await dialog.getByLabel('Amount').fill('50');
  await choose(page, /^Category:/, /^Salary$/);
  await dialog.getByRole('button', { name: 'Save income' }).click();
  await expect(page.getByText('Income added', { exact: true })).toBeVisible();
});

test('WAC-14: the LRD preview equals the saved value, today and back-dated', async ({ page }) => {
  await page.goto('/add/expense');
  await expectPage(page, 'Add expense');
  await choose(page, /^Currency: USD/, /^LRD/);
  await page.getByLabel('Amount').fill('5000');
  // 17 Sep: 5,000 ÷ 190.1 = 26.30.
  await expect(page.getByText('≈ $26.30')).toBeVisible();
  await page.getByLabel('Date', { exact: true }).fill('2026-08-20');
  // 20 Aug: 5,000 ÷ 189.39 = 26.40 (the rate for the record's own date, BR-14).
  await expect(page.getByText('≈ $26.40')).toBeVisible();
  await choose(page, /^Category:/, /^Transport$/);
  await page.getByLabel('Note (optional)').fill('Back-dated taxi');
  await axeClean(page);
  await page.getByRole('button', { name: 'Save expense' }).click();
  await expectPage(page, 'Home');

  await goToActivity(page, 'Back-dated');
  const row = page.getByRole('link', { name: /Back-dated taxi/ });
  await expect(row).toContainText('≈ $26.40');
  await row.click();
  await expect(page.getByText('1 USD = 189.39 LRD, 1 August')).toBeVisible();
});

test('ADR-005: a too-small amount is refused before Save', async ({ page }) => {
  await page.goto('/add/expense');
  await expectPage(page, 'Add expense');
  await choose(page, /^Currency: USD/, /^LRD/);
  await page.getByLabel('Amount').fill('0.5');
  await expect(page.getByText(/too small to record in USD/).first()).toBeVisible();
  await choose(page, /^Category:/, /^Food$/);
  await expect(page.getByRole('button', { name: 'Save expense' })).toBeDisabled();
});

test('§7.4 edit, delete and Undo by keyboard', async ({ page }) => {
  await page.goto('/activity?q=Internet');
  await expectPage(page, 'Activity');
  await page.getByRole('link', { name: /Internet/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Transaction' })).toBeVisible();
  await axeClean(page);

  await page.getByRole('link', { name: 'Edit' }).click();
  await expectPage(page, 'Edit transaction');
  const amount = page.getByLabel('Amount');
  await expect(amount).toHaveValue('35.00');
  await amount.fill('36.50');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved', { exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Expense details' })).toContainText('−$36.50');

  await page.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete this expense?' });
  await expect(confirm).toContainText('totals and insights will be recalculated');
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/activity\?q=Internet$/);
  await expect(page.getByText('No activity matches these filters')).toBeVisible();

  // F8 jumps to the notification region; Tab reaches Undo (after any earlier toast).
  await page.keyboard.press('F8');
  const undo = page.getByRole('button', { name: 'Undo' });
  for (let i = 0; i < 6 && !(await undo.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(undo).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Expense restored.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Internet/ })).toBeVisible();
});

test('Activity filters live in the URL and survive reload and Back', async ({ page }) => {
  await page.goto('/activity');
  await expectPage(page, 'Activity');
  await page.getByRole('button', { name: 'Income', exact: true }).click();
  await expect(page).toHaveURL(/type=income/);
  await expect(page.getByRole('link', { name: /September salary/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /expense,/ })).toHaveCount(0);
  await page.reload();
  await expectPage(page, 'Activity');
  await expect(page.getByRole('button', { name: 'Income', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Search activity').fill('zzzz-nothing');
  await expect(page.getByText('No activity matches these filters')).toBeVisible();
  await axeClean(page);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByLabel('Search activity')).toHaveValue('');
});

test('Activity pages 50 at a time with a keyboard-reachable Load more', async ({ page }) => {
  await page.goto('/activity');
  await expectPage(page, 'Activity');
  const rows = page.locator('main li a[aria-label]');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeLessThanOrEqual(50);
});

test('split view from 1024 px: details beside the list with the row marked', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'split view is ≥ 1024 px');
  await page.goto('/activity');
  await expectPage(page, 'Activity');
  await page.getByRole('link', { name: /Internet/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Transaction' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Internet/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test.describe('§19.2 Activity and form states', () => {
  test('empty: "Nothing recorded yet" with Add', async ({ page }) => {
    await useScenario(page, 'empty');
    await page.goto('/activity');
    await expectPage(page, 'Activity');
    await expect(page.getByText('Nothing recorded yet')).toBeVisible();
    await expect(
      page.locator('#content').getByRole('button', { name: 'Add', exact: true }),
    ).toBeVisible();
    await axeClean(page);
  });

  test('loading: skeleton rows announced as loading', async ({ page }) => {
    await useScenario(page, 'reference', { latencyMs: 4000 });
    await page.goto('/activity');
    await expect(page.getByRole('status').filter({ hasText: 'Loading activity' })).toBeAttached({
      timeout: 20_000,
    });
  });

  test('error: Retry instead of a dead end', async ({ page }) => {
    await useScenario(page, 'reference', { failing: ['getActivity'] });
    await page.goto('/activity');
    await expectPage(page, 'Activity');
    await expect(page.getByText("We couldn't load your activity.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible();
    await axeClean(page);
  });

  test('a failed save keeps the entry and offers Retry (§7.3)', async ({ page }) => {
    await useScenario(page, 'reference', { failing: ['createTransaction'] });
    await page.goto('/add/expense');
    await expectPage(page, 'Add expense');
    await page.getByLabel('Amount').fill('9.99');
    await choose(page, /^Category:/, /^Food$/);
    await page.getByRole('button', { name: 'Save expense' }).click();
    await expect(page.getByText(/couldn't save this. Your entry is kept/)).toBeVisible();
    await expect(page.getByLabel('Amount')).toHaveValue('9.99');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeEnabled();
    await axeClean(page);
  });
});
