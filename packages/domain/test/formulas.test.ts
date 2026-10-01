import { describe, expect, it } from 'vitest';
import {
  bucketAverage,
  foldCategoryShares,
  Decimal,
  categoryTotals,
  contributorShares,
  convert,
  crossRate,
  currentPaceDaily,
  goalStatus,
  periodContaining,
  progressPct,
  projectedCompletion,
  requiredPace,
  roundPct1,
  savingsRateChangePts,
  savingsRatePct,
  sumMinor,
  type CashTransaction,
} from '../src';
import { THRESHOLDS } from './fixtures/reference-dataset';

// Edge cases and properties beyond the mandated sixteen (F2 plan §7).

const sep = periodContaining('month', '2026-09-17');

describe('summary edges', () => {
  it('savings rate may exceed 100%', () => {
    expect(savingsRatePct(30000, 10000)).toBe(300);
  });

  it('no expenses → no category breakdown (empty state)', () => {
    const income: CashTransaction = {
      type: 'income',
      date: '2026-09-01',
      categoryId: 'salary',
      baseAmountMinor: 100,
    };
    expect(categoryTotals([income], sep)).toEqual([]);
  });

  it('category totals ignore other periods and break ties by id', () => {
    const t = (categoryId: string, date: string): CashTransaction => ({
      type: 'expense',
      date,
      categoryId,
      baseAmountMinor: 500,
    });
    const shares = categoryTotals(
      [t('b', '2026-09-02'), t('a', '2026-09-03'), t('a', '2026-08-31')],
      sep,
    );
    expect(shares.map((s) => [s.categoryId, s.amount, s.pct])).toEqual([
      ['a', 500, 50],
      ['b', 500, 50],
    ]);
  });

  it('savings-rate change is null when either side is N/A', () => {
    expect(savingsRateChangePts(null, 20)).toBeNull();
    expect(savingsRateChangePts(20, null)).toBeNull();
    expect(savingsRateChangePts(25, 20)).toBe(5);
  });

  it('display rounding of percentages is half away from zero', () => {
    expect(roundPct1(26.35)).toBe(26.4);
    expect(roundPct1(-4.25)).toBe(-4.3);
  });
});

describe('chart aggregates (C-01, C-02)', () => {
  it('bucketAverage rounds the mean once, half away from zero, from the first spending', () => {
    expect(bucketAverage([])).toBe(0);
    expect(bucketAverage([0, 0, 0])).toBe(0);
    expect(bucketAverage([64000, 59500, 57000])).toBe(60167);
    expect(bucketAverage([1, 2])).toBe(2);
    // Leading empty months are before any records; later zeros count.
    expect(bucketAverage([0, 0, 0, 64000, 59500, 57000])).toBe(60167);
    expect(bucketAverage([0, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000])).toBe(154);
  });

  it('foldCategoryShares keeps the first n and folds the rest so parts total the whole', () => {
    const shares = [40, 20, 10, 10, 8, 5, 4, 3].map((pct, i) => ({
      id: String(i),
      amount: pct * 100,
      pct,
    }));
    const six = foldCategoryShares(shares, 6);
    expect(six.kept.map((s) => s.id)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(six.rest).toEqual({ amount: 700, pct: 7, count: 2 });
    // Seven or fewer slices fit as they are: no bucket of one.
    expect(foldCategoryShares(shares.slice(0, 7), 6).rest).toBeNull();
    expect(foldCategoryShares([], 6)).toEqual({ kept: [], rest: null });
  });
});

describe('goal edges', () => {
  it('a completed goal past its date is not overdue and needs nothing', () => {
    expect(requiredPace({ remaining: 0, targetDate: '2026-09-01', today: '2026-09-17' })).toEqual({
      daily: 0,
      weekly: 0,
      monthly: 0,
      overdue: false,
    });
  });

  it('completion precedes overdue', () => {
    const base = { target: 1000, createdDate: '2026-01-01', targetDate: '2026-02-01' };
    const today = '2026-09-17';
    expect(goalStatus({ ...base, balance: 1000, today, thresholds: THRESHOLDS })).toBe('completed');
    expect(goalStatus({ ...base, balance: 999, today, thresholds: THRESHOLDS })).toBe('behind');
  });

  it('thresholds are injected, not hard-coded', () => {
    const input = {
      balance: 9000,
      target: 20000,
      createdDate: '2026-01-01',
      targetDate: '2026-07-20',
      today: '2026-04-11',
    };
    expect(goalStatus({ ...input, thresholds: THRESHOLDS })).toBe('at_risk');
    expect(goalStatus({ ...input, thresholds: { onTrackMin: 0.9, atRiskMin: 0.5 } })).toBe(
      'on_track',
    );
  });

  it('a goal whose target date equals its creation date uses a 1-day plan', () => {
    const input = { target: 1000, createdDate: '2026-09-17', targetDate: '2026-09-17' };
    expect(goalStatus({ ...input, balance: 0, today: '2026-09-17', thresholds: THRESHOLDS })).toBe(
      'on_track',
    );
  });

  it('current pace divides by the goal age while it is younger than 30 days', () => {
    const contributions = [{ date: '2026-09-15', contributorId: 'a', goalAmountMinor: 1000 }];
    const young = currentPaceDaily({
      contributions,
      createdDate: '2026-09-15',
      today: '2026-09-16',
    });
    expect(young.toNumber()).toBe(500);
    const future = currentPaceDaily({
      contributions,
      createdDate: '2026-09-20',
      today: '2026-09-16',
    });
    // A creation date after today (clock skew) still divides by at least 1.
    expect(future.toNumber()).toBe(1000);
  });

  it('current pace only counts the last 30 days, today included', () => {
    const c = (date: string) => ({ date, contributorId: 'a', goalAmountMinor: 3000 });
    const pace = currentPaceDaily({
      contributions: [c('2026-08-18'), c('2026-08-19'), c('2026-09-17')],
      createdDate: '2026-01-01',
      today: '2026-09-17',
    });
    expect(pace.toNumber()).toBe(200);
  });

  it('no projection without recent contributions or with nothing left', () => {
    const today = '2026-09-17';
    expect(projectedCompletion({ remaining: 100, paceDaily: new Decimal(0), today })).toBeNull();
    expect(projectedCompletion({ remaining: 0, paceDaily: new Decimal(5), today })).toBeNull();
    expect(projectedCompletion({ remaining: 11, paceDaily: new Decimal(5), today })).toBe(
      '2026-09-20',
    );
  });

  it('no contributions → no shares', () => {
    expect(contributorShares([])).toEqual([]);
  });
});

describe('FX edges and ADR-005', () => {
  const lrd = new Decimal('189.39');
  const one = new Decimal(1);

  it('same currency cross rate is exactly 1', () => {
    expect(crossRate(lrd, lrd).toString()).toBe('1');
  });

  it('0.01 LRD → USD is AMOUNT_TOO_SMALL, never a thrown error or a stored 0', () => {
    expect(
      convert({ amountMinor: 1, fromExponent: 2, toExponent: 2, rate: crossRate(lrd, one) }),
    ).toEqual({
      ok: false,
      error: { code: 'AMOUNT_TOO_SMALL' },
    });
  });

  it('zero stays zero', () => {
    expect(convert({ amountMinor: 0, fromExponent: 2, toExponent: 2, rate: one })).toEqual({
      ok: true,
      value: 0,
    });
  });
});

describe('properties', () => {
  // Deterministic pseudo-random inputs: no ambient randomness in tests either.
  function* samples(count: number, seed = 7) {
    let s = seed;
    for (let i = 0; i < count; i++) {
      s = (s * 1103515245 + 12345) % 2 ** 31;
      yield s;
    }
  }

  it('conversion of a positive amount is never negative', () => {
    for (const s of samples(500)) {
      const rate = new Decimal(s % 100000).plus(1).dividedBy(1000);
      const r = convert({
        amountMinor: (s % 10_000_000) + 1,
        fromExponent: s % 4,
        toExponent: 2,
        rate,
      });
      // A positive input is either a positive amount or AMOUNT_TOO_SMALL, never negative.
      expect(r.ok ? r.value > 0 : r.error).toBeTruthy();
    }
  });

  it('progress never exceeds 100 and never goes below 0', () => {
    for (const s of samples(500, 11)) {
      const pct = progressPct(s % 500000, (s % 100000) + 1);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it('aggregates sum already-rounded conversions and never re-convert', () => {
    const rate = crossRate(new Decimal('189.39'), new Decimal(1));
    const amounts = [...samples(50, 3)].map((s) => (s % 1_000_000) + 1000);
    const converted = amounts.map((amountMinor) => {
      const r = convert({ amountMinor, fromExponent: 2, toExponent: 2, rate });
      if (!r.ok) throw new Error('unexpected');
      return r.value;
    });
    // The sum of rounded values is what reports show; it may differ from converting the sum.
    expect(sumMinor(converted)).toBe(converted.reduce((a, b) => a + b, 0));
  });
});
