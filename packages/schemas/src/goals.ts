import { z } from 'zod';
import {
  CurrencyCode,
  IsoDate,
  IsoTimestamp,
  ListOf,
  Money,
  NonNegativeMinor,
  PositiveMinor,
  Uuid,
  notBefore,
} from './primitives';

// Savings goals (spec §10.3, §10.5, §6.3, §6.4, BR-03, BR-04, BR-10, BR-11, BR-15).
// Every computed field comes from packages/domain; the wire only carries results.

export const GoalType = z.enum(['individual', 'couple']);

/** F-19. `behind` also covers overdue goals; `required_pace.overdue` says which. */
export const GoalStatus = z.enum(['on_track', 'at_risk', 'behind', 'completed']);

/** F-15..F-17 in goal-currency minor units. All three are null once the goal is overdue. */
export const RequiredPace = z.strictObject({
  daily: NonNegativeMinor.nullable(),
  weekly: NonNegativeMinor.nullable(),
  monthly: NonNegativeMinor.nullable(),
  overdue: z.boolean(),
});

/** F-21 for couple goals. Names only: never either partner's other finances (BR-05). */
export const Contributor = z.strictObject({
  user_id: Uuid,
  name: z.string(),
  /** Total contributed, in goal currency. */
  amount: Money,
  /** Share of the balance, full precision; round to one decimal for display (§6.1). */
  share_pct: z.number().min(0).max(100),
});

/** Goal detail with every computed metric, fields in the §10.5 order (SCR-17). */
export const GoalDetail = z.strictObject({
  id: Uuid,
  type: GoalType,
  name: z.string(),
  icon: z.string(),
  /** Set at creation and immutable (BR-15). */
  currency: CurrencyCode,
  target: Money,
  /** F-11. */
  balance: Money,
  /** F-12. */
  remaining: Money,
  /** F-13, 0..100. */
  progress_pct: z.number().min(0).max(100),
  target_date: IsoDate,
  /** F-14. */
  days_remaining: z.int().nonnegative(),
  required_pace: RequiredPace,
  /** F-18, goal-currency minor units per day. */
  current_pace_daily: NonNegativeMinor,
  /** F-20. Null when there are no recent contributions. */
  projected_completion_date: IsoDate.nullable(),
  status: GoalStatus,
  /** F-21 for couple goals; null for individual goals. */
  contributors: z.array(Contributor).nullable(),
  completed_at: IsoTimestamp.nullable(),
  /** Set when the couple ends (BR-18); the goal is then read-only. */
  archived_at: IsoTimestamp.nullable(),
});
export type GoalDetail = z.infer<typeof GoalDetail>;

/** A goal card in lists (SCR-15) and the Home preview: detail without the pace analysis. */
export const GoalSummary = GoalDetail.omit({
  required_pace: true,
  current_pace_daily: true,
  projected_completion_date: true,
  contributors: true,
});
export type GoalSummary = z.infer<typeof GoalSummary>;

export const ListGoalsQuery = z.strictObject({
  scope: z.enum(['mine', 'ours', 'all']).default('all'),
  /** Completed goals are excluded unless requested (SCR-15 collapses them). */
  include: z.literal('completed').optional(),
});
export const ListGoalsResponse = ListOf(GoalSummary);

export const CreateGoalRequest = z.strictObject({
  type: GoalType,
  name: z.string().trim().min(1).max(60),
  target_amount_minor: PositiveMinor,
  /** Defaults to the creator's base currency when omitted (BR-15). */
  currency: CurrencyCode.optional(),
  target_date: IsoDate,
  icon: z.string().min(1).optional(),
});
/** Also enforces BR-10: the target date is today or later. */
export const createGoalRequestFor = (today: IsoDate) =>
  notBefore(CreateGoalRequest, 'target_date', today);

/** Strict: `currency` is not accepted, because it is immutable (BR-15). */
export const PatchGoalRequest = z
  .strictObject({
    name: z.string().trim().min(1).max(60),
    target_amount_minor: PositiveMinor,
    target_date: IsoDate,
    icon: z.string().min(1),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Change at least one field.');
