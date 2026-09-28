import { z } from 'zod';
import { CurrencyCode, IsoDate, NonNegativeMinor, Uuid } from './primitives';

// Period insights (spec §16.3, §6.2). Every amount is in the user's base currency, as
// plain minor units under a single top-level `currency`.

export const PeriodType = z.enum(['daily', 'weekly', 'monthly']);

export const Period = z.strictObject({
  type: PeriodType,
  start: IsoDate,
  end: IsoDate,
  /** Days of the period elapsed so far, including today (F-07). */
  days_elapsed: z.int().positive(),
});

export const Totals = z.strictObject({
  income: NonNegativeMinor,
  expenses: NonNegativeMinor,
  /** F-03: the user's own contributions, converted to base. */
  saved: NonNegativeMinor,
  /** F-05, may be negative. */
  net: z.int(),
  /** F-04, may be negative ("Overspent"). */
  remaining: z.int(),
  /** F-06; null means N/A because income is 0 (AC05). May exceed 100. */
  savings_rate_pct: z.number().nullable(),
  /** F-07. */
  avg_daily_spending: NonNegativeMinor,
});

export const PreviousTotals = z.strictObject({
  income: NonNegativeMinor,
  expenses: NonNegativeMinor,
  saved: NonNegativeMinor,
  savings_rate_pct: z.number().nullable(),
});

/** F-10. Null when the previous value was 0: the UI shows "New" instead of a percentage. */
export const Change = z.strictObject({
  income: z.number().nullable(),
  expenses: z.number().nullable(),
  saved: z.number().nullable(),
  /** Percentage-point difference; null when either rate is N/A. */
  savings_rate_pts: z.number().nullable(),
});

/** F-08 and F-09, expenses only, sorted by amount descending. */
export const CategoryShare = z.strictObject({
  id: Uuid,
  name: z.string(),
  amount: NonNegativeMinor,
  pct: z.number().min(0).max(100),
});

export const SeriesPoint = z.strictObject({
  start: IsoDate,
  income: NonNegativeMinor,
  expenses: NonNegativeMinor,
});

export const Series = z.strictObject({
  bucket: z.enum(['day', 'week', 'month']),
  points: z.array(SeriesPoint),
});

export const InsightsQuery = z.strictObject({
  /** Anchors the period; defaults to today in the user's time zone. */
  date: IsoDate.optional(),
});

export const InsightsParams = z.strictObject({ period: PeriodType });

export const InsightsResponse = z.strictObject({
  period: Period,
  currency: CurrencyCode,
  totals: Totals,
  previous: PreviousTotals,
  change_pct: Change,
  categories: z.array(CategoryShare),
  series: Series,
});
export type InsightsResponse = z.infer<typeof InsightsResponse>;
