import { describe, expect, it } from 'vitest';
import {
  avgDailySpending,
  categoryTotals,
  currentPaceDaily,
  daysRemaining,
  expectedBalance,
  goalBalance,
  goalStatus,
  periodChangePct,
  periodContaining,
  periodTotals,
  progressPct,
  projectedCompletion,
  remainingAmount,
  requiredPace,
  roundHalfAwayFromZero,
  roundPct1,
  savingsRateChangePts,
  savingsRatePct,
  Decimal,
} from '../src';
import {
  AUGUST,
  CATEGORY,
  CONTRIBUTIONS,
  LAPTOP,
  PARTNER_CONTRIBUTIONS,
  THRESHOLDS,
  TODAY,
  TRANSACTIONS,
  USER,
} from './fixtures/reference-dataset';

// Spec §6.5 end to end (F2-12), plus the §10.5 required-pace payload (ADR-004).

const september = periodContaining('month', TODAY);

describe('§6.5 reference dataset: September to 17 Sep', () => {
  const totals = periodTotals({
    transactions: TRANSACTIONS,
    contributions: [...CONTRIBUTIONS, ...PARTNER_CONTRIBUTIONS],
    period: september,
    userId: USER.id,
  });

  it('reproduces income, expenses, savings, net, remaining and rate', () => {
    expect(totals).toEqual({
      income: 120000,
      expenses: 57000,
      saved: 30000,
      net: 63000,
      remaining: 33000,
      savingsRatePct: 25,
    });
  });

  it('average daily spending is 570.00 ÷ 17 = 33.53', () => {
    expect(avgDailySpending(totals.expenses, september, TODAY)).toBe(3353);
  });

  it('category shares sum to 100.0% in the corrected order', () => {
    const shares = categoryTotals(TRANSACTIONS, september);
    expect(shares.map((c) => [c.categoryId, c.amount, roundPct1(c.pct)])).toEqual([
      [CATEGORY.bills, 15000, 26.3],
      [CATEGORY.food, 14000, 24.6],
      [CATEGORY.other, 10500, 18.4],
      [CATEGORY.transport, 9000, 15.8],
      [CATEGORY.shopping, 8500, 14.9],
    ]);
    expect(shares.reduce((s, c) => s + c.amount, 0)).toBe(totals.expenses);
  });

  it('compares with August', () => {
    const augustRate = savingsRatePct(AUGUST.saved, AUGUST.income);
    expect(roundPct1(periodChangePct(totals.income, AUGUST.income) ?? NaN)).toBe(8);
    expect(roundPct1(periodChangePct(totals.expenses, AUGUST.expenses) ?? NaN)).toBe(-4.2);
    expect(roundPct1(periodChangePct(totals.saved, AUGUST.saved) ?? NaN)).toBe(20);
    expect(roundPct1(augustRate ?? NaN)).toBe(22.5);
    expect(roundPct1(savingsRateChangePts(totals.savingsRatePct, augustRate) ?? NaN)).toBe(2.5);
  });
});

describe('§6.5 goal "New Laptop" on 17 Sep', () => {
  const balance = goalBalance(LAPTOP.contributions);
  const remaining = remainingAmount(LAPTOP.target, balance);

  it('progress 50.0%, remaining 600.00, 105 days left', () => {
    expect(balance).toBe(60000);
    expect(progressPct(balance, LAPTOP.target)).toBe(50);
    expect(remaining).toBe(60000);
    expect(daysRemaining(LAPTOP.targetDate, TODAY)).toBe(105);
  });

  it('required pace is the §10.5 payload {571, 4000, 17393} (ADR-004)', () => {
    expect(requiredPace({ remaining, targetDate: LAPTOP.targetDate, today: TODAY })).toEqual({
      daily: 571,
      weekly: 4000,
      monthly: 17393,
      overdue: false,
    });
  });

  it('status check: elapsed 78 of 183 days, expected 511.48, ratio 1.17, on track', () => {
    const expected = expectedBalance({ ...LAPTOP, today: TODAY });
    expect(roundHalfAwayFromZero(expected)).toBe(51148);
    expect(new Decimal(balance).dividedBy(expected).toDecimalPlaces(2).toNumber()).toBe(1.17);
    expect(goalStatus({ ...LAPTOP, balance, today: TODAY, thresholds: THRESHOLDS })).toBe(
      'on_track',
    );
  });

  it('current pace 8.33/day (F-18) projects completion on 28 Nov (F-20)', () => {
    const pace = currentPaceDaily({ ...LAPTOP, today: TODAY });
    expect(roundHalfAwayFromZero(pace)).toBe(833);
    expect(projectedCompletion({ remaining, paceDaily: pace, today: TODAY })).toBe('2026-11-28');
  });
});
