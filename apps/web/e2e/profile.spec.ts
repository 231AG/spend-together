import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectPage, useScenario } from './helpers';

// F11 exit criteria: flow 7.10 (USD → EUR with the banner, previous values kept, originals
// preserved, WAC-15), a time-zone change moving "today" (BR-16), archived categories in
// history (FR-23), the two notification switches (FR-26), logout (WAC-02), and the FX
// attribution (§11.1). A full page load reseeds the mock, so after a change every move is
// a client-side navigation (D-36).

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function nav(page: Page, label: string, title: string) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: label })
    .first()
    .click();
  await expectPage(page, title);
}

const hero = (page: Page) => page.getByRole('region', { name: /(Remaining|Overspent) this month/ });

test('§7.10 USD → EUR: impact dialog, banner over previous values, originals kept', async ({
  page,
}) => {
  await useScenario(page, 'reference', { recalcMs: 6000 });
  await page.goto('/home');
  await expectPage(page, 'Home');
  await expect(hero(page)).toContainText('$330.00');

  await nav(page, 'Profile', 'Profile');
  await expect(page.getByRole('link', { name: /Base currency\s*USD · US Dollar/ })).toBeVisible();
  await page.getByRole('link', { name: /Base currency/ }).click();
  await expectPage(page, 'Base currency');
  // §11.1: in Settings → Currency and in the site footer.
  for (const where of [page.getByRole('main'), page.getByRole('contentinfo')]) {
    await expect(where.getByRole('link', { name: 'Rates By Exchange Rate API' })).toHaveAttribute(
      'href',
      'https://www.exchangerate-api.com',
    );
  }
  await axeClean(page);
  await page.getByRole('button', { name: /^New base currency/ }).click();
  await page.getByRole('button', { name: /^EUR/ }).click();
  await page.getByRole('button', { name: 'Change to EUR' }).click();

  const dialog = page.getByRole('alertdialog', { name: 'Change your base currency to EUR?' });
  await expect(dialog).toContainText('All your totals will be shown in EUR.');
  await expect(dialog).toContainText(
    'Past entries are converted at the rate from their own dates.',
  );
  await expect(dialog).toContainText('Your original amounts are kept.');
  await expect(dialog).toContainText("Your goals keep their own currencies. They don't change.");
  // Cancel is focused first (§14.3).
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await axeClean(page);
  await dialog.getByRole('button', { name: 'Change to EUR' }).click();

  const banner = page.getByRole('status').filter({ hasText: 'Updating your totals to EUR…' });
  await expect(banner.first()).toBeVisible();
  await nav(page, 'Home', 'Home');
  // During recalculation the previous figures stay on screen (§11.3 step 3).
  await expect(banner.first()).toBeVisible();
  await expect(hero(page)).toContainText('$330.00');

  // Then everything is re-expressed at once.
  await expect(banner).toHaveCount(0, { timeout: 15_000 });
  await expect(hero(page)).toContainText('· EUR');
  await expect(hero(page)).not.toContainText('$330.00');
  await expect(hero(page)).toContainText('€');

  // WAC-15: the 5,000 LRD original is untouched, with a new ≈ € line.
  await nav(page, 'Activity', 'Activity');
  await page.getByLabel('Search activity').fill('Taxi across');
  const row = page.getByRole('link', { name: /Taxi across Monrovia/ });
  await expect(row).toContainText('5,000.00 LRD');
  await expect(row).toContainText('≈ €');
});

test('BR-16: changing the time zone moves "today"', async ({ page }) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await expect(page.getByText(/Thursday 17/)).toBeVisible();
  await nav(page, 'Profile', 'Profile');
  await page.getByRole('button', { name: /Time zone/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Time zone' });
  // 12:00 UTC on 17 Sep is already 02:00 on 18 Sep at UTC+14.
  await dialog.getByLabel('Time zone').selectOption('Pacific/Kiritimati');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /Time zone\s*Pacific\/Kiritimati/ })).toBeVisible();
  await nav(page, 'Home', 'Home');
  await expect(page.getByText(/Friday 18/)).toBeVisible();
});

test('categories: defaults locked, archived ones stay in history (FR-23)', async ({ page }) => {
  await page.goto('/profile/categories');
  await expectPage(page, 'Categories');
  const defaults = page.getByRole('region', { name: 'Default categories' });
  await expect(defaults.getByText('Food')).toBeVisible();
  await expect(defaults.getByRole('button')).toHaveCount(0);
  const archived = page.getByRole('region', { name: 'Archived' });
  await expect(archived.getByText('Gym')).toBeVisible();
  await axeClean(page);

  await page.getByRole('button', { name: 'Archive Pets' }).click();
  await expect(archived.getByText('Pets')).toBeVisible();
  await page.getByRole('radio', { name: 'Income' }).click();
  await expect(defaults.getByText('Salary')).toBeVisible();

  // History still names the archived category.
  await nav(page, 'Activity', 'Activity');
  await page.getByLabel('Search activity').fill('Gym membership');
  await expect(page.getByRole('link', { name: /Gym membership/ })).toContainText('Gym');
});

test('notifications: exactly the two switches (FR-26)', async ({ page }) => {
  await page.goto('/profile/notifications');
  await expectPage(page, 'Notifications');
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  const accepted = page.getByRole('checkbox', { name: 'Your partner accepts your invitation' });
  await expect(accepted).toBeChecked();
  await accepted.click();
  await expect(accepted).not.toBeChecked();
  await axeClean(page);
  await page.getByRole('link', { name: 'Profile' }).first().click();
  await expectPage(page, 'Profile');
  await expect(page.getByRole('link', { name: /Notifications\s*Email: on/ })).toBeVisible();
});

test('profile reproduces W-09 and logout clears the session (WAC-02)', async ({ page }) => {
  await page.goto('/profile');
  await expectPage(page, 'Profile');
  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Couple' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Security & account' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Partner\s*Sam · connected/ })).toBeVisible();
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Rates By Exchange Rate API' }),
  ).toBeVisible();
  await axeClean(page);
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible({ timeout: 20_000 });
});

test('security: change password sends a link to your own email', async ({ page }) => {
  await page.goto('/profile/security');
  await expectPage(page, 'Security');
  await page.getByRole('button', { name: 'Send password link' }).click();
  await expect(page.getByText('Sent to alex.kamara@example.com.', { exact: false })).toBeVisible();
  await axeClean(page);
});
