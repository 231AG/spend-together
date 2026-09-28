import type { ActivityItem } from '@spendtogether/schemas';
import { describe, expect, it } from 'vitest';
import { CURRENCIES, RATES } from '@/mocks/fixtures';
import { FxTable } from '@/mocks/fx';
import { previewConversion } from './conversion-preview';
import {
  crossRateFor,
  describeRate,
  groupByDate,
  itemHref,
  recentDistinct,
  toRowData,
  type CurrencyMeta,
} from './transactions';

// F7-03 regression (WAC-14, FR-24): the preview the form shows, built from GET
// /exchange-rates for the record's date, equals what the API stores on save, for every
// currency pair, a sweep of amounts, and dates before, on and after a rate change.

const table = new FxTable(RATES);
const meta = new Map<string, CurrencyMeta>(
  CURRENCIES.map((c) => [c.code, { code: c.code, exponent: c.exponent, symbol: c.symbol }]),
);
const codes = CURRENCIES.map((c) => c.code);
const AMOUNTS = [1, 7, 99, 100, 1234, 50_000, 500_000, 123_456_789];
const DATES = ['2026-05-20', '2026-08-20', '2026-09-14', '2026-09-15', '2026-09-17'];

describe('preview equals saved (WAC-14)', () => {
  it('matches the API conversion for every pair, amount and date', () => {
    let compared = 0;
    for (const date of DATES) {
      const rates = table.ratesOn(date)?.rates;
      for (const from of codes) {
        for (const base of codes) {
          if (from === base) continue;
          const f = meta.get(from);
          const b = meta.get(base);
          if (!f || !b) throw new Error('missing currency');
          for (const amountMinor of AMOUNTS) {
            const saved = table.convert({ amountMinor, from: f, to: b, date });
            const preview = previewConversion({
              amountMinor,
              from: f,
              base: b,
              rate: crossRateFor(rates, from, base),
            });
            if (saved.ok) {
              expect(preview).toMatchObject({
                status: 'ok',
                base: { amountMinor: saved.amountMinor },
              });
            } else {
              expect(preview.status).toBe(
                saved.reason === 'too-small' ? 'too-small' : 'unavailable',
              );
            }
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });

  it('uses the rate for the record date, not today (BR-14)', () => {
    const lrd = meta.get('LRD');
    const usd = meta.get('USD');
    if (!lrd || !usd) throw new Error('missing currency');
    const at = (date: string) =>
      previewConversion({
        amountMinor: 500_000,
        from: lrd,
        base: usd,
        rate: crossRateFor(table.ratesOn(date)?.rates, 'LRD', 'USD'),
      });
    expect(at('2026-08-20')).toMatchObject({ base: { amountMinor: 2640 } });
    expect(at('2026-09-17')).toMatchObject({ base: { amountMinor: 2630 } });
  });

  it('has no rate when rates are missing', () => {
    expect(crossRateFor(undefined, 'LRD', 'USD')).toBeNull();
    expect(crossRateFor({ EUR: '0.9' }, 'LRD', 'USD')).toBeNull();
    expect(crossRateFor({ EUR: '0.9' }, 'USD', 'EUR')).toBe('0.9');
  });
});

describe('describeRate (W-04)', () => {
  it('states the rate from the stronger unit', () => {
    const r = table.convert({
      amountMinor: 500_000,
      from: { code: 'LRD', exponent: 2 },
      to: { code: 'USD', exponent: 2 },
      date: '2026-08-20',
    });
    if (!r.ok) throw new Error('conversion failed');
    expect(describeRate(r.fx.rate, 'LRD', 'USD')).toBe('1 USD = 189.39 LRD');
    expect(describeRate('189.39', 'USD', 'LRD')).toBe('1 USD = 189.39 LRD');
    expect(describeRate('0', 'USD', 'LRD')).toBe('');
  });
});

describe('list helpers', () => {
  it('recentDistinct keeps order and stops at n', () => {
    expect(recentDistinct(['a', 'b', 'a', 'c', 'd', 'e', 'f'], (x) => x, 3)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('groupByDate keeps newest-first order', () => {
    const groups = groupByDate([
      { date: '2026-09-17' },
      { date: '2026-09-17' },
      { date: '2026-09-16' },
    ]);
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ['2026-09-17', 2],
      ['2026-09-16', 1],
    ]);
  });

  const money = (amount_minor: number, currency: string) => ({
    amount_minor,
    currency,
    formatted: '',
  });
  const fx = { rate: '1', rate_date: '2026-09-17', estimated: true };

  it('maps a foreign transaction with its base line and estimated flag', () => {
    const item: ActivityItem = {
      kind: 'transaction',
      id: '00000000-0000-4000-8000-000000000001',
      type: 'expense',
      date: '2026-09-17',
      amount: money(500_000, 'LRD'),
      base_amount: money(2630, 'USD'),
      fx,
      category: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Transport',
        icon: 'bus',
        color: 'cat-transport',
      },
      transaction_date: '2026-09-17',
      note: 'Taxi',
      created_at: '2026-09-17T12:00:00.000Z',
      updated_at: '2026-09-17T12:00:00.000Z',
    };
    const row = toRowData(item, meta);
    expect(row).toMatchObject({
      kind: 'expense',
      title: 'Transport',
      note: 'Taxi',
      estimated: true,
    });
    expect(row.base).toMatchObject({ amountMinor: 2630, currency: 'USD' });
    expect(itemHref(item, 'q=taxi')).toBe(`/activity/${item.id}?q=taxi`);
  });

  it('maps a contribution to its goal', () => {
    const item: ActivityItem = {
      kind: 'contribution',
      id: '00000000-0000-4000-8000-000000000003',
      date: '2026-09-10',
      goal: {
        id: '00000000-0000-4000-8000-000000000004',
        name: 'New Laptop',
        icon: 'laptop',
        type: 'individual',
      },
      amount: money(5000, 'USD'),
      base_amount: money(5000, 'USD'),
      fx: { ...fx, estimated: false },
      note: null,
      created_at: '2026-09-10T12:00:00.000Z',
    };
    const row = toRowData(item, meta);
    expect(row).toMatchObject({ kind: 'contribution', title: 'New Laptop' });
    expect(row.base).toBeUndefined();
    expect(itemHref(item, '')).toBe(`/goals/${item.goal.id}`);
  });
});
