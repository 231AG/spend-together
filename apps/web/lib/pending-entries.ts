import type { PendingEntry } from '@spendtogether/domain';
import type { TransactionRowData } from '@/components/ui/transaction-row';
import { needsAttention, type OutboxItem } from './outbox-machine';

// Queued entries as the screens show them (§19.2 offline column): rows marked "Sync
// pending" at the top of Activity and Home, a goal's own queued contributions, and the
// estimates Home applies to its cached totals. Refused entries are left to Needs
// attention; they count nowhere until fixed.

/** Pending (not refused or exhausted), newest first, as on Activity. */
export function waiting(items: readonly OutboxItem[]): OutboxItem[] {
  return items
    .filter((i) => !needsAttention(i))
    .sort(
      (a, b) =>
        b.display.date.localeCompare(a.display.date) || b.created_at.localeCompare(a.created_at),
    );
}

export function pendingRow(item: OutboxItem): TransactionRowData {
  const d = item.display;
  const note = d.note ? { note: d.note } : {};
  if (d.kind === 'transaction') {
    const base =
      d.baseEstimate && d.baseEstimate.currency !== d.amount.currency
        ? { base: d.baseEstimate }
        : {};
    return {
      kind: d.type,
      title: d.title,
      category: d.category,
      amount: d.amount,
      date: d.date,
      pending: true,
      ...base,
      ...note,
    };
  }
  const base =
    d.goalEstimate && d.goalEstimate.currency !== d.amount.currency ? { base: d.goalEstimate } : {};
  return {
    kind: 'contribution',
    title: d.title,
    amount: d.amount,
    date: d.date,
    pending: true,
    ...base,
    ...note,
  };
}

/** A goal's queued contributions, in the goal's currency where known. */
export function pendingForGoal(items: readonly OutboxItem[], goalId: string): OutboxItem[] {
  return waiting(items).filter(
    (i) => i.display.kind === 'contribution' && i.display.goalId === goalId,
  );
}

/** The goal-currency amount the goal's queued contributions add (unknown ones skipped). */
export function pendingGoalMinor(
  items: readonly OutboxItem[],
  goalId: string,
): {
  minor: number;
  unknown: number;
} {
  let minor = 0;
  let unknown = 0;
  for (const item of pendingForGoal(items, goalId)) {
    const d = item.display;
    if (d.kind !== 'contribution') continue;
    if (d.goalEstimate) minor += d.goalEstimate.amountMinor;
    else unknown += 1;
  }
  return { minor, unknown };
}

/**
 * What Home applies locally (domain `withPending`): entries with a base-currency estimate
 * in `base`. Entries without one are still listed, but not added to totals.
 */
export function pendingTotalsInput(
  items: readonly OutboxItem[],
  base: string,
): { entries: PendingEntry[]; skipped: number } {
  const entries: PendingEntry[] = [];
  let skipped = 0;
  for (const item of waiting(items)) {
    const d = item.display;
    const estimate = d.baseEstimate;
    if (!estimate || estimate.currency !== base) {
      skipped += 1;
      continue;
    }
    entries.push({
      kind: d.kind === 'contribution' ? 'saved' : d.type,
      date: d.date,
      baseAmountMinor: estimate.amountMinor,
    });
  }
  return { entries, skipped };
}
