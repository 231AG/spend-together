import { expect, type Page } from '@playwright/test';

// Shared helpers for browser tests. Later phases reuse these focus and scenario helpers
// (F5 plan risk: "focus management regresses as screens are added").

/** Choose a mock dataset before the app boots (read by mocks/persist.ts). */
export async function useScenario(
  page: Page,
  variant: string,
  extra: { offline?: boolean } = {},
): Promise<void> {
  await page.addInitScript(
    ([v, x]) => {
      window.localStorage.setItem(
        'spendtogether.mock-scenario',
        JSON.stringify({ variant: v, recalcMs: 0, ...x }),
      );
    },
    [variant, extra] as const,
  );
}

/** Wait until the page's h1 shows `title` (the app renders after the mock worker starts). */
export async function expectPage(page: Page, title: string | RegExp): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
    timeout: 20_000,
  });
}

/** The one visible global Add control for the current breakpoint. */
export function addButton(page: Page) {
  return page.locator('[data-global-add]:visible').first();
}
