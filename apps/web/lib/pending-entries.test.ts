import { describe, expect, it } from 'vitest';
import { indicatorLabel } from '@/components/ui/offline-sync-indicator';
import type { OutboxItem } from './outbox-machine';
import { pendingGoalMinor, pendingRow, pendingTotalsInput, waiting } from './pending-entries';

// §19.2's offline column from the outbox: rows marked "Sync pending", a goal's queued
// contributions, and what Home adds to its cached totals (estimates in base only).

const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });
const lrd = (amountMinor: number) => ({ amountMinor, currency: 'LRD' });

function entry(id: string, over: Partial<OutboxItem> & Pick<OutboxItem, 'display'>): OutboxItem {
  return {
    id,
    endpoint: 'createTransaction',
    body: {},
    idempotency_key: id,
    created_at: `2026-09-17T12:00:0${id}.000Z`,
    attempts: 0,
    owner_id: 'alex',
    state: 'pending',
    next_attempt_at: null,
    ...over,
  };
}

const taxi = entry('1', {
  display: {
    kind: 'transaction',
    type: 'expense',
    title: 'Transport',
    category: { icon: 'bus', color: 'cat-transport' },
    amount: lrd(500000),
    baseEstimate: usd(2630),
    date: '2026-09-17',
    note: 'Taxi',
  },
});
const salary = entry('2', {
  display: {
    kind: 'transaction',
    type: 'income',
    title: 'Salary',
    category: { icon: 'wallet', color: 'cat-bills' },
    amount: usd(10000),
    baseEstimate: usd(10000),
    date: '2026-09-16',
  },
});
const laptop = entry('3', {
  endpoint: 'createContribution',
  params: { id: 'goal-laptop' },
  display: {
    kind: 'contribution',
    goalId: 'goal-laptop',
    title: 'New Laptop',
    amount: lrd(950000),
    goalEstimate: null,
    baseEstimate: null,
    date: '2026-09-17',
  },
});
const savings = entry('4', {
  endpoint: 'createContribution',
  params: { id: 'goal-laptop' },
  display: {
    kind: 'contribution',
    goalId: 'goal-laptop',
    title: 'New Laptop',
    amount: usd(2500),
    goalEstimate: usd(2500),
    baseEstimate: usd(2500),
    date: '2026-09-17',
  },
});
const refused = entry('5', { ...salary, state: 'refused', reason: 'No.' });

describe('pending entries', () => {
  it('waiting: pending only, newest date first', () => {
    expect(waiting([salary, refused, taxi]).map((i) => i.id)).toEqual(['1', '2']);
  });

  it('a row is marked pending, with the ≈ base estimate only when the currency differs', () => {
    expect(pendingRow(taxi)).toMatchObject({
      kind: 'expense',
      title: 'Transport',
      pending: true,
      note: 'Taxi',
      base: usd(2630),
    });
    expect(pendingRow(salary).base).toBeUndefined();
    expect(pendingRow(laptop)).toMatchObject({ kind: 'contribution', title: 'New Laptop' });
  });

  it("a goal's queued contributions: known amounts added, unknown counted", () => {
    expect(pendingGoalMinor([laptop, savings, taxi], 'goal-laptop')).toEqual({
      minor: 2500,
      unknown: 1,
    });
    expect(pendingGoalMinor([laptop], 'other')).toEqual({ minor: 0, unknown: 0 });
  });

  it('Home adds only entries with a base estimate, as income, expense or saved', () => {
    expect(pendingTotalsInput([taxi, salary, laptop, savings, refused], 'USD')).toEqual({
      entries: [
        { kind: 'saved', date: '2026-09-17', baseAmountMinor: 2500 },
        { kind: 'expense', date: '2026-09-17', baseAmountMinor: 2630 },
        { kind: 'income', date: '2026-09-16', baseAmountMinor: 10000 },
      ],
      skipped: 1,
    });
    // After a base-currency change the estimates no longer apply.
    expect(pendingTotalsInput([taxi], 'EUR')).toEqual({ entries: [], skipped: 1 });
  });
});

describe('the header chip (§19.1)', () => {
  it('says offline, what needs attention and what is pending, in words', () => {
    expect(indicatorLabel(false, 0, 0)).toBe('Offline');
    expect(indicatorLabel(false, 2, 0)).toBe('Offline · Sync pending (2)');
    expect(indicatorLabel(true, 1, 1)).toBe('Needs attention (1) · Sync pending (1)');
  });
});
