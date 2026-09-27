import { z } from 'zod';
import {
  CurrencyCode,
  IsoDate,
  IsoTimestamp,
  Money,
  PageQuery,
  Paginated,
  PositiveMinor,
  Uuid,
  notAfter,
} from './primitives';
import { FxApplied } from './transactions';

// Goal contributions (spec §10.3, §10.4, §11.2, BR-02, BR-04, BR-09). A contribution is a
// savings event, never an expense.

/**
 * One contribution as the goal's viewers see it: contributor name plus the amount in its
 * original and goal currency (§10.3). The contributor's base-currency figure is not on
 * the wire here, so a partner never sees the other's base currency or totals (BR-05).
 */
export const Contribution = z.strictObject({
  id: Uuid,
  goal_id: Uuid,
  contributor: z.strictObject({ user_id: Uuid, name: z.string() }),
  /** True when the signed-in user made it; only those can be edited or deleted. */
  is_own: z.boolean(),
  amount: Money,
  goal_amount: Money,
  fx: FxApplied,
  contribution_date: IsoDate,
  note: z.string().nullable(),
  created_at: IsoTimestamp,
  updated_at: IsoTimestamp,
});
export type Contribution = z.infer<typeof Contribution>;

export const GoalIdParams = z.strictObject({ id: Uuid });
export const ContributionParams = z.strictObject({ id: Uuid, cid: Uuid });

export const ListContributionsQuery = PageQuery;
export const ListContributionsResponse = Paginated(Contribution);

const ContributionFields = z.strictObject({
  amount_minor: PositiveMinor,
  /** Defaults to the goal currency in the UI (SCR-18); any supported currency is allowed. */
  currency: CurrencyCode,
  contribution_date: IsoDate,
  note: z.string().max(280).optional(),
});

/** Idempotent create; `id` may be client-supplied for offline entries. */
export const CreateContributionRequest = ContributionFields.extend({ id: Uuid.optional() });
export const createContributionRequestFor = (today: IsoDate) =>
  notAfter(CreateContributionRequest, 'contribution_date', today);

export const PatchContributionRequest = ContributionFields.partial().refine(
  (v) => Object.keys(v).length > 0,
  'Change at least one field.',
);
