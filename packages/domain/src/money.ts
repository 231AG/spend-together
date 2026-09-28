import DecimalBase from 'decimal.js';

// Money is integer minor units (spec §6.1). This module is the only place that turns
// fractional values into minor units, and it rounds half away from zero exactly once.

/**
 * Decimal configured for money work: 40 significant digits comfortably covers
 * numeric(24,10) rates times any realistic amount, and ROUND_HALF_UP in decimal.js
 * rounds ties away from zero (so -2.5 -> -3), which is what §6.1 requires.
 */
export const Decimal = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

/** An integer amount in minor units. Construct with `minor()`; never from a float. */
export type MoneyMinor = number & { readonly __brand: 'MoneyMinor' };

/** Brand an integer as minor units. Throws on a fraction or an unsafe integer: that is a bug. */
export function minor(value: number): MoneyMinor {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not an integer minor amount: ${value}`);
  // `+ 0` folds -0 into 0: a rounded -0.4 is zero, not negative zero.
  return (value + 0) as MoneyMinor;
}

/** Round a decimal to an integer, ties away from zero (2.5 -> 3, -2.5 -> -3). */
export function roundHalfAwayFromZero(value: Decimal | number | string): MoneyMinor {
  return minor(new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber());
}

/** Sum already-rounded amounts. Aggregates never re-convert (§6.1). */
export function sumMinor(values: readonly number[]): MoneyMinor {
  return minor(values.reduce((total, v) => total + v, 0));
}

/**
 * Parse a user-entered decimal string ("12.5", "1,250.75" is not accepted) into minor
 * units for a currency exponent. Returns null when the input is not a plain decimal or
 * has more fraction digits than the currency allows.
 */
export function parseMajor(input: string, exponent: number): MoneyMinor | null {
  const text = input.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const fraction = text.split('.')[1] ?? '';
  if (fraction.length > exponent) return null;
  return minor(new Decimal(text).times(new Decimal(10).pow(exponent)).toNumber());
}

/** Minor units to an exact major-unit decimal string, e.g. (1250, 2) -> "12.50". */
export function toMajorString(amount: number, exponent: number): string {
  return new Decimal(amount).dividedBy(new Decimal(10).pow(exponent)).toFixed(exponent);
}
