import { z } from 'zod';
import { CurrencyCode, DecimalString, IsoDate, ListOf } from './primitives';

// Currencies and daily USD-based rates (spec §9.3, §11). Rates are decimal strings.

export const Currency = z.strictObject({
  code: CurrencyCode,
  name: z.string(),
  symbol: z.string(),
  /** ISO 4217 exponent: USD 2, JPY 0, KWD 3. */
  exponent: z.int().min(0).max(4),
  is_active: z.boolean(),
});
export type Currency = z.infer<typeof Currency>;

export const ListCurrenciesResponse = ListOf(Currency);

export const ExchangeRatesQuery = z.strictObject({ date: IsoDate.optional() });

export const ExchangeRatesResponse = z.strictObject({
  base: z.literal('USD'),
  /** The stored date actually used (F-24: latest rate on or before the requested date). */
  rate_date: IsoDate,
  /** True when no rate existed on or before the date and the earliest one was used (F-24). */
  estimated: z.boolean(),
  /** 1 USD = rate QUOTE. */
  rates: z.record(CurrencyCode, DecimalString),
  /** When the rates were last fetched ("Rates last updated …", §11.1). */
  fetched_at: z.iso.datetime(),
});
export type ExchangeRatesResponse = z.infer<typeof ExchangeRatesResponse>;
