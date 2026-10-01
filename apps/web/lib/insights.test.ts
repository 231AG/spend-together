import { describe, expect, it } from 'vitest';
import {
  bucketLabel,
  bucketRange,
  categoryActivityHref,
  comparedTo,
  donutSlices,
  goalCardData,
  hasEnoughBuckets,
  insightsHrefFor,
  pctLabel,
  periodPhrase,
  periodTitle,
  seriesPoints,
  stepPeriod,
  trendAverage,
} from './insights';

// F8 display helpers. Reference values from §6.5 and §16.3, never the design boards.

const SERIES = {
  bucket: 'month' as const,
  points: [
    { start: '2026-04-01', income: 0, expenses: 0 },
    { start: '2026-05-01', income: 0, expenses: 0 },
    { start: '2026-06-01', income: 0, expenses: 0 },
    { start: '2026-07-01', income: 110000, expenses: 64000 },
    { start: '2026-08-01', income: 111111, expenses: 59500 },
    { start: '2026-09-01', income: 120000, expenses: 57000 },
  ],
};

describe('labels', () => {
  it('names periods and buckets', () => {
    expect(periodPhrase('month')).toBe('this month');
    expect(periodPhrase('today')).toBe('today');
    expect(periodTitle('monthly', '2026-09-01')).toBe('September 2026');
    expect(periodTitle('weekly', '2026-09-14')).toMatch(/^Week of 14 Sept? 2026$/);
    expect(periodTitle('daily', '2026-09-17')).toBe('17 September 2026');
    expect(comparedTo('monthly', '2026-08-01')).toBe('vs Aug');
    expect(comparedTo('weekly', '2026-09-07')).toBe('vs last week');
    expect(bucketLabel('month', '2026-07-01')).toBe('Jul');
    expect(bucketLabel('day', '2026-09-17')).toMatch(/^17 Sept?$/);
    expect(bucketRange('week', '2026-09-14')).toMatch(/^14 Sept? – 20 Sept?$/);
    expect(bucketRange('month', '2026-09-01')).toBe('September 2026');
    expect(pctLabel(26.315789)).toBe('26.3%');
    expect(pctLabel(14.95)).toBe('15.0%');
  });
});

describe('period stepping', () => {
  it('moves to the previous and next period start', () => {
    expect(stepPeriod('monthly', '2026-09-01', -1)).toBe('2026-08-01');
    expect(stepPeriod('monthly', '2026-09-01', 1)).toBe('2026-10-01');
    expect(stepPeriod('daily', '2026-09-01', -1)).toBe('2026-08-31');
    expect(stepPeriod('weekly', '2026-09-14', 1)).toBe('2026-09-21');
  });
});

describe('links', () => {
  it('filters Activity by category and period, and maps Home periods to Insights', () => {
    expect(categoryActivityHref('abc', '2026-09-01', '2026-09-30')).toBe(
      '/activity?category=abc&from=2026-09-01&to=2026-09-30',
    );
    expect(insightsHrefFor('month')).toBe('/insights');
    expect(insightsHrefFor('week')).toBe('/insights?period=weekly');
    expect(insightsHrefFor('today')).toBe('/insights?period=daily');
  });
});

describe('chart models', () => {
  const points = seriesPoints(SERIES);

  it('C-02 average starts at the first bucket with spending (D-68)', () => {
    // (64,000 + 59,500 + 57,000) / 3 = 60,166.67 → 60,167.
    expect(trendAverage(points)).toBe(60167);
    expect(trendAverage(seriesPoints({ bucket: 'day', points: [] }))).toBe(0);
  });

  it('minimum data needs two buckets with something in them (§16.2)', () => {
    expect(hasEnoughBuckets(points, 'expenses')).toBe(true);
    expect(hasEnoughBuckets(points.slice(0, 4), 'both')).toBe(false);
  });

  it('C-01 keeps six categories and folds the rest, never more than seven slices', () => {
    const cats = [
      'Bills',
      'Food',
      'Other',
      'Transport',
      'Shopping',
      'Health',
      'Family',
      'Education',
    ].map((name, i) => ({ id: `id-${String(i)}`, name, amount: 1000 - i * 100, pct: 12.5 }));
    const slices = donutSlices(cats, () => 'cat-food');
    expect(slices).toHaveLength(7);
    expect(slices.at(-1)).toMatchObject({
      id: null,
      name: 'Other categories (2)',
      amount: 700,
      pct: 25,
      color: 'chart-axis',
    });
    expect(donutSlices(cats.slice(0, 7), () => 'cat-bills')).toHaveLength(7);
  });
});

describe('goal card mapping', () => {
  const goal = {
    id: '00000000-0000-4000-8000-000000000001',
    type: 'individual' as const,
    name: 'New Laptop',
    icon: 'laptop',
    currency: 'USD',
    target: { amount_minor: 120000, currency: 'USD', formatted: '$1,200.00' },
    balance: { amount_minor: 60000, currency: 'USD', formatted: '$600.00' },
    remaining: { amount_minor: 60000, currency: 'USD', formatted: '$600.00' },
    progress_pct: 50,
    target_date: '2026-12-31',
    days_remaining: 105,
    status: 'on_track' as const,
    completed_at: null,
    archived_at: null,
  };

  it('maps balance and target, and marks overdue only when behind and past due', () => {
    expect(goalCardData(goal, '2026-09-17')).toMatchObject({
      saved: { amountMinor: 60000 },
      target: { amountMinor: 120000 },
      progressPct: 50,
      overdue: false,
    });
    expect(
      goalCardData({ ...goal, status: 'behind', target_date: '2026-09-01' }, '2026-09-17').overdue,
    ).toBe(true);
    expect(goalCardData({ ...goal, status: 'behind' }, '2026-09-17').overdue).toBe(false);
  });
});
