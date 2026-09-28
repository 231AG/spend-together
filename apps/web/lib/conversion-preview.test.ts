import { describe, expect, it } from 'vitest';
import { previewConversion, tooSmallMessage } from './conversion-preview';

const USD = { code: 'USD', exponent: 2 };
const LRD = { code: 'LRD', exponent: 2, symbol: 'L$' };

describe('conversion preview (WAC-14, ADR-005)', () => {
  it('T-11: 5,000 LRD previews as 26.40 USD, the value the server will store', () => {
    expect(
      previewConversion({
        amountMinor: 500000,
        from: LRD,
        base: USD,
        rate: '0.005280110887586462',
      }),
    ).toEqual({
      status: 'ok',
      estimated: false,
      base: { amountMinor: 2640, currency: 'USD', exponent: 2 },
    });
  });

  it('0.01 LRD is too small to record in USD', () => {
    expect(previewConversion({ amountMinor: 1, from: LRD, base: USD, rate: '0.0052801' })).toEqual({
      status: 'too-small',
      baseCurrency: 'USD',
    });
    expect(tooSmallMessage('USD')).toBe(
      'This amount is too small to record in USD. Enter a larger amount.',
    );
  });

  it('same currency needs no preview; a missing rate says so', () => {
    expect(previewConversion({ amountMinor: 100, from: USD, base: USD, rate: '1' })).toEqual({
      status: 'same',
    });
    expect(previewConversion({ amountMinor: 100, from: LRD, base: USD, rate: null })).toEqual({
      status: 'unavailable',
      baseCurrency: 'USD',
    });
  });

  it('carries the estimated flag and the base symbol', () => {
    const r = previewConversion({
      amountMinor: 100,
      from: USD,
      base: LRD,
      rate: '189.39',
      estimated: true,
    });
    expect(r).toEqual({
      status: 'ok',
      estimated: true,
      base: { amountMinor: 18939, currency: 'LRD', exponent: 2, symbol: 'L$' },
    });
  });
});
