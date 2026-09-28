import { Decimal, roundHalfAwayFromZero, type MoneyMinor } from './money';
import type { IsoDate } from './period';
import { err, ok, type AmountTooSmall, type RateUnavailable, type Result } from './result';

// Currency formulas F-22…F-24 (spec §6.6). Rates are USD-based decimal strings
// ("1 USD = rate QUOTE"), stored as numeric(24,10) and multiplied with decimal.js only.

/** One stored daily rate for a quote currency. */
export interface StoredRate {
  rateDate: IsoDate;
  /** Decimal string; never parsed as a float. */
  rate: string;
}

export interface SelectedRate {
  rateDate: IsoDate;
  rate: Decimal;
  /** True when no rate existed on or before the date and the earliest was used. */
  estimated: boolean;
}

/**
 * F-24: the latest rate dated on or before `date`; before the first stored rate, the
 * earliest one flagged `estimated`. USD against itself is always exactly 1.
 */
export function rateForDate(
  currency: string,
  rates: readonly StoredRate[],
  date: IsoDate,
): Result<SelectedRate, RateUnavailable> {
  if (currency === 'USD') return ok({ rateDate: date, rate: new Decimal(1), estimated: false });
  const sorted = [...rates].sort((a, b) => a.rateDate.localeCompare(b.rateDate));
  const [earliest] = sorted;
  if (!earliest) return err({ code: 'RATE_UNAVAILABLE', currency });
  const onOrBefore = sorted.filter((r) => r.rateDate <= date).at(-1);
  const chosen = onOrBefore ?? earliest;
  return ok({
    rateDate: chosen.rateDate,
    rate: new Decimal(chosen.rate),
    estimated: onOrBefore === undefined,
  });
}

/** F-22: rate(USD→to) ÷ rate(USD→from); 1 when the currencies match. */
export function crossRate(from: Decimal, to: Decimal): Decimal {
  return to.dividedBy(from);
}

/**
 * F-23: round_half_away(amount ÷ 10^expFrom × rate × 10^expTo), rounded once. A positive
 * amount that rounds to 0 is `AmountTooSmall` (ADR-005): never a throw, never a stored 0.
 */
export function convert(input: {
  amountMinor: number;
  fromExponent: number;
  toExponent: number;
  rate: Decimal;
}): Result<MoneyMinor, AmountTooSmall> {
  const converted = roundHalfAwayFromZero(
    new Decimal(input.amountMinor)
      .dividedBy(new Decimal(10).pow(input.fromExponent))
      .times(input.rate)
      .times(new Decimal(10).pow(input.toExponent)),
  );
  if (converted === 0 && input.amountMinor !== 0) return err({ code: 'AMOUNT_TOO_SMALL' });
  return ok(converted);
}
