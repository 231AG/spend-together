import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectPage, useScenario } from './helpers';

// F10: flows 7.8 (invite → accept) and 7.9 (end couple), the landing page's states, and
// the privacy promise. The mock keeps each browser's data in memory, so the two people
// are two browser contexts, each seeded with its side of the same story (D-83): Alex
// without a partner, and Sam holding Alex's pending invitation.

async function axeClean(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

const PRIVACY =
  'Your partner sees shared goals only. Your income, expenses and personal goals always stay private.';

test('§7.8 Alex invites, Sam accepts — two browser contexts', async ({ browser }) => {
  const alexContext = await browser.newContext();
  const alex = await alexContext.newPage();
  await useScenario(alex, 'noPartner');
  await alex.goto('/couple');
  await expectPage(alex, 'Couple');
  // The promise is on screen before anyone is invited (F10-01).
  await expect(alex.getByText(PRIVACY)).toBeVisible();
  await axeClean(alex);
  await alex.getByLabel("Partner's email or phone").fill('alex.kamara@example.com');
  await alex.getByRole('button', { name: 'Send invitation' }).click();
  await expect(alex.getByText("You can't invite yourself.")).toBeVisible();
  await alex.getByLabel("Partner's email or phone").fill('sam.tweh@example.com');
  await alex.getByRole('button', { name: 'Send invitation' }).click();
  await expect(alex.getByText('Invitation pending')).toBeVisible();
  await expect(alex.getByText('sam.tweh@example.com')).toBeVisible();
  await expect(
    alex.getByText('Shared goals appear here after your partner accepts.'),
  ).toBeVisible();
  await axeClean(alex);

  const samContext = await browser.newContext();
  const sam = await samContext.newPage();
  await useScenario(sam, 'invitedPartner');
  await sam.goto('/invite/invite-pending');
  await expectPage(sam, 'Alex invited you to save together on SpendTogether');
  await expect(sam.getByText(/not your income, expenses or personal goals/)).toBeVisible();
  // First name only.
  await expect(sam.getByText('Kamara')).toHaveCount(0);
  await axeClean(sam);
  await sam.getByRole('button', { name: 'Accept' }).click();
  await expectPage(sam, 'Goals');
  await expect(sam).toHaveURL(/tab=ours/);
  await expect(sam.getByRole('radio', { name: 'Our goals' })).toBeChecked();

  await alexContext.close();
  await samContext.close();
});

test('Resend keeps one invitation; Cancel invalidates it at once', async ({ page }) => {
  await useScenario(page, 'pendingInvite');
  await page.goto('/couple');
  await expectPage(page, 'Couple');
  await page.getByRole('button', { name: 'Resend' }).click();
  await expect(page.getByText('Invitation sent again', { exact: true })).toBeVisible();
  await expect(page.getByText('Invitation pending')).toHaveCount(1);
  await page.getByRole('button', { name: 'Cancel invitation' }).click();
  await expect(
    page.getByText('Invitation cancelled. The link no longer works.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send invitation' })).toBeVisible();
});

test('the inviter sees "Declined", and can resend an expired invitation (ADR-014)', async ({
  page,
}) => {
  await useScenario(page, 'inviteDeclined');
  await page.goto('/couple');
  await expectPage(page, 'Couple');
  await expect(page.getByRole('heading', { name: 'Declined' })).toBeVisible();
  await axeClean(page);

  await useScenario(page, 'inviteExpired');
  await page.goto('/couple');
  await expectPage(page, 'Couple');
  await expect(page.getByRole('heading', { name: 'Invitation expired' })).toBeVisible();
  await page.getByRole('button', { name: 'Resend invitation' }).click();
  await expect(page.getByText('Invitation pending')).toBeVisible();
});

test('landing: signed out → Create account / Log in carrying the way back', async ({ page }) => {
  await useScenario(page, 'invitedSignedOut');
  await page.goto('/invite/invite-pending');
  await expectPage(page, /Alex invited you/);
  await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute(
    'href',
    '/register?next=%2Finvite%2Finvite-pending',
  );
  await page.getByRole('link', { name: 'Log in' }).click();
  await expectPage(page, 'Log in');
  await page.getByLabel('Email or phone').fill('sam.tweh@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expectPage(page, /Alex invited you/);
});

test('landing: invalid, already coupled, and declined', async ({ page }) => {
  await useScenario(page, 'invitedPartner');
  await page.goto('/invite/not-a-real-token');
  await expectPage(page, "This invitation link isn't valid");
  await axeClean(page);

  await useScenario(page, 'invitedWhileCoupled');
  await page.goto('/invite/invite-jordan');
  await expectPage(page, /Jordan invited you/);
  await expect(page.getByText(/can't accept right now: you're already connected/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await useScenario(page, 'invitedPartner');
  await page.goto('/invite/invite-pending');
  await expectPage(page, /Alex invited you/);
  await page.getByRole('button', { name: 'Decline' }).click();
  await expectPage(page, 'Invitation declined');
});

test('§7.9 end the connection: consequences, typed name, read-only shared goals', async ({
  page,
}) => {
  await page.goto('/couple');
  await expectPage(page, 'Couple');
  await expect(page.getByRole('heading', { name: 'You & Sam' })).toBeVisible();
  await expect(page.getByRole('region', { name: /Our goals/ })).toContainText('Vacation');
  await axeClean(page);

  await page.getByRole('button', { name: 'End connection' }).click();
  const dialog = page.getByRole('dialog', { name: 'End your connection with Sam?' });
  await expect(dialog).toContainText('read-only for both of you');
  const confirm = dialog.getByRole('button', { name: 'End connection' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type Sam to confirm').fill('Alex');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type Sam to confirm').fill(' sam ');
  await expect(confirm).toBeEnabled();
  await axeClean(page);
  await confirm.click();

  await expect(page.getByRole('heading', { name: 'Connection ended' })).toBeVisible();
  await page.getByRole('link', { name: 'See shared goals' }).click();
  await expectPage(page, 'Goals');
  await page.getByRole('link', { name: /^Vacation/ }).click();
  await expect(page.getByText(/read-only since you ended the connection/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add contribution' })).toHaveCount(0);
});

test('offline: couple management is disabled with the reason', async ({ page }) => {
  await page.goto('/couple');
  await expectPage(page, 'Couple');
  await page.context().setOffline(true);
  await expect(page.getByText('Connect to the internet to do this.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'End connection' })).toHaveCount(0);
  await page.context().setOffline(false);
});

test('couple load failure offers Retry', async ({ page }) => {
  await useScenario(page, 'reference', { failing: ['getCouple'] });
  await page.goto('/couple');
  await expectPage(page, 'Couple');
  await expect(page.getByText("We couldn't load your connection.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible();
});

test('opening your own invitation link offers no Accept or Decline', async ({ page }) => {
  await useScenario(page, 'pendingInvite');
  await page.goto('/invite/invite-pending');
  await expectPage(page, /Alex invited you/);
  await expect(page.getByText('This is the invitation you sent.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Decline' })).toHaveCount(0);
});

test('a not-yet-onboarded sign-in keeps where it was going through currency setup', async ({
  page,
}) => {
  await useScenario(page, 'notOnboarded');
  await page.goto('/goals');
  await expectPage(page, 'Choose your currency');
  await expect(page).toHaveURL(/\/setup\/currency\?next=%2Fgoals$/);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectPage(page, 'Goals');
});
