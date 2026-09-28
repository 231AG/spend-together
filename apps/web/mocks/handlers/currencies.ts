import { ApiFailure } from '../errors';
import { db } from '../db';
import { route } from '../http';

// Currencies and USD-based rates (§9.3, §11.1). F-24 selects the rates for a date.

export const currencyHandlers = [
  route('listCurrencies', () => ({
    data: db.currencies.map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      exponent: c.exponent,
      is_active: c.isActive,
    })),
  })),

  route('getExchangeRates', ({ user, query }) => {
    const date = query.date ?? db.todayFor(user);
    const found = db.fx.ratesOn(date);
    if (!found)
      throw new ApiFailure(
        'FX_UNAVAILABLE',
        'Exchange rates are unavailable right now. Try again soon.',
      );
    return {
      base: 'USD' as const,
      rate_date: found.rateDate,
      estimated: found.estimated,
      rates: found.rates,
      fetched_at: db.rateFetchedAt.get(found.rateDate) ?? db.nowIso(),
    };
  }),
];
