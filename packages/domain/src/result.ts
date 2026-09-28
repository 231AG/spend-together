// Typed results instead of exceptions (F2 plan §4). Callers must handle both branches.

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** A conversion rounded below one minor unit of the target currency (ADR-005). */
export interface AmountTooSmall {
  code: 'AMOUNT_TOO_SMALL';
}

/** No usable rate for a currency (F-24 found nothing at all). */
export interface RateUnavailable {
  code: 'RATE_UNAVAILABLE';
  currency: string;
}
