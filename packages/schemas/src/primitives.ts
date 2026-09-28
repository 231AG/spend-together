import { z } from 'zod';

// Wire primitives shared by every resource (spec §10.1, §6.1). Field names are
// snake_case; dates are ISO 8601; money is integer minor units, never a float.

/** An integer amount in minor units (cents, fils, yen). Branded so a plain number cannot pose as money. */
export const MoneyMinor = z.int().brand<'MoneyMinor'>();
export type MoneyMinor = z.infer<typeof MoneyMinor>;

/** A stored amount: BR-07 says every recorded amount is positive; derived amounts may be 0. */
export const NonNegativeMinor = z.int().nonnegative();

/** A user-entered amount: must be greater than 0 (BR-07). */
export const PositiveMinor = z.int().positive();

/** ISO 4217 alphabetic code, e.g. "USD", "LRD", "JPY", "KWD". */
export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter ISO 4217 code.');
export type CurrencyCode = z.infer<typeof CurrencyCode>;

/** Calendar date `YYYY-MM-DD` (no time, no zone). */
export const IsoDate = z.iso.date();
export type IsoDate = z.infer<typeof IsoDate>;

/** UTC timestamp ending in `Z`. */
export const IsoTimestamp = z.iso.datetime();
export type IsoTimestamp = z.infer<typeof IsoTimestamp>;

export const Uuid = z.uuid();

/**
 * An exact decimal carried as a string, used for exchange rates (§6.1 stores them as
 * numeric(24,10) and multiplies them with decimal.js). Never parse it with parseFloat.
 */
export const DecimalString = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,10})?$/, 'Expected a decimal string.');
export type DecimalString = z.infer<typeof DecimalString>;

/**
 * The money object (§10.1). `formatted` is display-only: clients never parse it.
 * `amount_minor` is never negative for stored or target amounts.
 */
export const Money = z.strictObject({
  amount_minor: NonNegativeMinor,
  currency: CurrencyCode,
  /** Display string produced by the server with Intl.NumberFormat. Never parse it. */
  formatted: z.string(),
});
export type Money = z.infer<typeof Money>;

/** Money that may be negative: only derived cash-flow figures (F-04 remaining, F-05 net). */
export const SignedMoney = Money.extend({ amount_minor: z.int() });
export type SignedMoney = z.infer<typeof SignedMoney>;

/** Opaque pagination cursor (§10.1). Clients pass it back unchanged. */
export const Cursor = z.string().min(1);

/** Query parameters for any cursor-paginated list. */
export const PageQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: Cursor.optional(),
});

/** `{data: [], next_cursor}` (§10.1). `next_cursor` is null on the last page. */
export const Paginated = <T extends z.ZodType>(item: T) =>
  z.strictObject({ data: z.array(item), next_cursor: Cursor.nullable() });

/** `{data: []}` for small, unpaginated lists. */
export const ListOf = <T extends z.ZodType>(item: T) => z.strictObject({ data: z.array(item) });

/** Path parameter `:id`. */
export const IdParams = z.strictObject({ id: Uuid });

/** A reference to a category, embedded wherever a row needs its icon and label. */
export const CategoryRef = z.strictObject({
  id: Uuid,
  name: z.string(),
  icon: z.string(),
  color: z.string(),
});

/**
 * Refine an object schema so `field` (an ISO date) is not after `today` (BR-09). The
 * schemas package never reads the clock: the caller passes the user's local date.
 */
export function notAfter<T extends z.ZodObject>(
  schema: T,
  field: keyof z.infer<T> & string,
  today: IsoDate,
) {
  return schema.refine(
    (v) =>
      (v as Record<string, unknown>)[field] === undefined ||
      String((v as Record<string, unknown>)[field]) <= today,
    {
      path: [field],
      message: 'This date is in the future. Choose today or an earlier date.',
    },
  );
}

/** Refine so `field` is today or later (BR-10, goal target dates). */
export function notBefore<T extends z.ZodObject>(
  schema: T,
  field: keyof z.infer<T> & string,
  today: IsoDate,
) {
  return schema.refine(
    (v) =>
      (v as Record<string, unknown>)[field] === undefined ||
      String((v as Record<string, unknown>)[field]) >= today,
    {
      path: [field],
      message: 'Choose today or a later date.',
    },
  );
}

/** Empty body for endpoints that answer 204 No Content. */
export const NoContent = z.null();
