import { describe, expect, it } from 'vitest';
import { ESTIMATED_RATE_NOTE, MINUS, formatApprox, formatMoney, totalsLabel } from './format-money';

// F3-05: spec §11.4 display rules for base, non-base, exponent-0 and exponent-3 amounts.

const base = { baseCurrency: 'USD' };

describe('formatMoney', () => {
  it('base amounts use the symbol alone', () => {
    expect(formatMoney({ amountMinor: 2640, currency: 'USD' }, base)).toBe('$26.40');
  });

  it('non-base amounts always carry the ISO code (T-11 pair: L$ 5,000.00 LRD / $26.40)', () => {
    const lrd = formatMoney({ amountMinor: 500000, currency: 'LRD', symbol: 'L$' }, base);
    expect(lrd).toBe('L$5,000.00\u00a0LRD');
    expect(formatApprox({ amountMinor: 2640, currency: 'USD' })).toBe('≈\u00a0$26.40');
  });

  it('JPY (exponent 0) has no decimals; KWD (exponent 3) has three', () => {
    expect(formatMoney({ amountMinor: 1000, currency: 'JPY', exponent: 0 }, base)).toBe(
      '¥1,000\u00a0JPY',
    );
    expect(formatMoney({ amountMinor: 1234, currency: 'KWD', exponent: 3 }, base)).toBe(
      'KWD\u00a01.234',
    );
  });

  it('falls back to Intl digits when no exponent is given', () => {
    expect(formatMoney({ amountMinor: 1234, currency: 'KWD' })).toBe('KWD\u00a01.234');
  });

  it('signs income with + and expenses and negatives with U+2212', () => {
    expect(formatMoney({ amountMinor: 1200, currency: 'USD' }, { sign: 'expense' })).toBe(
      `${MINUS}$12.00`,
    );
    expect(formatMoney({ amountMinor: 1200, currency: 'USD' }, { sign: 'income' })).toBe('+$12.00');
    expect(formatMoney({ amountMinor: -5000, currency: 'USD' })).toBe(`${MINUS}$50.00`);
    expect(formatMoney({ amountMinor: 0, currency: 'USD' }, { sign: 'expense' })).toBe('$0.00');
  });

  it('is exact beyond float precision', () => {
    expect(formatMoney({ amountMinor: Number.MAX_SAFE_INTEGER, currency: 'USD' })).toBe(
      '$90,071,992,547,409.91',
    );
  });

  it('respects the locale', () => {
    expect(formatMoney({ amountMinor: 123456, currency: 'EUR', locale: 'de-DE' })).toBe(
      '1.234,56\u00a0€',
    );
  });

  it('labels totals with the base code once', () => {
    expect(totalsLabel('This month', 'USD')).toBe('This month · USD');
    expect(ESTIMATED_RATE_NOTE).toMatch(/closest available rate/);
  });
});
