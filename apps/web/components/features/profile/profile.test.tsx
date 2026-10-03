// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RecalcWatcher } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/ui/toast';
import { setAppClock } from '@/lib/clock';
import { queryKeys } from '@/lib/queries';
import { pendingOfflineEntries, registerOfflineStore, signOut } from '@/lib/session';
import { mockClock } from '@/mocks/clock';
import { applyScenario } from '@/mocks/scenarios';
import { db } from '@/mocks/db';
import { call, failure, id, useMockServer as withMockServer } from '@/mocks/test-utils';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { CategoriesView } from './categories-view';
import { CurrencySettings, impactFacts } from './currency-settings';
import { LogOutButton } from './log-out-button';
import { NotificationSettings } from './notification-settings';
import { ProfileView } from './profile-view';

// F11 against the real mock API (msw/node): archive-not-delete and default immutability
// (FR-23, BR-17), the impact dialog's three facts plus BR-15 (WAC-15), exactly two
// notification switches (FR-26), and logout clearing every store (FR-03, WAC-02).

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/profile',
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

withMockServer();
beforeAll(() => {
  setAppClock(mockClock);
});
afterEach(() => {
  replace.mockReset();
});

function client() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(node: ReactNode, qc = client()) {
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{node}</ToastProvider>
    </QueryClientProvider>
  );
}

async function noSeriousViolations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
}

describe('profile summary (SCR-21, FR-22)', () => {
  it('shows live values inline', async () => {
    const { container } = render(wrap(<ProfileView />));
    expect(await screen.findByRole('heading', { name: 'Alex Kamara' })).toBeTruthy();
    expect(
      await screen.findByRole('link', { name: /Base currency\s*USD · US Dollar/ }),
    ).toBeTruthy();
    expect(await screen.findByRole('link', { name: /Categories\s*\d+ categories/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Notifications\s*Email: on/ })).toBeTruthy();
    expect(await screen.findByRole('link', { name: /Partner\s*Sam · connected/ })).toBeTruthy();
    await noSeriousViolations(container);
  });

  it('renames in place', async () => {
    const user = userEvent.setup();
    render(wrap(<ProfileView />));
    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Alex K.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('heading', { name: 'Alex K.' })).toBeTruthy();
    expect((await call('getMe', {})).name).toBe('Alex K.');
  });
});

describe('categories (SCR-22, FR-23, BR-17)', () => {
  it('defaults are locked: no edit or archive control', async () => {
    const { container } = render(wrap(<CategoriesView />));
    const defaults = await screen.findByRole('region', { name: 'Default categories' });
    expect(within(defaults).getByText('Food')).toBeTruthy();
    expect(within(defaults).getAllByText('Default, locked').length).toBeGreaterThan(0);
    expect(within(defaults).queryAllByRole('button')).toHaveLength(0);
    await noSeriousViolations(container);
  });

  it('adds, rejects a duplicate name, archives (never deletes) and restores', async () => {
    const user = userEvent.setup();
    render(wrap(<CategoriesView />));
    await user.click(await screen.findByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add expense category' });
    await user.type(within(dialog).getByLabelText('Name'), 'food');
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }));
    expect(
      await within(dialog).findByText('You already have a category with that name.'),
    ).toBeTruthy();
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Garden');
    await user.click(within(dialog).getByRole('radio', { name: 'Home' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Teal' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    const pets = (await call('listCategories', { query: { type: 'expense' } })).data.find(
      (c) => c.name === 'Garden',
    );
    expect(pets).toMatchObject({ icon: 'house', color: 'cat-family', is_default: false });

    const mine = await screen.findByRole('region', { name: 'Your categories' });
    await user.click(await within(mine).findByRole('button', { name: 'Archive Garden' }));
    const archived = await screen.findByRole('region', { name: 'Archived' });
    expect(await within(archived).findByText('Garden')).toBeTruthy();

    // Hidden from pickers, still listed for settings: archived, not deleted.
    const pickable = await call('listCategories', { query: { type: 'expense' } });
    expect(pickable.data.map((c) => c.name)).not.toContain('Garden');
    const all = await call('listCategories', { query: { include: 'archived' } });
    expect(all.data.find((c) => c.name === 'Garden')?.archived_at).not.toBeNull();

    await user.click(within(archived).getByRole('button', { name: 'Restore Garden' }));
    expect(await within(mine).findByRole('button', { name: 'Archive Garden' })).toBeTruthy();
  });

  it('a refused restore changes nothing', async () => {
    const pets = id.category('alex-pets');
    await call('patchCategory', { params: { id: pets }, body: { archived: true } });
    await call('createCategory', {
      body: { name: 'Pets', type: 'expense', icon: 'paw-print', color: 'cat-family' },
    });
    const error = await failure(
      call('patchCategory', { params: { id: pets }, body: { archived: false, icon: 'plane' } }),
    );
    expect(error.code).toBe('CONFLICT');
    const all = await call('listCategories', { query: { include: 'archived' } });
    expect(all.data.find((c) => c.id === pets)).toMatchObject({ icon: 'heart-pulse' });
    expect(all.data.find((c) => c.id === pets)?.archived_at).not.toBeNull();
  });

  it('history keeps an archived category', async () => {
    render(wrap(<CategoriesView />));
    const archived = await screen.findByRole('region', { name: 'Archived' });
    expect(within(archived).getByText('Gym')).toBeTruthy();
    const tx = await call('getTransaction', { params: { id: id.tx('alex-jul-gym') } });
    expect(tx.category.name).toBe('Gym');
  });
});

describe('base currency (§11.3, WAC-15)', () => {
  it('the impact dialog states the three facts and that goals keep their currency', async () => {
    const user = userEvent.setup();
    const { container } = render(wrap(<CurrencySettings />));
    await user.click(await screen.findByRole('button', { name: /^New base currency/ }));
    await user.click(await screen.findByRole('button', { name: /^EUR/ }));
    await user.click(screen.getByRole('button', { name: 'Change to EUR' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Change your base currency to EUR?',
    });
    for (const fact of impactFacts('EUR')) expect(within(dialog).getByText(fact)).toBeTruthy();
    expect(within(dialog).getByText(/goals keep their own currencies/)).toBeTruthy();
    expect(impactFacts('EUR')).toEqual([
      'All your totals will be shown in EUR.',
      'Past entries are converted at the rate from their own dates.',
      'Your original amounts are kept.',
    ]);
    await noSeriousViolations(container);

    const goalsBefore = await call('listGoals', { query: { scope: 'all' } });
    await user.click(within(dialog).getByRole('button', { name: 'Change to EUR' }));
    await waitFor(async () => {
      expect((await call('getMe', {})).base_currency).toBe('EUR');
    });
    const goalsAfter = await call('listGoals', { query: { scope: 'all' } });
    expect(goalsAfter.data.map((g) => g.currency)).toEqual(goalsBefore.data.map((g) => g.currency));
    expect(screen.getByRole('link', { name: 'Rates By Exchange Rate API' })).toHaveProperty(
      'href',
      'https://www.exchangerate-api.com/',
    );
  });

  it('cancelling changes nothing', async () => {
    const user = userEvent.setup();
    render(wrap(<CurrencySettings />));
    await user.click(await screen.findByRole('button', { name: /^New base currency/ }));
    await user.click(await screen.findByRole('button', { name: /^EUR/ }));
    await user.click(screen.getByRole('button', { name: 'Change to EUR' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect((await call('getMe', {})).base_currency).toBe('USD');
  });
});

describe('recalculation keeps previous values (§11.3 steps 3–4, F11-04)', () => {
  it('freezes cached figures while recalculating, then refetches them all', async () => {
    applyScenario({ recalculating: true });
    const qc = client();
    qc.setQueryData(queryKeys.home('month'), { previous: true });
    render(wrap(<RecalcWatcher />, qc));
    await waitFor(() => {
      expect(qc.getDefaultOptions().queries?.staleTime).toBe(Infinity);
    });
    expect(qc.getQueryState(queryKeys.home('month'))?.isInvalidated).toBe(false);

    applyScenario({ recalculating: false });
    await qc.refetchQueries({ queryKey: queryKeys.me });
    await waitFor(() => {
      expect(qc.getQueryState(queryKeys.home('month'))?.isInvalidated).toBe(true);
    });
    expect(qc.getDefaultOptions().queries?.staleTime).toBeUndefined();
    expect(qc.getQueryState(queryKeys.me)?.isInvalidated).toBe(false);
  });
});

describe('notifications (FR-26)', () => {
  it('has exactly the two notify_email switches, and saves them', async () => {
    const user = userEvent.setup();
    render(wrap(<NotificationSettings />));
    const boxes = await screen.findAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    const accepted = screen.getByRole('checkbox', {
      name: 'Your partner accepts your invitation',
    });
    expect(screen.getByRole('checkbox', { name: 'A shared goal is completed' })).toBeTruthy();
    expect(accepted).toHaveProperty('checked', true);
    await user.click(accepted);
    await waitFor(async () => {
      expect((await call('getMe', {})).notify_email).toEqual({
        invite_accepted: false,
        goal_completed: true,
      });
    });
    await waitFor(() => {
      expect(accepted).toHaveProperty('checked', false);
    });
  });
});

describe('logout (FR-03, WAC-02)', () => {
  it('clears the session, the query cache and every offline store', async () => {
    const qc = client();
    qc.setQueryData(queryKeys.me, { name: 'cached' });
    const clear = vi.fn();
    const unregister = registerOfflineStore({ pending: () => 0, clear });
    await signOut(qc);
    expect(clear).toHaveBeenCalledOnce();
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
    expect(db.sessionUserId).toBeNull();
    unregister();
  });

  it('a failed logout clears nothing (the session would still be valid)', async () => {
    server.use(
      http.post('*/auth/logout', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'Down', request_id: 'r1' } },
          { status: 500 },
        ),
      ),
    );
    const qc = client();
    qc.setQueryData(queryKeys.me, { name: 'cached' });
    const clear = vi.fn();
    const unregister = registerOfflineStore({ pending: () => 0, clear });
    await expect(signOut(qc)).rejects.toThrow();
    expect(clear).not.toHaveBeenCalled();
    expect(qc.getQueryData(queryKeys.me)).toEqual({ name: 'cached' });
    unregister();
  });

  it('one store failing to clear still clears the others and the cache', async () => {
    const qc = client();
    qc.setQueryData(queryKeys.me, { name: 'cached' });
    const clear = vi.fn();
    const a = registerOfflineStore({
      pending: () => 0,
      clear: () => Promise.reject(new Error('blocked')),
    });
    const b = registerOfflineStore({ pending: () => 0, clear });
    await signOut(qc);
    expect(clear).toHaveBeenCalledOnce();
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
    a();
    b();
  });

  it('warns before discarding unsynced entries, and staying keeps them', async () => {
    const user = userEvent.setup();
    const clear = vi.fn();
    const unregister = registerOfflineStore({ pending: () => 2, clear });
    expect(await pendingOfflineEntries()).toBe(2);
    render(wrap(<LogOutButton />));
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText("2 entries haven't synced. Log out anyway and lose them?"),
    ).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Stay logged in' }));
    expect(clear).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await user.click(await screen.findByRole('button', { name: 'Log out anyway' }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/');
    });
    expect(clear).toHaveBeenCalledOnce();
    unregister();
  });
});
