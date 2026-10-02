// @vitest-environment jsdom
import type { GoalDetail } from '@spendtogether/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { StatusChip } from '@/components/ui/status-chip';
import { ToastProvider } from '@/components/ui/toast';
import { setAppClock } from '@/lib/clock';
import { mockClock } from '@/mocks/clock';
import { uid } from '@/mocks/ids';
import { call, useMockServer as withMockServer } from '@/mocks/test-utils';
import { ContributionForm } from './contribution-form';
import { GoalForm } from './goal-form';

// F9 against the real mock API (msw/node): the "After this" preview equals the goal the
// server returns after saving (FR-14, WAC-09), editing never offers currency (BR-15), and
// every status chip carries an icon and text (exit criterion 4).

vi.mock('next/navigation', () => ({
  usePathname: () => '/goals',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

withMockServer();
beforeAll(() => {
  setAppClock(mockClock);
});

const LAPTOP = uid('goal:laptop');

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{node}</ToastProvider>
    </QueryClientProvider>
  );
}

async function laptop(): Promise<GoalDetail> {
  return call('getGoal', { params: { id: LAPTOP } });
}

describe('"After this" equals the post-save state (FR-14)', () => {
  it.each([
    ['in goal currency', null, '50', '$650.00'],
    ['in another currency', 'LRD', '5000', '$626.30'],
  ])('%s', async (_name, currency, typed, expected) => {
    const user = userEvent.setup();
    const goal = await laptop();
    const onSaved = vi.fn();
    render(wrap(<ContributionForm goal={goal} onSaved={onSaved} />));
    if (currency) {
      await user.click(await screen.findByRole('button', { name: /^Currency: USD/ }));
      await user.click(screen.getByRole('button', { name: new RegExp(`^${currency}`) }));
    }
    await user.type(await screen.findByLabelText('Amount'), typed);
    const preview = await screen.findByText(new RegExp(`After this: \\${expected} saved`));
    const shown = preview.textContent;
    await user.click(screen.getByRole('button', { name: 'Add contribution' }));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    const after = (onSaved.mock.calls[0]?.[0] as { goal: GoalDetail }).goal;
    expect(after.balance.amount_minor).toBe(Number(expected.replace(/[$,.]/g, '')));
    expect(shown).toContain(`${String(Math.round(after.progress_pct * 10) / 10)}%`);
    expect(await laptop()).toMatchObject({ balance: { amount_minor: after.balance.amount_minor } });
  });

  it('flags completion when the goal is reached, and the server agrees', async () => {
    const user = userEvent.setup();
    const goal = await laptop();
    const onSaved = vi.fn();
    render(wrap(<ContributionForm goal={goal} onSaved={onSaved} />));
    await user.type(await screen.findByLabelText('Amount'), '600');
    expect(await screen.findByText(/100% · Goal reached/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add contribution' }));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ completedNow: true }));
    });
    expect((await laptop()).status).toBe('completed');
  });
});

describe('GoalForm', () => {
  it('edit mode has no currency control and no type choice (BR-15)', async () => {
    const goal = await laptop();
    const { container } = render(wrap(<GoalForm initial={goal} />));
    expect(await screen.findByLabelText('Target amount')).toHaveProperty('value', '1200.00');
    expect(screen.queryByRole('button', { name: /Currency/ })).toBeNull();
    expect(screen.queryByRole('radio', { name: /With my partner/ })).toBeNull();
    expect(screen.getByText("A goal's currency can't change after it's created.")).toBeTruthy();
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  });

  it('create keeps the button disabled until the target and date are valid (BR-10)', async () => {
    const user = userEvent.setup();
    render(wrap(<GoalForm />));
    const create = await screen.findByRole('button', { name: 'Create goal' });
    await user.type(screen.getByLabelText('Name'), 'Phone');
    await user.type(screen.getByLabelText('Target amount'), '300');
    expect(create).toHaveProperty('disabled', true);
    await user.type(screen.getByLabelText('Target date'), '2026-09-16');
    expect(create).toHaveProperty('disabled', true);
    await user.clear(screen.getByLabelText('Target date'));
    await user.type(screen.getByLabelText('Target date'), '2026-09-17');
    expect(create).toHaveProperty('disabled', false);
  });
});

describe('StatusChip (§17.2)', () => {
  it.each([
    ['on_track', 'On track'],
    ['at_risk', 'At risk'],
    ['behind', 'Behind'],
    ['completed', 'Completed'],
  ] as const)('%s shows an icon and the word', (status, word) => {
    const { container } = render(<StatusChip status={status} />);
    expect(within(container).getByText(word)).toBeTruthy();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('overdue reads "Overdue"', () => {
    render(<StatusChip status="behind" overdue />);
    expect(screen.getByText('Overdue')).toBeTruthy();
  });
});
