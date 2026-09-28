import { Decimal, minor, roundHalfAwayFromZero, sumMinor, type MoneyMinor } from './money';
import { daysElapsed, isInPeriod, type IsoDate, type Period } from './period';

// Period calculations F-01…F-10 (spec §6.2). Every amount is the record's already
// converted base amount; aggregates sum rounded values and never re-convert (§6.1).
// Percentages are full precision; round with `roundPct1` only for display.

/** An income or expense transaction, reduced to what the formulas need. */
export interface CashTransaction {
  type: 'income' | 'expense';
  date: IsoDate;
  baseAmountMinor: number;
  categoryId: string;
}

/**
 * A goal contribution as it affects cash flow. It deliberately has no category, so it can
 * never appear in a category breakdown (BR-02).
 */
export interface SavingsContribution {
  date: IsoDate;
  contributorId: string;
  /** Contribution converted to the contributor's base currency. */
  contributorBaseAmountMinor: number;
}

export interface PeriodTotals {
  /** F-01. */
  income: MoneyMinor;
  /** F-02. Contributions are never expenses (BR-02). */
  expenses: MoneyMinor;
  /** F-03: the user's own contributions only. */
  saved: MoneyMinor;
  /** F-05, may be negative. */
  net: MoneyMinor;
  /** F-04, may be negative ("Overspent"). */
  remaining: MoneyMinor;
  /** F-06; null means N/A because income is 0. May exceed 100. */
  savingsRatePct: number | null;
}

function sumOf(transactions: readonly CashTransaction[], type: CashTransaction['type']) {
  return sumMinor(transactions.filter((t) => t.type === type).map((t) => t.baseAmountMinor));
}

/** F-01…F-06 for one user and one period. */
export function periodTotals(input: {
  transactions: readonly CashTransaction[];
  contributions: readonly SavingsContribution[];
  period: Period;
  userId: string;
}): PeriodTotals {
  const inPeriod = input.transactions.filter((t) => isInPeriod(t.date, input.period));
  const income = sumOf(inPeriod, 'income');
  const expenses = sumOf(inPeriod, 'expense');
  const saved = sumMinor(
    input.contributions
      .filter((c) => c.contributorId === input.userId && isInPeriod(c.date, input.period))
      .map((c) => c.contributorBaseAmountMinor),
  );
  return {
    income,
    expenses,
    saved,
    net: minor(income - expenses),
    remaining: minor(income - expenses - saved),
    savingsRatePct: savingsRatePct(saved, income),
  };
}

/** F-06: null (N/A) when income is 0 (AC05, T-02). */
export function savingsRatePct(saved: number, income: number): number | null {
  if (income === 0) return null;
  return new Decimal(saved).dividedBy(income).times(100).toNumber();
}

/** F-07: expenses ÷ D, rounded once to minor units (T-15). */
export function avgDailySpending(expenses: number, period: Period, today: IsoDate): MoneyMinor {
  return roundHalfAwayFromZero(new Decimal(expenses).dividedBy(daysElapsed(period, today)));
}

export interface CategoryTotal {
  categoryId: string;
  /** F-08. */
  amount: MoneyMinor;
  /** F-09, full precision. */
  pct: number;
}

/**
 * F-08 and F-09 over the period's expenses, sorted by amount descending (ties by id so the
 * order is stable). Empty when there are no expenses: the UI shows its empty state.
 */
export function categoryTotals(
  transactions: readonly CashTransaction[],
  period: Period,
): CategoryTotal[] {
  const byCategory = new Map<string, number[]>();
  for (const t of transactions) {
    if (t.type !== 'expense' || !isInPeriod(t.date, period)) continue;
    const amounts = byCategory.get(t.categoryId) ?? [];
    amounts.push(t.baseAmountMinor);
    byCategory.set(t.categoryId, amounts);
  }
  const totals = [...byCategory].map(([categoryId, amounts]) => ({
    categoryId,
    amount: sumMinor(amounts),
  }));
  const expenses = sumMinor(totals.map((t) => t.amount));
  if (expenses === 0) return [];
  return totals
    .map((t) => ({ ...t, pct: new Decimal(t.amount).dividedBy(expenses).times(100).toNumber() }))
    .sort((a, b) => b.amount - a.amount || a.categoryId.localeCompare(b.categoryId));
}

/** F-10. Null when the previous value is 0: show the absolute change labelled "New" (T-16). */
export function periodChangePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return new Decimal(current).minus(previous).dividedBy(previous).times(100).toNumber();
}

/** Savings-rate change in percentage points; null when either rate is N/A. */
export function savingsRateChangePts(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  return new Decimal(current).minus(previous).toNumber();
}

/** Round a full-precision percentage to one decimal for display, ties away from zero. */
export function roundPct1(pct: number): number {
  return new Decimal(pct).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
}
