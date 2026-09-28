import { z } from 'zod';
import { FxApplied, Transaction } from './transactions';
import { IsoDate, IsoTimestamp, Money, PageQuery, Paginated, Uuid } from './primitives';
import { GoalType } from './goals';

// The Activity feed (spec §10.4, SCR-12): the user's own transactions merged with the
// user's own contributions, discriminated by `kind`. Partner records never appear.

export const ActivityTransaction = Transaction.extend({
  kind: z.literal('transaction'),
  /** Sort key shared by both kinds. */
  date: IsoDate,
});

export const ActivityContribution = z.strictObject({
  kind: z.literal('contribution'),
  id: Uuid,
  date: IsoDate,
  goal: z.strictObject({ id: Uuid, name: z.string(), icon: z.string(), type: GoalType }),
  amount: Money,
  /** The user's own contribution converted to their base currency (F-03). */
  base_amount: Money,
  fx: FxApplied,
  note: z.string().nullable(),
  created_at: IsoTimestamp,
});

export const ActivityItem = z.discriminatedUnion('kind', [
  ActivityTransaction,
  ActivityContribution,
]);
export type ActivityItem = z.infer<typeof ActivityItem>;

export const ActivityQuery = PageQuery.extend({
  /** Filter chips: Income, Expense, Savings contributions (SCR-12). */
  kind: z.enum(['income', 'expense', 'contribution']).optional(),
  category_id: Uuid.optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export const ActivityResponse = Paginated(ActivityItem);
