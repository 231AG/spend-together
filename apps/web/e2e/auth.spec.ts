import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectPage, useScenario } from './helpers';

// F6 exit criteria: flows §7.1 (first run) and §7.2 (returning user) end to end against
// the mock API, with axe on every screen and state along the way.

const PASSWORD = 'correct-horse-battery';

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test('§7.1 welcome → onboarding → register → verify → currency → home (WAC-01)', async ({
  page,
}) => {
  const started = performance.now();
  await useScenario(page, 'signedOut');
  await page.goto('/');
  await expectPage(page, /Know what you earn/);
  await axeClean(page);

  await page.getByRole('link', { name: 'Create account' }).click();
  await expectPage(page, /./);
  await expect(page).toHaveURL(/\/onboarding$/);
  await axeClean(page);
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get started' }).click();

  await expectPage(page, 'Create your account');
  // Submitting empty lists every problem in a focused summary.
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert', { name: /Fix 4 problems/ })).toBeFocused();
  await axeClean(page);
  await page.getByLabel('Name').fill('Ada Newcomer');
  await page.getByLabel('Email or phone').fill('ada.new@example.com');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expectPage(page, "Confirm it's you");
  await expect(page.getByLabel('Email or phone')).toHaveValue('ada.new@example.com');
  await axeClean(page);
  await page.getByLabel('Code').fill('000000');
  await page.getByRole('button', { name: 'Confirm' }).click();
  // A wrong code offers a new one rather than an error page.
  await expect(page.getByRole('button', { name: 'Send a new code' })).toBeVisible();
  await axeClean(page);
  await page.getByRole('button', { name: 'Enter a code' }).click();
  await page.getByLabel('Code').fill('123456');
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expectPage(page, 'Choose your currency');
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await axeClean(page);
  await page.getByLabel('Search currencies').fill('LRD');
  await page.getByText('Liberian', { exact: false }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectPage(page, 'Home');
  // WAC-01: the whole path, axe included, well inside 90 s.
  expect(performance.now() - started).toBeLessThan(90_000);
});

test.describe('§7.2 returning user', () => {
  test.beforeEach(async ({ page }) => {
    await useScenario(page, 'signedOut');
  });

  test('logs in and lands on ?next=', async ({ page }) => {
    await page.goto('/login?next=%2Fgoals');
    await expectPage(page, 'Log in');
    await axeClean(page);
    await page.getByLabel('Email or phone').fill('alex.kamara@example.com');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expectPage(page, 'Goals');
  });

  test('unknown account and wrong password read the same; lockout after five', async ({ page }) => {
    await page.goto('/login');
    await expectPage(page, 'Log in');
    const message = page.getByText('Email/phone or password is incorrect.');

    await page.getByLabel('Email or phone').fill('nobody@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-1');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(message).toBeVisible();
    await axeClean(page);

    await page.getByLabel('Email or phone').fill('alex.kamara@example.com');
    // Five failures in the window; the sixth attempt is refused (FR-02).
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: 'Log in' }).click();
      await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
    }
    await expect(page.getByText('Too many attempts. Try again in 15 minutes.')).toBeVisible();
    // Values are kept through every failure.
    await expect(page.getByLabel('Email or phone')).toHaveValue('alex.kamara@example.com');
  });

  test('forgot password confirms identically, then a new password can be set', async ({ page }) => {
    await page.goto('/login');
    await expectPage(page, 'Log in');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expectPage(page, 'Reset your password');
    await axeClean(page);
    await page.getByLabel('Email or phone').fill('nobody@example.com');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText("If an account exists, we've sent instructions.")).toBeVisible();
    await axeClean(page);

    await page.goto('/reset-password?token=reset-token');
    await expectPage(page, 'Choose a new password');
    await axeClean(page);
    await page.getByLabel('New password', { exact: true }).fill('a-brand-new-password');
    await page.getByLabel('Confirm new password', { exact: true }).fill('a-brand-new-password');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText(/signed out on your other devices/)).toBeVisible();
  });
});

test('splash routes a not-onboarded session to currency setup', async ({ page }) => {
  await useScenario(page, 'notOnboarded');
  await page.goto('/home');
  await expectPage(page, 'Choose your currency');
});

test('SCR-01: an unreachable API offers Retry instead of hanging', async ({ page }) => {
  await useScenario(page, 'signedOut', { offline: true });
  await page.goto('/home');
  await expectPage(page, "Can't reach SpendTogether");
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await axeClean(page);
});

test('SCR-02: Welcome fits 320 px without horizontal scroll', async ({ page }) => {
  await useScenario(page, 'signedOut');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expectPage(page, /Know what you earn/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('SCR-03: arrow keys page through onboarding; the seen flag skips it on return', async ({
  page,
}) => {
  await useScenario(page, 'signedOut');
  await page.goto('/onboarding');
  await expectPage(page, 'Track income and expenses');
  await page
    .getByRole('group', { name: 'Pages' })
    .locator('xpath=preceding-sibling::div[1]')
    .focus();
  await page.keyboard.press('ArrowRight');
  await expectPage(page, 'Understand your patterns');
  await page.keyboard.press('ArrowLeft');
  await expectPage(page, 'Track income and expenses');
  await page.getByRole('link', { name: 'Skip' }).click();
  await expectPage(page, 'Create your account');

  await page.goto('/');
  await expectPage(page, /Know what you earn/);
  await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute(
    'href',
    '/register',
  );
  // A direct URL still shows it.
  await page.goto('/onboarding');
  await expectPage(page, 'Track income and expenses');
});

test('§19.2 offline: sign-in is disabled with the offline message, values kept', async ({
  page,
}) => {
  await useScenario(page, 'signedOut');
  await page.goto('/login');
  await expectPage(page, 'Log in');
  await page.getByLabel('Email or phone').fill('alex.kamara@example.com');
  await page.context().setOffline(true);
  await expect(page.getByText("You're offline. Connect to sign in.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeDisabled();
  await axeClean(page);
  await page.context().setOffline(false);
  await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
  await expect(page.getByLabel('Email or phone')).toHaveValue('alex.kamara@example.com');
});
