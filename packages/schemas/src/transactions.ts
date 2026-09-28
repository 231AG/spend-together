import { z } from 'zod';
import {
  CategoryRef,
  CurrencyCode,
  DecimalString,
  IsoDate,
  IsoTimestamp,
  Money,
  PageQuery,
  Paginated,
  PositiveMinor,
  Uuid,
  notAfter,
} from './primitives';

// Transactions (spec §10.3, §11.2, BR-01, BR-07, BR-09, BR-13, BR-14). The server
// converts every amount to the owner's base currency at the rate for its own date.

export const TransactionType = z.enum(['income', 'expense']);

/** The rate locked onto a record (BR-14). */
export const FxApplied = z.strictObject({
  /** Original currency -> base currency. */
  rate: DecimalString,
  rate_date: IsoDate,
  /** "Converted using the closest available rate" (§11.4, F-24). */
  estimated: z.boolean(),
});

export const Transaction = z.strictObject({
  id: Uuid,
  type: TransactionType,
  /** Original amount and currency as entered (BR-13). */
  amount: Money,
  /** Converted into the owner's base currency (§11.2). */
  base_amount: Money,
  fx: FxApplied,
  category: CategoryRef,
  transaction_date: IsoDate,
  note: z.string().nullable(),
  created_at: IsoTimestamp,
  updated_at: IsoTimestamp,
});
export type Transaction = z.infer<typeof Transaction>;

export const ListTransactionsQuery = PageQuery.extend({
  type: TransactionType.optional(),
  category_id: Uuid.optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  /** Free-text search over notes and category names. */
  q: z.string().trim().min(1).max(100).optional(),
  currency: CurrencyCode.optional(),
});
export const ListTransactionsResponse = Paginated(Transaction);

const TransactionFields = z.strictObject({
  type: TransactionType,
  amount_minor: PositiveMinor,
  currency: CurrencyCode,
  category_id: Uuid,
  transaction_date: IsoDate,
  note: z.string().max(280).optional(),
});

/**
 * Create body. `id` may be supplied by the client so an offline entry keeps its identity
 * across retries. Shape only; use `createTransactionRequestFor(today)` to also enforce
 * BR-09 (no future dates, in the user's time zone).
 */
export const CreateTransactionRequest = TransactionFields.extend({ id: Uuid.optional() });
export const createTransactionRequestFor = (today: IsoDate) =>
  notAfter(CreateTransactionRequest, 'transaction_date', today);

/** Any subset of fields. Changing amount, currency or date re-converts (§10.3). */
export const PatchTransactionRequest = TransactionFields.partial().refine(
  (v) => Object.keys(v).length > 0,
  'Change at least one field.',
);
export const patchTransactionRequestFor = (today: IsoDate) =>
  notAfter(TransactionFields.partial(), 'transaction_date', today).refine(
    (v) => Object.keys(v).length > 0,
    'Change at least one field.',
  );

/** Soft delete: the record can be restored until `undo_until` (§7.4, ADR-003). */
export const DeleteTransactionResponse = z.strictObject({ undo_until: IsoTimestamp });
