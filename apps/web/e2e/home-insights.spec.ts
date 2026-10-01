import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectPage, useScenario } from './helpers';

// F8 exit criteria against the corrected reference dataset (§6.5, §16.3), pinned to
// 17 Sep 2026. Never the boards' numbers: the hero is $330.00, not $850.

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

const hero = (page: Page) => page.getByRole('region', { name: /(Remaining|Overspent) this month/ });

test('Home reproduces W-01/W-02 for the month (WAC-05)', async ({ page }) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await expect(hero(page)).toContainText('$330.00');
  await expect(hero(page)).toContainText('Net cash flow $630.00 · after $300.00 saved');
  await expect(hero(page)).toContainText('· USD');
  const metrics: [string, string][] = [
    ['Income', '$1,200.00'],
    ['Expenses', '$570.00'],
    ['Saved', '$300.00'],
    ['Savings rate', '25.0%'],
  ];
  for (const [label, value] of metrics) {
    await expect(
      hero(page).getByRole('link', {
        name: new RegExp(`${label}.*${value.replace(/[$.]/g, '\\$&')}`),
      }),
    ).toBeVisible();
  }
  await expect(page.getByText('$850')).toHaveCount(0);

  const spending = page.getByRole('region', { name: 'Where your money went' });
  const rows = spending.getByRole('link', { name: /of spending/ });
  await expect(rows).toHaveText([
    /Bills.*\$150\.00.*26\.3%/,
    /Food.*\$140\.00.*24\.6%/,
    /Other.*\$105\.00.*18\.4%/,
    /Transport.*\$90\.00.*15\.8%/,
    /Shopping.*\$85\.00.*14\.9%/,
  ]);
  await expect(page.getByRole('region', { name: 'Active goals' })).toContainText('New Laptop');
  await axeClean(page);
});

test('a category opens Activity filtered by category and period', async ({ page }) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await page.getByRole('link', { name: /^Bills: .*Show these expenses/ }).click();
  await expectPage(page, 'Activity');
  await expect(page).toHaveURL(/category=[0-9a-f-]+&from=2026-09-01&to=2026-09-30/);
  await expect(page.getByLabel('Category')).toHaveValue(/[0-9a-f-]{36}/);
  await expect(page.getByRole('link', { name: /Internet/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Groceries/ })).toHaveCount(0);
});

test('switching the period refreshes every card and survives reload and Back (FR-10)', async ({
  page,
}) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await page.getByRole('radio', { name: 'Today' }).click();
  await expect(page).toHaveURL(/period=today/);
  await expect(page.getByRole('region', { name: /Remaining today/ })).toBeVisible();
  await page.getByRole('radio', { name: 'This week' }).click();
  await expect(page.getByRole('region', { name: /(Remaining|Overspent) this week/ })).toBeVisible();
  await page.reload();
  await expectPage(page, 'Home');
  await expect(page.getByRole('radio', { name: 'This week' })).toBeChecked();
  // Period changes replace the entry, so Back leaves Home rather than stepping periods.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Goals' })
    .first()
    .click();
  await expectPage(page, 'Goals');
  await page.goBack();
  await expect(page).toHaveURL(/\/home\?period=week$/);
  await expect(page.getByRole('radio', { name: 'This week' })).toBeChecked();
});

test('zero income shows N/A with its reason, never 0% (WAC-06, AC05)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await useScenario(page, 'zeroIncome');
  await page.goto('/home');
  await expectPage(page, 'Home');
  await expect(hero(page)).toContainText('N/A');
  await expect(hero(page)).toContainText('No income recorded this month');
  await expect(hero(page)).toContainText('Overspent this month');
  await expect(hero(page)).not.toContainText(/NaN|Infinity|0\.0%/);
  await page.goto('/insights');
  await expectPage(page, 'Insights');
  await expect(page.getByText('N/A').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('first run offers "Add your first income or expense"', async ({ page }) => {
  await useScenario(page, 'empty');
  await page.goto('/home');
  await expectPage(page, 'Home');
  await expect(
    page.getByRole('button', { name: 'Add your first income or expense' }),
  ).toBeVisible();
  await axeClean(page);
});

test('Insights reproduces W-05: deltas, points vs percent (FR-11, WAC-13)', async ({ page }) => {
  await page.goto('/insights');
  await expectPage(page, 'Insights');
  await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible();
  const cards = page.getByRole('listitem');
  await expect(cards.filter({ hasText: 'Income' }).first()).toContainText('+8.0% vs Aug');
  await expect(cards.filter({ hasText: /^Expenses/ }).first()).toContainText('−4.2% vs Aug');
  await expect(cards.filter({ hasText: /^Saved/ }).first()).toContainText('+20.0% vs Aug');
  await expect(cards.filter({ hasText: 'Savings rate' }).first()).toContainText('+2.5 pts vs Aug');
  await expect(cards.filter({ hasText: 'Average daily spending' }).first()).toContainText('$33.53');
  await axeClean(page);

  // Step back a month and forward again; the latest period cannot step into the future.
  await page.getByRole('button', { name: 'Previous: August 2026' }).click();
  await expect(page.getByRole('heading', { name: 'August 2026' })).toBeVisible();
  await expect(page).toHaveURL(/date=2026-08-01/);
  await page.getByRole('button', { name: 'Next: September 2026' }).click();
  await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Next period/ })).toBeDisabled();
});

test('every chart has a working table; axe clean in both modes (§16.2)', async ({ page }) => {
  await page.goto('/insights');
  await expectPage(page, 'Insights');
  for (const title of ['Spending trend', 'Income vs expenses', 'Where your money went']) {
    await expect(page.getByRole('figure', { name: new RegExp(title) })).toBeVisible();
  }
  await expect(page.locator('figure svg').first()).toBeVisible();
  await axeClean(page);

  const donut = page.getByRole('figure', { name: /Where your money went/ });
  await donut.getByRole('button', { name: 'View as table' }).click();
  const table = donut.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(6);
  await expect(table).toContainText('Bills');
  await expect(table).toContainText('26.3%');

  const bars = page.getByRole('figure', { name: /Income vs expenses/ });
  await bars.getByRole('button', { name: 'View as table' }).click();
  const barRows = bars.getByRole('table').getByRole('row');
  await expect(barRows.filter({ hasText: 'September 2026' })).toContainText('$1,200.00');
  await expect(barRows.filter({ hasText: 'September 2026' })).toContainText('$570.00');

  const trend = page.getByRole('figure', { name: /Spending trend/ });
  await trend.getByRole('button', { name: 'View as table' }).click();
  await expect(trend.getByRole('table')).toContainText('$570.00');
  await axeClean(page);
});

test('Income vs expenses shows Jul / Aug / Sep as in §16 (C-03)', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'checked from 768 px where six buckets show');
  await page.goto('/insights');
  await expectPage(page, 'Insights');
  const bars = page.getByRole('figure', { name: /Income vs expenses/ });
  await bars.getByRole('button', { name: 'View as table' }).click();
  const rows = bars.getByRole('table').getByRole('row');
  await expect(rows.filter({ hasText: 'July 2026' })).toContainText(['$1,100.00']);
  await expect(rows.filter({ hasText: 'July 2026' })).toContainText('$640.00');
  await expect(rows.filter({ hasText: 'August 2026' })).toContainText('$1,111.11');
  await expect(rows.filter({ hasText: 'August 2026' })).toContainText('$595.00');
});

test('chart points are keyboard reachable and focus shows the tooltip (§16.2)', async ({
  page,
}) => {
  await page.goto('/insights');
  await expectPage(page, 'Insights');
  const trend = page.getByRole('figure', { name: /Spending trend/ });
  const surface = trend.locator('svg[tabindex="0"]').first();
  await surface.focus();
  await page.keyboard.press('ArrowRight');
  await expect(trend.getByText(/^Spending$/).last()).toBeVisible();
  await expect(trend.locator('.recharts-tooltip-wrapper')).toContainText('$');
});

test('with little history the trend charts show the minimum-data message', async ({ page }) => {
  await useScenario(page, 'empty');
  await page.goto('/insights');
  await expectPage(page, 'Insights');
  await expect(page.getByText('Your trends appear as you record more activity.')).toHaveCount(2);
  await expect(page.getByText('No spending recorded in this period.')).toBeVisible();
  await axeClean(page);
});

test('adding and deleting an expense moves Home totals without a reload (WAC-03/04)', async ({
  page,
}) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await expect(hero(page)).toContainText('$330.00');

  await page.locator('[data-global-add]:visible').first().click();
  await page.getByRole('link', { name: /^Expense/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  await dialog.getByLabel('Amount').fill('10');
  await page.getByRole('button', { name: /^Category:/ }).click();
  await page.getByRole('button', { name: /^Food$/ }).click();
  await dialog.getByLabel('Note (optional)').fill('Totals check');
  await dialog.getByRole('button', { name: 'Save expense' }).click();

  await expect(hero(page)).toContainText('$320.00');
  await expect(hero(page)).toContainText('$580.00');
  await expect(
    page
      .getByRole('region', { name: 'Where your money went' })
      .getByRole('link', { name: /^Food: \$150\.00/ }),
  ).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Activity' })
    .first()
    .click();
  await expectPage(page, 'Activity');
  await page.getByRole('link', { name: /Totals check/ }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Home' })
    .first()
    .click();
  await expectPage(page, 'Home');
  await expect(hero(page)).toContainText('$330.00');
});
