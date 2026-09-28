import { z } from 'zod';
import { ActivityItem } from './activity';
import { GoalSummary } from './goals';
import { CategoryShare, Period, Totals } from './insights';
import { CurrencyCode } from './primitives';

// Home dashboard in one round trip (spec §10.4, SCR-08).

export const HomeSummaryQuery = z.strictObject({
  period: z.enum(['today', 'week', 'month']).default('month'),
});

export const HomeSummaryResponse = z.strictObject({
  period: Period,
  currency: CurrencyCode,
  totals: Totals,
  /** Top five expense categories (SCR-08). */
  categories: z.array(CategoryShare).max(5),
  /** Up to three active goals. */
  goals: z.array(GoalSummary).max(3),
  /** Up to five latest own records (shown on desktop). */
  recent: z.array(ActivityItem).max(5),
});
export type HomeSummaryResponse = z.infer<typeof HomeSummaryResponse>;
