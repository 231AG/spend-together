import { describe, expect, it } from 'vitest';
import {
  Decimal,
  avgDailySpending,
  categoryTotals,
  contributorShares,
  convert,
  crossRate,
  daysElapsed,
  goalBalance,
  goalStatus,
  localDate,
  periodChangePct,
  periodContaining,
  periodTotals,
  progressPct,
  rateForDate,
  remainingAmount,
  requiredPace,
  roundPct1,
  type CashTransaction,
  type Period,
  type StoredRate,
} from '../src';
import { THRESHOLDS } from './fixtures/reference-dataset';

// Spec §23.1: the sixteen mandated cases, each tagged with its T- ID so the
// traceability matrix can be verified with `grep -r "T-0" packages/domain/test`.

const month: Period = { type: 'month', start: '2026-09-01', end: '2026-09-30' };
const me = 'user-a';
const tx = (type: CashTransaction['type'], amount: number, categoryId = 'c'): CashTransaction => ({
  type,
  date: '2026-09-10',
  categoryId,
  baseAmountMinor: amount,
});
const usd = (rate: string): Decimal => new Decimal(rate);

describe('§23.1 mandated test cases', () => {
  it('T-01 totals: income 1,200.00, expenses 570.00, savings 300.00', () => {
    const totals = periodTotals({
      transactions: [tx('income', 120000), tx('expense', 57000)],
      contributions: [{ date: '2026-09-10', contributorId: me, contributorBaseAmountMinor: 30000 }],
      period: month,
      userId: me,
    });
    expect(totals.net).toBe(63000);
    expect(totals.remaining).toBe(33000);
    expect(roundPct1(totals.savingsRatePct ?? NaN)).toBe(25);
  });

  it('T-02 zero income: rate N/A, remaining −50.00, no exception', () => {
    const totals = periodTotals({
      transactions: [tx('expense', 5000)],
      contributions: [],
      period: month,
      userId: me,
    });
    expect(totals.savingsRatePct).toBeNull();
    expect(totals.remaining).toBe(-5000);
  });

  it('T-03 a 100.00 contribution leaves expenses unchanged and adds to savings', () => {
    const base = { transactions: [tx('income', 50000), tx('expense', 20000)], period: month };
    const before = periodTotals({ ...base, contributions: [], userId: me });
    const after = periodTotals({
      ...base,
      contributions: [{ date: '2026-09-10', contributorId: me, contributorBaseAmountMinor: 10000 }],
      userId: me,
    });
    expect(after.expenses).toBe(before.expenses);
    expect(after.saved - before.saved).toBe(10000);
    expect(categoryTotals(base.transactions, month)).toHaveLength(1);
  });

  it('T-04 target 1,200, balance 600: progress 50%, remaining 600', () => {
    expect(progressPct(60000, 120000)).toBe(50);
    expect(remainingAmount(120000, 60000)).toBe(60000);
  });

  it('T-05 balance 1,300 on target 1,200: progress 100%, remaining 0, completed', () => {
    expect(progressPct(130000, 120000)).toBe(100);
    expect(remainingAmount(120000, 130000)).toBe(0);
    expect(
      goalStatus({
        balance: 130000,
        target: 120000,
        createdDate: '2026-07-01',
        targetDate: '2026-12-31',
        today: '2026-09-17',
        thresholds: THRESHOLDS,
      }),
    ).toBe('completed');
  });

  it('T-06 target date today, remaining 60: required 60 per day, no divide by zero', () => {
    const pace = requiredPace({ remaining: 6000, targetDate: '2026-09-17', today: '2026-09-17' });
    expect(pace.daily).toBe(6000);
    expect(pace.overdue).toBe(false);
  });

  it('T-07 target date yesterday, not complete: behind, required pace overdue', () => {
    const pace = requiredPace({ remaining: 6000, targetDate: '2026-09-16', today: '2026-09-17' });
    expect(pace).toEqual({ daily: null, weekly: null, monthly: null, overdue: true });
    expect(
      goalStatus({
        balance: 114000,
        target: 120000,
        createdDate: '2026-07-01',
        targetDate: '2026-09-16',
        today: '2026-09-17',
        thresholds: THRESHOLDS,
      }),
    ).toBe('behind');
  });

  it('T-08 couple goal: A 480, B 320 on target 2,000 → balance 800, shares 60% / 40%', () => {
    const contributions = [
      { date: '2026-09-01', contributorId: 'a', goalAmountMinor: 30000 },
      { date: '2026-09-02', contributorId: 'b', goalAmountMinor: 32000 },
      { date: '2026-09-03', contributorId: 'a', goalAmountMinor: 18000 },
    ];
    expect(goalBalance(contributions)).toBe(80000);
    expect(contributorShares(contributions)).toEqual([
      { contributorId: 'a', amount: 48000, sharePct: 60 },
      { contributorId: 'b', amount: 32000, sharePct: 40 },
    ]);
  });

  it.each([
    [9500, 'on_track'],
    [9499, 'at_risk'],
    [7500, 'at_risk'],
    [7499, 'behind'],
  ] as const)('T-09 status thresholds: balance %i at expected 10,000 → %s', (balance, status) => {
    // Halfway through a 200-day plan for 20,000: expected is exactly 10,000.
    expect(
      goalStatus({
        balance,
        target: 20000,
        createdDate: '2026-01-01',
        targetDate: '2026-07-20',
        today: '2026-04-11',
        thresholds: THRESHOLDS,
      }),
    ).toBe(status);
  });

  it('T-10 new goal, zero contributions, day 0 → on track', () => {
    expect(
      goalStatus({
        balance: 0,
        target: 120000,
        createdDate: '2026-09-17',
        targetDate: '2026-12-31',
        today: '2026-09-17',
        thresholds: THRESHOLDS,
      }),
    ).toBe('on_track');
  });

  it('T-11 5,000 LRD at 1 USD = 189.39 LRD → 26.40 USD, half away from zero', () => {
    const rate = crossRate(usd('189.39'), usd('1'));
    expect(convert({ amountMinor: 500000, fromExponent: 2, toExponent: 2, rate })).toEqual({
      ok: true,
      value: 2640,
    });
  });

  it('T-12 JPY (exponent 0) and KWD (exponent 3) convert with their own exponents', () => {
    const jpy = convert({
      amountMinor: 1000,
      fromExponent: 0,
      toExponent: 2,
      rate: crossRate(usd('148.2'), usd('1')),
    });
    const kwd = convert({
      amountMinor: 1234,
      fromExponent: 3,
      toExponent: 2,
      rate: crossRate(usd('0.3065'), usd('1')),
    });
    expect(jpy).toEqual({ ok: true, value: 675 }); // 1,000 ÷ 148.2 = 6.7476 USD
    expect(kwd).toEqual({ ok: true, value: 403 }); // 1.234 ÷ 0.3065 = 4.0261 USD
    const toJpy = convert({
      amountMinor: 675,
      fromExponent: 2,
      toExponent: 0,
      rate: crossRate(usd('1'), usd('148.2')),
    });
    expect(toJpy).toEqual({ ok: true, value: 1000 }); // 6.75 × 148.2 = 1,000.35 yen
  });

  it('T-13 23:30 UTC on 31 Aug is August in Africa/Monrovia and September in Asia/Tokyo', () => {
    const instant = new Date('2026-08-31T23:30:00Z');
    const monrovia = localDate(instant, 'Africa/Monrovia');
    const tokyo = localDate(instant, 'Asia/Tokyo');
    expect(periodContaining('month', monrovia).start).toBe('2026-08-01');
    expect(periodContaining('month', tokyo).start).toBe('2026-09-01');
  });

  it('T-14 ISO weeks start on Monday: Sunday closes the week, Monday opens the next', () => {
    expect(periodContaining('week', '2026-09-20')).toEqual({
      type: 'week',
      start: '2026-09-14',
      end: '2026-09-20',
    });
    expect(periodContaining('week', '2026-09-21').start).toBe('2026-09-21');
  });

  it('T-15 average daily spending divides by 17 on 17 Sep and by 31 for August', () => {
    const august = periodContaining('month', '2026-08-15');
    expect(daysElapsed(month, '2026-09-17')).toBe(17);
    expect(daysElapsed(august, '2026-09-17')).toBe(31);
    expect(avgDailySpending(57000, month, '2026-09-17')).toBe(3353);
    expect(avgDailySpending(62000, august, '2026-09-17')).toBe(2000);
  });

  it('T-16 previous period 0 → "New" (no percentage)', () => {
    expect(periodChangePct(57000, 0)).toBeNull();
    expect(periodChangePct(0, 0)).toBeNull();
  });
});

describe('F-24 rate for date', () => {
  const rates: StoredRate[] = [
    { rateDate: '2026-09-15', rate: '190.00' },
    { rateDate: '2026-09-01', rate: '189.39' },
  ];

  it('picks the latest stored rate on or before the date', () => {
    const r = rateForDate('LRD', rates, '2026-09-10');
    expect(r.ok && [r.value.rateDate, r.value.rate.toString(), r.value.estimated]).toEqual([
      '2026-09-01',
      '189.39',
      false,
    ]);
  });

  it('falls back to the earliest rate, flagged estimated, before the first one', () => {
    const r = rateForDate('LRD', rates, '2026-08-01');
    expect(r.ok && [r.value.rateDate, r.value.estimated]).toEqual(['2026-09-01', true]);
  });

  it('USD is always exactly 1; no rates at all is RATE_UNAVAILABLE', () => {
    const u = rateForDate('USD', [], '2026-09-10');
    expect(u.ok && u.value.rate.toString()).toBe('1');
    expect(rateForDate('LRD', [], '2026-09-10')).toEqual({
      ok: false,
      error: { code: 'RATE_UNAVAILABLE', currency: 'LRD' },
    });
  });
});
