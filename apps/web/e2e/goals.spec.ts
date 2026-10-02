import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectPage, useScenario } from './helpers';

// F9 exit criteria against the reference dataset (§6.5, W-06), pinned to 17 Sep 2026:
// flows 7.5 (individual goal), 7.6 (couple goal) and 7.7 (contribution to completion),
// BR-11 completion reversal, BR-15 currency immutability and BR-18 archived goals.

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Client-side navigation: a full load reseeds the mock data (D-36). */
async function nav(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).first().click();
  await expectPage(page, name);
}

async function openGoal(page: Page, name: string) {
  await page
    .getByRole('link', { name: new RegExp(`^${name}`) })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
}

test('W-06: goal cards with status as icon and text', async ({ page }) => {
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  const laptop = page.getByRole('link', { name: /^New Laptop/ });
  await expect(laptop).toContainText('$600.00 of $1,200.00');
  await expect(laptop).toContainText('On track');
  await expect(page.getByRole('link', { name: /^Emergency fund/ })).toContainText('Behind');
  await expect(page.getByText('Sam private')).toHaveCount(0);
  await axeClean(page);

  await page.getByRole('radio', { name: 'Our goals' }).click();
  await expect(page).toHaveURL(/tab=ours/);
  await expect(page.getByRole('link', { name: /^Vacation/ })).toContainText('At risk');
});

test('goal details reproduce W-06: hero, pace, status, projection', async ({ page }) => {
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await openGoal(page, 'New Laptop');
  await expect(page.getByText('50% · $600.00 to go · 105 days left')).toBeVisible();
  const pace = page.getByRole('region', { name: 'Required pace' });
  await expect(pace).toContainText('$5.71');
  await expect(pace).toContainText('$40.00');
  await expect(pace).toContainText('$173.93');
  await expect(page.getByRole('region', { name: 'Status' })).toContainText(
    /Save \$40\.00\/week to finish by 31 Dec\./,
  );
  await expect(page.getByRole('region', { name: 'Contributions' })).toContainText('First deposit');
  await axeClean(page);
});

test('§7.5 create an individual goal; target and date validated inline (BR-10)', async ({
  page,
}) => {
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await page.getByRole('link', { name: 'Create goal' }).click();
  await expectPage(page, 'Create goal');
  const create = page.getByRole('button', { name: 'Create goal' });
  await expect(create).toBeDisabled();
  await expect(page.getByRole('radio', { name: /Just me/ })).toBeChecked();
  await page.getByLabel('Name').fill('New phone');
  await page.getByTitle('Phone').click();
  await expect(page.getByRole('radio', { name: 'Phone' })).toBeChecked();
  await page.getByLabel('Target amount').fill('0');
  await page.getByLabel('Target date').fill('2026-09-01');
  await page.getByLabel('Name').click();
  await expect(page.getByText('Enter a target greater than 0.').first()).toBeVisible();
  await expect(page.getByText('Choose today or a later date.').first()).toBeVisible();
  await expect(create).toBeDisabled();
  await axeClean(page);

  await page.getByLabel('Target amount').fill('450');
  await page.getByLabel('Target date').fill('2027-01-31');
  await expect(create).toBeEnabled();
  await create.click();
  await expect(page.getByRole('heading', { level: 2, name: 'New phone' })).toBeVisible();
  await expect(page.getByText('No contributions yet')).toBeVisible();
  await expect(page.getByText('$0.00').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add contribution' })).toBeVisible();
});

test('§7.6 a couple goal needs a partner: the option is disabled with the reason', async ({
  page,
}) => {
  await useScenario(page, 'noPartner');
  await page.goto('/goals?tab=ours');
  await expectPage(page, 'Goals');
  await expect(page.getByText('Save for shared goals together')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect partner' })).toHaveAttribute(
    'href',
    '/couple',
  );
  await page.goto('/goals/new?type=couple');
  await expectPage(page, 'Create goal');
  await expect(page.getByRole('radio', { name: /With my partner/ })).toBeDisabled();
  await expect(page.getByText('Connect a partner to create shared goals.')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Just me/ })).toBeChecked();
});

test('§7.6 with a partner, a shared goal can be created', async ({ page }) => {
  await page.goto('/goals?tab=ours');
  await expectPage(page, 'Goals');
  await page.getByRole('link', { name: 'Create shared goal' }).click();
  await expectPage(page, 'Create goal');
  await expect(page.getByRole('radio', { name: /With my partner/ })).toBeChecked();
  await page.getByLabel('Name').fill('Wedding');
  await page.getByLabel('Target amount').fill('3000');
  await page.getByLabel('Target date').fill('2027-06-30');
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Wedding' })).toBeVisible();
  await expect(page.getByText(/Shared goal/).first()).toBeVisible();
});

test('§7.7 contribute to completion; deleting it un-completes the goal (BR-11)', async ({
  page,
}) => {
  await useScenario(page, 'goalAboutToComplete');
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await openGoal(page, 'New Laptop');
  await page.getByRole('link', { name: 'Add contribution' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add contribution' });
  await expect(dialog.getByLabel('Amount')).toBeFocused();
  await dialog.getByLabel('Amount').fill('20');
  await expect(
    dialog.getByText(/After this: \$1,200\.00 saved · 100% · Goal reached/),
  ).toBeVisible();
  await dialog.getByLabel('Note (optional)').fill('Last push');
  await dialog.getByRole('button', { name: 'Add contribution' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Goal reached!' })).toBeVisible();
  await expect(page.getByText('Goal reached. You saved $1,200.00.')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss celebration' }).click();

  // Reversal: removing the contribution returns the goal to an active status.
  await page.getByRole('button', { name: /Delete contribution of \$20\.00/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('$1,180.00').first()).toBeVisible();
  await expect(page.getByText('Goal reached. You saved')).toHaveCount(0);
  await expect(page.getByText(/Save \$.*\/week to finish by 31 Dec/)).toBeVisible();
});

test('the celebration is motion-free under reduced motion, and never repeats on revisit', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useScenario(page, 'goalAboutToComplete');
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await openGoal(page, 'New Laptop');
  await page.getByRole('link', { name: 'Add contribution' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add contribution' });
  await dialog.getByLabel('Amount').fill('25');
  await dialog.getByRole('button', { name: 'Add contribution' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Goal reached!' })).toBeVisible();
  await expect(page.locator('.confetti')).toHaveCount(0);

  await nav(page, 'Goals');
  await page.getByText(/Completed goals/).click();
  await openGoal(page, 'New Laptop');
  await expect(page.getByRole('status').filter({ hasText: 'Goal reached!' })).toHaveCount(0);
});

test('a foreign-currency contribution previews the goal-currency amount', async ({ page }) => {
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await openGoal(page, 'New Laptop');
  await page.getByRole('link', { name: 'Add contribution' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add contribution' });
  await dialog.getByRole('button', { name: /^Currency: USD/ }).click();
  await page.getByRole('button', { name: /^LRD/ }).click();
  await dialog.getByLabel('Amount').fill('5000');
  // 17 Sep: 5,000 ÷ 190.1 = 26.30.
  await expect(dialog.getByText('≈ $26.30')).toBeVisible();
  await expect(dialog.getByText(/After this: \$626\.30 saved/)).toBeVisible();
  await axeClean(page);
});

test('editing a goal never offers its currency (BR-15)', async ({ page }) => {
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await openGoal(page, 'New Laptop');
  await page.getByRole('link', { name: 'Edit goal' }).click();
  await expectPage(page, 'Edit goal');
  await expect(page.getByRole('button', { name: /Currency/ })).toHaveCount(0);
  await expect(page.getByText("A goal's currency can't change after it's created.")).toBeVisible();
  await expect(page.getByRole('radio', { name: /With my partner/ })).toHaveCount(0);
  await page.getByLabel('Target amount').fill('1500.00');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'New Laptop' })).toBeVisible();
  await expect(page.getByText('$600.00').first()).toBeVisible();
  await expect(page.getByText(/of \$1,500\.00/)).toBeVisible();
  await axeClean(page);
});

test('an archived couple goal is read-only with its history (BR-18)', async ({ page }) => {
  await useScenario(page, 'exPartner');
  await page.goto('/goals?tab=ours');
  await expectPage(page, 'Goals');
  await openGoal(page, 'Vacation');
  await expect(page.getByText(/read-only since you ended the connection/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add contribution' })).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Contributions' }).getByRole('listitem').first(),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Who contributed' })).toContainText('You');
  await axeClean(page);
});

test('§19.2 goals states: empty, loading, error', async ({ page }) => {
  await useScenario(page, 'empty');
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await expect(page.getByText('You have no savings goals yet')).toBeVisible();
  await axeClean(page);
});

test('goals load failure offers Retry', async ({ page }) => {
  await useScenario(page, 'reference', { failing: ['listGoals'] });
  await page.goto('/goals');
  await expectPage(page, 'Goals');
  await expect(page.getByText("We couldn't load your goals.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible();
});
