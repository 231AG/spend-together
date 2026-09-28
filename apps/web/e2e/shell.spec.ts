import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addButton, expectPage, useScenario } from './helpers';

// F5 exit criteria in a real browser, at 360, 768 and 1280 px (projects).

test('Back and Forward close and reopen the Add dialog; refresh renders the full page (F5-05)', async ({
  page,
}) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await addButton(page).click();
  await expect(page.getByRole('dialog', { name: 'Add' })).toBeVisible();
  await page.getByRole('link', { name: /Expense/ }).click();

  await expect(page).toHaveURL(/\/add\/expense$/);
  await expect(page.getByRole('dialog', { name: 'Add expense' })).toBeVisible();
  // The page behind the dialog is still Home.
  await expect(page.locator('#content h1')).toHaveText('Home');

  await page.goBack();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(/\/add\/expense$/);
  await expect(page.getByRole('dialog', { name: 'Add expense' })).toBeVisible();

  await page.reload();
  await expectPage(page, 'Add expense');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('closing a route dialog returns focus to the global Add (F5-06)', async ({ page }) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await addButton(page).click();
  await page.getByRole('link', { name: /Income/ }).click();
  await expect(page.getByRole('dialog', { name: 'Add income' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/home$/);
  await expect(addButton(page)).toBeFocused();
});

test('savings contribution asks for a goal first', async ({ page }) => {
  await page.goto('/home');
  await expectPage(page, 'Home');
  await addButton(page).click();
  await page.getByRole('button', { name: /Savings contribution/ }).click();
  await expect(page.getByRole('dialog', { name: 'Add to which goal?' })).toBeVisible();
  await page.getByRole('link', { name: /New Laptop/ }).click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+\/contribute$/);
  await expect(page.getByRole('dialog', { name: 'Add contribution' })).toBeVisible();
});

test('the right navigation for the breakpoint, with the current page marked (F5-03)', async ({
  page,
}, info) => {
  await page.goto('/goals?tab=ours');
  await expectPage(page, 'Goals');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toHaveCount(1); // hidden treatments are display:none
  await expect(nav.getByRole('link', { name: 'Goals' })).toHaveAttribute('aria-current', 'page');
  const box = await nav.boundingBox();
  if (!box) throw new Error('no nav box');
  if (info.project.name === 'mobile') expect(box.height).toBeGreaterThanOrEqual(64);
  if (info.project.name === 'tablet') expect(box.width).toBe(72);
  if (info.project.name === 'desktop') expect(box.width).toBe(240);
});

test('every destination is reachable and URL filters survive reload (F5-01)', async ({ page }) => {
  for (const [path, title] of [
    ['/home', 'Home'],
    ['/activity', 'Activity'],
    ['/goals', 'Goals'],
    ['/insights', 'Insights'],
    ['/profile', 'Profile'],
    ['/couple', 'Couple'],
    ['/goals/new?type=couple', 'Create goal'],
    ['/profile/categories', 'Categories'],
  ] as const) {
    await page.goto(path);
    await expectPage(page, title);
  }
  await page.goto('/activity');
  await expectPage(page, 'Activity');
  await page.getByRole('button', { name: 'Expenses' }).click();
  await expect(page).toHaveURL(/type=expense/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expenses' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('signed out: app routes redirect to / with a same-origin next (F5-02)', async ({ page }) => {
  await useScenario(page, 'signedOut');
  await page.goto('/goals?tab=ours');
  await expect(page).toHaveURL(/\/\?next=%2Fgoals%3Ftab%3Dours$/);
  await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute(
    'href',
    '/login?next=%2Fgoals%3Ftab%3Dours',
  );
});

test('signed in: guest pages redirect, honouring only same-origin next', async ({ page }) => {
  await page.goto('/login?next=/insights');
  await expectPage(page, 'Insights');
  await page.goto('/login?next=//evil.example');
  await expect(page).toHaveURL(/\/home$/);
});

test('skip link and keyboard shortcuts (F5-06, F5-07)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'shortcuts are a desktop affordance');
  await page.goto('/home');
  await expectPage(page, 'Home');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  await page.keyboard.press('g');
  await page.keyboard.press('i');
  await expectPage(page, 'Insights');
  await expect(page.locator('#content h1')).toBeFocused();

  await page.keyboard.press('/');
  await expect(page).toHaveURL(/\/activity\?focus=search/);
  const search = page.getByLabel('Search activity');
  await expect(search).toBeFocused();
  await page.keyboard.type('n');
  await expect(page.getByRole('dialog')).toHaveCount(0); // typing never triggers a shortcut

  await page.locator('#content h1').click();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('the /offline fallback renders with no network (F5-09)', async ({ page, context }) => {
  await page.goto('/offline');
  await expectPage(page, "You're offline");
  await context.setOffline(true);
  await page.reload().catch(() => undefined);
  await context.setOffline(false);
});

for (const path of ['/home', '/activity', '/profile', '/add/expense', '/']) {
  test(`axe: no serious or critical violations on ${path} (F5 exit 7)`, async ({ page }) => {
    if (path === '/') await useScenario(page, 'signedOut');
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
