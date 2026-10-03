// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';
import { confirmsName, firstName } from '@/lib/couple';
import { CoupleView } from './couple-view';
import { EndConnectionDialog } from './end-connection-dialog';
import { InvitationLanding } from './invitation-landing';

// F10: the three couple states, the end-connection gate, and the adversarial privacy
// test (F10-04, WAC-12): even when the API is coaxed into returning partner finances,
// none of it reaches the DOM — the screens render names and dates only.

vi.mock('next/navigation', () => ({
  usePathname: () => '/couple',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Every value here must stay out of the page. */
const LEAKS = {
  income: 'LEAK-income-987654',
  expenses: 'LEAK-expenses-123456',
  balance: 'LEAK-balance-555',
  goal: 'LEAK Sam private motorbike',
  email: 'LEAK-sam-private@example.com',
  surname: 'Tweh',
};

function coaxed(base: Record<string, unknown>) {
  return {
    ...base,
    partner_income: LEAKS.income,
    partner: base['partner']
      ? {
          ...base['partner'],
          email: LEAKS.email,
          expenses: LEAKS.expenses,
          balance: LEAKS.balance,
          goals: [{ name: LEAKS.goal }],
        }
      : null,
  };
}

const ACTIVE = coaxed({
  status: 'active',
  partner: { name: 'Sam Tweh', since: '2026-06-02T09:00:00.000Z' },
  invitation: null,
  shared_goal_count: 1,
  ended_at: null,
});
const PENDING = coaxed({
  status: 'pending',
  partner: null,
  invitation: {
    id: uuid(7),
    invitee: 'sam.tweh@example.com',
    invitee_kind: 'email',
    status: 'pending',
    expires_at: '2026-09-23T18:00:00.000Z',
    created_at: '2026-09-16T18:00:00.000Z',
  },
  shared_goal_count: 0,
  ended_at: null,
});
const NONE = coaxed({
  status: 'none',
  partner: null,
  invitation: null,
  shared_goal_count: 0,
  ended_at: null,
});

let call: MockInstance<(e: { path: string; method: string }, input: unknown) => Promise<unknown>>;
let couple: unknown = ACTIVE;

function answer(e: { path: string; method: string }): Promise<unknown> {
  // The client's schema check is bypassed on purpose: this is the "coaxed" mock.
  if (e.path === '/couple') return Promise.resolve(couple);
  if (e.path === '/goals') return Promise.resolve({ data: [] });
  if (e.path === '/currencies') return Promise.resolve({ data: [] });
  if (e.path === '/me') return Promise.reject(new Error('signed out'));
  if (e.path === '/invitations/by-token/:token') {
    return Promise.resolve({
      invitation_id: uuid(7),
      inviter_first_name: 'Alex',
      status: 'pending',
      expires_at: '2026-09-23T18:00:00.000Z',
      inviter_surname: 'Kamara',
      inviter_email: LEAKS.email,
    });
  }
  return Promise.reject(new Error(`unexpected ${e.path}`));
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{node}</ToastProvider>
    </QueryClientProvider>
  );
}

function expectNoLeaks(container: HTMLElement) {
  const text = container.textContent;
  for (const leak of Object.values(LEAKS)) {
    if (leak === LEAKS.surname) continue;
    expect(text).not.toContain(leak);
  }
}

beforeEach(() => {
  call = vi.spyOn(apiClient, 'call') as unknown as typeof call;
  call.mockImplementation(answer);
});
afterEach(() => {
  call.mockRestore();
});

describe('couple states (SCR-19)', () => {
  it.each([
    ['no partner', NONE, 'Save for shared goals together'],
    ['pending', PENDING, 'Waiting for your partner'],
    ['connected', ACTIVE, 'You & Sam'],
  ])('%s renders, with the privacy promise and no partner data', async (_name, state, heading) => {
    couple = state;
    const { container } = render(wrap(<CoupleView />));
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
    expect(
      screen.getByText(
        'Your partner sees shared goals only. Your income, expenses and personal goals always stay private.',
      ),
    ).toBeTruthy();
    await waitFor(() => {
      expectNoLeaks(container);
    });
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  });

  it('the connected state names the partner by first name only', async () => {
    couple = ACTIVE;
    const { container } = render(wrap(<CoupleView />));
    await screen.findByRole('heading', { name: 'You & Sam' });
    expect(container.textContent).not.toContain(LEAKS.surname);
  });
});

describe('invitation landing (SCR-20)', () => {
  it('shows the inviter first name and nothing else, even if more is returned', async () => {
    const { container } = render(wrap(<InvitationLanding token="invite-pending" />));
    expect(
      await screen.findByRole('heading', {
        name: 'Alex invited you to save together on SpendTogether',
      }),
    ).toBeTruthy();
    expect(container.textContent).not.toContain('Kamara');
    expectNoLeaks(container);
  });
});

describe('end connection (§7.9)', () => {
  it('stays disabled until the partner first name is typed', async () => {
    const user = userEvent.setup();
    render(wrap(<EndConnectionDialog partnerName="Sam Tweh" />));
    await user.click(screen.getByRole('button', { name: 'End connection' }));
    const confirm = screen.getAllByRole('button', { name: 'End connection' }).at(-1);
    if (!confirm) throw new Error('no confirm button');
    expect(confirm).toHaveProperty('disabled', true);
    await user.type(screen.getByLabelText('Type Sam to confirm'), 'Tweh');
    expect(confirm).toHaveProperty('disabled', true);
    await user.clear(screen.getByLabelText('Type Sam to confirm'));
    await user.type(screen.getByLabelText('Type Sam to confirm'), 'sam');
    expect(confirm).toHaveProperty('disabled', false);
  });

  it('name matching ignores case, spaces and accents only', () => {
    expect(firstName('Sam Tweh')).toBe('Sam');
    expect(confirmsName(' SAM ', 'Sam Tweh')).toBe(true);
    expect(confirmsName('Sám', 'Sam Tweh')).toBe(true);
    expect(confirmsName('Sa', 'Sam Tweh')).toBe(false);
    expect(confirmsName('Sam Tweh', 'Sam Tweh')).toBe(false);
    expect(confirmsName('', '')).toBe(false);
  });
});
