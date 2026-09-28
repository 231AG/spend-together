import { convert, Decimal } from '@spendtogether/domain';
import type { MoneyDisplay } from './format-money';

// The live "≈ base" preview under an amount in another currency (§11.4, WAC-14). It uses
// the same domain `convert` the server uses, so the preview equals the saved value.

export interface CurrencyInfo {
  code: string;
  exponent: number;
  symbol?: string;
}

export type ConversionPreview =
  | { status: 'same' }
  | { status: 'ok'; base: MoneyDisplay; estimated: boolean }
  | { status: 'too-small'; baseCurrency: string }
  | { status: 'unavailable'; baseCurrency: string };

/**
 * `rate` is the F-22 cross rate from `from` to `base` as a decimal string, or null when no
 * rate is known yet.
 */
export function previewConversion(input: {
  amountMinor: number;
  from: CurrencyInfo;
  base: CurrencyInfo;
  rate: string | null;
  estimated?: boolean;
}): ConversionPreview {
  if (input.from.code === input.base.code) return { status: 'same' };
  if (input.rate === null) return { status: 'unavailable', baseCurrency: input.base.code };
  const result = convert({
    amountMinor: input.amountMinor,
    fromExponent: input.from.exponent,
    toExponent: input.base.exponent,
    rate: new Decimal(input.rate),
  });
  if (!result.ok) return { status: 'too-small', baseCurrency: input.base.code };
  return {
    status: 'ok',
    estimated: input.estimated ?? false,
    base: {
      amountMinor: result.value,
      currency: input.base.code,
      exponent: input.base.exponent,
      ...(input.base.symbol ? { symbol: input.base.symbol } : {}),
    },
  };
}

/** ADR-005's copy, shown before Save and returned by the API as the field error. */
export function tooSmallMessage(baseCurrency: string): string {
  return `This amount is too small to record in ${baseCurrency}. Enter a larger amount.`;
}
