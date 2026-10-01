import {
  addDays,
  bucketAverage,
  foldCategoryShares,
  periodContaining,
  previousPeriod,
  requiredPace,
  roundPct1,
  type PeriodType,
} from '@spendtogether/domain';
import type { GoalSummary, InsightsResponse } from '@spendtogether/schemas';
import type { GoalCardData } from '@/components/ui/goal-card';
import type { MoneyDisplay } from './format-money';

// Display helpers for Home and Insights (F8). Labels, links and period stepping only:
// every figure arrives computed from the API (packages/domain on the server side).

export type HomePeriod = 'today' | 'week' | 'month';
export type InsightsPeriod = 'daily' | 'weekly' | 'monthly';

const DOMAIN: Record<InsightsPeriod, PeriodType> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(utc(date));

/** "Remaining this month", "Remaining today". */
export function periodPhrase(period: HomePeriod): string {
  return period === 'today' ? 'today' : `this ${period}`;
}

/** The date stepper's label: "September 2026", "Week of 14 Sep 2026", "17 September 2026". */
export function periodTitle(type: InsightsPeriod, start: string): string {
  if (type === 'monthly') return fmt(start, { month: 'long', year: 'numeric' });
  if (type === 'weekly')
    return `Week of ${fmt(start, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return fmt(start, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "vs Aug", "vs last week", "vs yesterday" for delta chips (C-06). */
export function comparedTo(type: InsightsPeriod, previousStart: string): string {
  if (type === 'monthly') return `vs ${fmt(previousStart, { month: 'short' })}`;
  return type === 'weekly' ? 'vs last week' : 'vs previous day';
}

/** A chart bucket's short label: "Jul", "14 Sep" (week starting / day). */
export function bucketLabel(bucket: 'day' | 'week' | 'month', start: string): string {
  return bucket === 'month'
    ? fmt(start, { month: 'short' })
    : fmt(start, { day: 'numeric', month: 'short' });
}

/** A bucket's full date range for tooltips and tables (§16.2: "date range"). */
export function bucketRange(bucket: 'day' | 'week' | 'month', start: string): string {
  if (bucket === 'day') return fmt(start, { weekday: 'short', day: 'numeric', month: 'short' });
  if (bucket === 'month') return fmt(start, { month: 'long', year: 'numeric' });
  return `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(addDays(start, 6), { day: 'numeric', month: 'short' })}`;
}

/** The anchor date of the period before / after the one starting at `start`. */
export function stepPeriod(type: InsightsPeriod, start: string, direction: -1 | 1): string {
  const current = periodContaining(DOMAIN[type], start);
  if (direction === -1) return previousPeriod(current).start;
  return addDays(current.end, 1);
}

/** Whether the period starting at `start` contains (or is after) today. */
export function isLatestPeriod(type: InsightsPeriod, start: string, today: string | null): boolean {
  return today === null || periodContaining(DOMAIN[type], start).end >= today;
}

/** Activity filtered by category and the period's dates (SCR-08 "Tap category"). */
export function categoryActivityHref(categoryId: string, start: string, end: string): string {
  const q = new URLSearchParams({ category: categoryId, from: start, to: end });
  return `/activity?${q.toString()}`;
}

/** Insights for the matching period (SCR-08 "Tap metric"). */
export function insightsHrefFor(period: HomePeriod): string {
  const map: Record<HomePeriod, InsightsPeriod> = {
    today: 'daily',
    week: 'weekly',
    month: 'monthly',
  };
  return map[period] === 'monthly' ? '/insights' : `/insights?period=${map[period]}`;
}

export function money(
  amountMinor: number,
  currency: string,
  meta?: { exponent: number; symbol: string },
): MoneyDisplay {
  return {
    amountMinor,
    currency,
    ...(meta ? { exponent: meta.exponent, symbol: meta.symbol } : {}),
  };
}

/** A goal summary as a compact GoalCard (Home preview). */
export function goalCardData(
  goal: GoalSummary,
  today: string | null,
  meta?: { exponent: number; symbol: string },
): GoalCardData {
  return {
    name: goal.name,
    type: goal.type,
    saved: money(goal.balance.amount_minor, goal.currency, meta),
    target: money(goal.target.amount_minor, goal.currency, meta),
    progressPct: goal.progress_pct,
    targetDate: goal.target_date,
    status: goal.status,
    // F-15's overdue rule, from packages/domain.
    overdue:
      today !== null &&
      requiredPace({ remaining: goal.remaining.amount_minor, targetDate: goal.target_date, today })
        .overdue,
  };
}

/** "26.3%": display rounding only, one decimal, ties away from zero (§6.1). */
export function pctLabel(pct: number): string {
  return `${roundPct1(pct).toFixed(1)}%`;
}

// ---------------------------------------------------------------- chart models (F8-08…10)
// Everything a chart draws, prepared once from the API response. Chart components only
// render; any aggregate comes from packages/domain (D-68, D-69).

export interface BucketPoint {
  start: string;
  label: string;
  range: string;
  income: number;
  expenses: number;
}

export function seriesPoints(series: InsightsResponse['series']): BucketPoint[] {
  return series.points.map((p) => ({
    start: p.start,
    label: bucketLabel(series.bucket, p.start),
    range: bucketRange(series.bucket, p.start),
    income: p.income,
    expenses: p.expenses,
  }));
}

/** §16.2 minimum data: at least two buckets must hold something. */
export function hasEnoughBuckets(
  points: readonly BucketPoint[],
  key: 'expenses' | 'both',
): boolean {
  const withData = points.filter((p) =>
    key === 'expenses' ? p.expenses > 0 : p.expenses > 0 || p.income > 0,
  );
  return withData.length >= 2;
}

/** C-02: the dashed line, from packages/domain (D-68). */
export function trendAverage(points: readonly BucketPoint[]): number {
  return bucketAverage(points.map((p) => p.expenses));
}

export function perBucket(bucket: 'day' | 'week' | 'month'): string {
  return bucket === 'day' ? '/day' : bucket === 'week' ? '/week' : '/month';
}

export interface DonutSlice {
  id: string | null;
  name: string;
  amount: number;
  pct: number;
  color: string;
}

/** C-01: top six plus one "Other categories" bucket, never more than seven slices. */
export function donutSlices(
  categories: InsightsResponse['categories'],
  colorOf: (id: string) => string,
): DonutSlice[] {
  const { kept, rest } = foldCategoryShares(categories, 6);
  const slices: DonutSlice[] = kept.map((c) => ({
    id: c.id,
    name: c.name,
    amount: c.amount,
    pct: c.pct,
    color: colorOf(c.id),
  }));
  if (rest) {
    slices.push({
      id: null,
      name: `Other categories (${String(rest.count)})`,
      amount: rest.amount,
      pct: rest.pct,
      // Not cat-other: a real "Other" category may already be a slice (D-69).
      color: 'chart-axis',
    });
  }
  return slices;
}
