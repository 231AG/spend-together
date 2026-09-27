import { describe, expect, it } from 'vitest';
import { DecimalString, Money, Paginated, SignedMoney, notAfter, IsoDate } from '../src/primitives';
import { z } from 'zod';

describe('Money (§10.1)', () => {
  it.each([
    ['USD, exponent 2', { amount_minor: 1250, currency: 'USD', formatted: '$12.50' }],
    ['JPY, exponent 0', { amount_minor: 1250, currency: 'JPY', formatted: '¥1,250' }],
    ['KWD, exponent 3', { amount_minor: 1250, currency: 'KWD', formatted: 'KWD 1.250' }],
  ])('round-trips %s unchanged', (_label, money) => {
    expect(Money.parse(money)).toEqual(money);
  });

  it('rejects a negative amount', () => {
    expect(
      Money.safeParse({ amount_minor: -1, currency: 'USD', formatted: '-$0.01' }).success,
    ).toBe(false);
  });

  it('rejects a fractional amount (money is integer minor units)', () => {
    expect(
      Money.safeParse({ amount_minor: 12.5, currency: 'USD', formatted: '$0.125' }).success,
    ).toBe(false);
  });

  it('rejects a lowercase or long currency code', () => {
    expect(Money.safeParse({ amount_minor: 1, currency: 'usd', formatted: '' }).success).toBe(
      false,
    );
    expect(Money.safeParse({ amount_minor: 1, currency: 'USDT', formatted: '' }).success).toBe(
      false,
    );
  });

  it('SignedMoney allows the negative cash-flow figures (F-04, F-05)', () => {
    expect(
      SignedMoney.parse({ amount_minor: -500, currency: 'USD', formatted: '−$5.00' }).amount_minor,
    ).toBe(-500);
  });
});

describe('DecimalString (exchange rates)', () => {
  it('accepts exact decimals and rejects floats, exponents and signs', () => {
    expect(DecimalString.safeParse('182.4050000000').success).toBe(true);
    expect(DecimalString.safeParse('1').success).toBe(true);
    expect(DecimalString.safeParse(182.405).success).toBe(false);
    expect(DecimalString.safeParse('1e5').success).toBe(false);
    expect(DecimalString.safeParse('-1.5').success).toBe(false);
  });
});

describe('Paginated', () => {
  it('requires next_cursor, null on the last page', () => {
    const page = Paginated(z.string());
    expect(page.parse({ data: ['a'], next_cursor: null })).toEqual({
      data: ['a'],
      next_cursor: null,
    });
    expect(page.safeParse({ data: [] }).success).toBe(false);
  });
});

describe('notAfter (BR-09)', () => {
  const schema = notAfter(z.strictObject({ d: IsoDate }), 'd', '2026-09-17');
  it('accepts today and the past, rejects tomorrow', () => {
    expect(schema.safeParse({ d: '2026-09-17' }).success).toBe(true);
    expect(schema.safeParse({ d: '2025-01-01' }).success).toBe(true);
    const future = schema.safeParse({ d: '2026-09-18' });
    expect(future.success).toBe(false);
    expect(future.error?.issues[0]?.path).toEqual(['d']);
  });
});
