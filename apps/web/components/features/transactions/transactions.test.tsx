// @vitest-environment jsdom
import type { ActivityItem } from '@spendtogether/schemas';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { ApiError, apiClient } from '@/lib/api-client';
import { ToastProvider } from '@/components/ui/toast';
import { AddSheetProvider } from '../add-sheet';
import { ActivityView } from '../activity/activity-view';
import { TransactionForm } from './transaction-form';
import {
  activityKey,
  useCreateTransaction,
  useDeleteTransaction,
  type ActivityPage,
} from './use-transaction-mutations';

// F7: Save gating, currency switching, the ADR-005 message, optimistic create/delete
// with exact rollback (§7.3), and 50-per-page loading with a Load more button (FR-09).

let search = new URLSearchParams();
const replace = vi.fn((url: string) => {
  search = new URLSearchParams(url.split('?')[1] ?? '');
});
vi.mock('next/navigation', () => ({
  usePathname: () => '/activity',
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  useSearchParams: () => search,
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const money = (amount_minor: number, currency = 'USD') => ({
  amount_minor,
  currency,
  formatted: `$${String(amount_minor)}`,
});

function item(n: number, date: string): ActivityItem {
  return {
    kind: 'transaction',
    id: uuid(n),
    type: 'expense',
    date,
    amount: money(100 + n),
    base_amount: money(100 + n),
    fx: { rate: '1', rate_date: date, estimated: false },
    category: { id: uuid(900), name: 'Food', icon: 'utensils', color: 'cat-food' },
    transaction_date: date,
    note: `Item ${String(n)}`,
    created_at: `${date}T12:00:00.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
  };
}

const ME = {
  id: uuid(1),
  name: 'Alex',
  email: 'alex@example.com',
  phone: null,
  base_currency: 'USD',
  timezone: 'Africa/Monrovia',
  notify_email: { invite_accepted: true, goal_completed: true },
  onboarded_at: '2026-06-01T00:00:00.000Z',
  recalculating: false,
};
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', exponent: 2, is_active: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exponent: 0, is_active: true },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', exponent: 2, is_active: true },
];
const CATEGORIES = [
  {
    id: uuid(900),
    name: 'Food',
    type: 'expense',
    icon: 'utensils',
    color: 'cat-food',
    is_default: true,
    archived_at: null,
  },
];

let call: MockInstance<
  (endpoint: { path: string; method: string }, input: unknown) => Promise<unknown>
>;

function answer(endpoint: { path: string; method: string }, input: unknown): Promise<unknown> {
  const key = `${endpoint.method} ${endpoint.path}`;
  switch (key) {
    case 'GET /me':
      return Promise.resolve(ME);
    case 'GET /currencies':
      return Promise.resolve({ data: CURRENCIES });
    case 'GET /categories':
      return Promise.resolve({ data: CATEGORIES });
    case 'GET /transactions':
      return Promise.resolve({ data: [], next_cursor: null });
    case 'GET /exchange-rates':
      return Promise.resolve({
        base: 'USD',
        rate_date: '2026-09-15',
        estimated: false,
        rates: { USD: '1', LRD: '190.1', JPY: '148.2' },
        fetched_at: '2026-09-15T00:05:00.000Z',
      });
    case 'GET /activity': {
      const cursor = (input as { query: { cursor?: string } }).query.cursor;
      const start = cursor ? Number(cursor) : 0;
      const data = Array.from({ length: start === 0 ? 50 : 10 }, (_, i) =>
        item(start + i + 1, '2026-09-10'),
      );
      return Promise.resolve({ data, next_cursor: start === 0 ? '50' : null });
    }
    default:
      return Promise.reject(new Error(`unexpected ${key}`));
  }
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>
          <AddSheetProvider>{children}</AddSheetProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
  };
}

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

beforeEach(() => {
  search = new URLSearchParams();
  replace.mockClear();
  call = vi.spyOn(apiClient, 'call') as unknown as typeof call;
  call.mockImplementation(answer);
  class IO {
    observe = () => undefined;
    disconnect = () => undefined;
  }
  vi.stubGlobal('IntersectionObserver', IO);
});
afterEach(() => {
  call.mockRestore();
  vi.unstubAllGlobals();
});

describe('TransactionForm (FR-06, FR-07, FR-24)', () => {
  it('keeps Save disabled until an amount and a category are chosen, and says why', async () => {
    const user = userEvent.setup();
    const Wrapper = wrap(newClient());
    render(
      <Wrapper>
        <TransactionForm type="expense" onSaved={vi.fn()} />
      </Wrapper>,
    );
    const save = await screen.findByRole('button', { name: 'Save expense' });
    expect(save).toHaveProperty('disabled', true);
    expect(screen.getByText('Enter an amount to save.')).toBeTruthy();
    const amount = screen.getByLabelText('Amount');
    expect(document.activeElement).toBe(amount);
    await user.type(amount, '12.50');
    expect(screen.getByText('Choose a category to save.')).toBeTruthy();
    expect(save).toHaveProperty('disabled', true);
  });

  it('re-reads the digits when the currency changes (12.50 is not a JPY amount)', async () => {
    const user = userEvent.setup();
    const Wrapper = wrap(newClient());
    render(
      <Wrapper>
        <TransactionForm type="expense" onSaved={vi.fn()} />
      </Wrapper>,
    );
    await user.type(await screen.findByLabelText('Amount'), '12.50');
    await user.click(screen.getByRole('button', { name: /^Currency: USD/ }));
    await user.click(screen.getByRole('button', { name: /^JPY/ }));
    expect(screen.getByText('JPY has no decimal places.')).toBeTruthy();
  });

  it('shows the ADR-005 message before Save for a too-small conversion', async () => {
    const user = userEvent.setup();
    const Wrapper = wrap(newClient());
    render(
      <Wrapper>
        <TransactionForm type="expense" onSaved={vi.fn()} />
      </Wrapper>,
    );
    await user.click(await screen.findByRole('button', { name: /^Currency: USD/ }));
    await user.click(screen.getByRole('button', { name: /^LRD/ }));
    await user.type(screen.getByLabelText('Amount'), '0.5');
    expect((await screen.findAllByText(/too small to record in USD/)).length).toBeGreaterThan(0);
  });
});

describe('optimistic mutations (§7.3, F7-04)', () => {
  function seeded() {
    const client = newClient();
    const data: InfiniteData<ActivityPage> = {
      pages: [{ data: [item(1, '2026-09-12'), item(2, '2026-09-08')], next_cursor: null }],
      pageParams: [null],
    };
    client.setQueryData(activityKey({}), data);
    client.setQueryData(activityKey({ kind: 'income' }), {
      ...data,
      pages: [{ data: [], next_cursor: null }],
    });
    return client;
  }
  const ids = (client: QueryClient, filters = {}) =>
    client
      .getQueryData<InfiniteData<ActivityPage>>(activityKey(filters))
      ?.pages.flatMap((p) => p.data.map((x) => x.id));

  it('inserts by date at once and restores the exact snapshot on failure', async () => {
    const client = seeded();
    let reject: (e: unknown) => void = () => undefined;
    call.mockImplementation(
      () =>
        new Promise((_resolve, rej) => {
          reject = rej;
        }),
    );
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: wrap(client) });
    act(() => {
      result.current.mutate({ body: {} as never, optimistic: item(3, '2026-09-10') });
    });
    await waitFor(() => {
      expect(ids(client)).toEqual([uuid(1), uuid(3), uuid(2)]);
    });
    // An income-only list never shows an expense.
    expect(ids(client, { kind: 'income' })).toEqual([]);
    act(() => {
      reject(new ApiError(500, { error: { code: 'INTERNAL', message: 'x', request_id: 'r' } }));
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(ids(client)).toEqual([uuid(1), uuid(2)]);
  });

  it('removes a deleted row at once and puts it back if the delete fails', async () => {
    const client = seeded();
    call.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: wrap(client) });
    act(() => {
      result.current.mutate(uuid(1));
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(ids(client)).toEqual([uuid(1), uuid(2)]);
  });
});

describe('Activity paging (FR-09, F7-05)', () => {
  it('shows 50, then 10 more from Load more, which is a real button', async () => {
    const user = userEvent.setup();
    const Wrapper = wrap(newClient());
    render(
      <Wrapper>
        <ActivityView />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(50);
    });
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(60);
    });
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    const pages = call.mock.calls.filter(([e]) => e.path === '/activity');
    expect(pages.map(([, input]) => (input as { query: { limit: number } }).query.limit)).toEqual([
      50, 50,
    ]);
  });

  it('puts filters in the URL', async () => {
    const user = userEvent.setup();
    const Wrapper = wrap(newClient());
    render(
      <Wrapper>
        <ActivityView />
      </Wrapper>,
    );
    await user.click(await screen.findByRole('button', { name: 'Income' }));
    expect(replace).toHaveBeenLastCalledWith('/activity?type=income', { scroll: false });
  });
});
