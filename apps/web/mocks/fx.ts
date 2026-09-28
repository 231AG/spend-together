import { convert, crossRate, rateForDate, type StoredRate } from '@spendtogether/domain';
import type { SeedRates } from './fixtures';

// Conversion exactly as the API performs it (§11.2): F-24 picks each side's USD rate for
// the record's date, F-22 crosses them, F-23 converts once. No arithmetic lives here; it
// is all packages/domain.

export interface FxApplied {
  /** Cross rate from → to, rounded to numeric(24,10) for display only. */
  rate: string;
  rateDate: string;
  estimated: boolean;
}

export type Conversion =
  | { ok: true; amountMinor: number; fx: FxApplied }
  | { ok: false; reason: 'too-small' | 'unavailable' };

export class FxTable {
  private readonly byCurrency = new Map<string, StoredRate[]>();

  constructor(sets: SeedRates[]) {
    for (const set of sets) {
      for (const [code, rate] of Object.entries(set.rates)) {
        const list = this.byCurrency.get(code) ?? [];
        list.push({ rateDate: set.rateDate, rate });
        this.byCurrency.set(code, list);
      }
    }
  }

  /** The USD-based rates in force on `date` (GET /exchange-rates). */
  ratesOn(
    date: string,
  ): { rateDate: string; estimated: boolean; rates: Record<string, string> } | null {
    const rates: Record<string, string> = {};
    let rateDate = '';
    let estimated = false;
    for (const code of this.byCurrency.keys()) {
      const r = rateForDate(code, this.byCurrency.get(code) ?? [], date);
      if (!r.ok) return null;
      rates[code] = r.value.rate.toFixed();
      if (code !== 'USD') {
        rateDate = r.value.rateDate > rateDate ? r.value.rateDate : rateDate;
        estimated ||= r.value.estimated;
      }
    }
    return rateDate === '' ? null : { rateDate, estimated, rates };
  }

  convert(input: {
    amountMinor: number;
    from: { code: string; exponent: number };
    to: { code: string; exponent: number };
    date: string;
  }): Conversion {
    const { from, to, date } = input;
    if (from.code === to.code) {
      return {
        ok: true,
        amountMinor: input.amountMinor,
        fx: { rate: '1', rateDate: date, estimated: false },
      };
    }
    const a = rateForDate(from.code, this.byCurrency.get(from.code) ?? [], date);
    const b = rateForDate(to.code, this.byCurrency.get(to.code) ?? [], date);
    if (!a.ok || !b.ok) return { ok: false, reason: 'unavailable' };
    const rate = crossRate(a.value.rate, b.value.rate);
    const result = convert({
      amountMinor: input.amountMinor,
      fromExponent: from.exponent,
      toExponent: to.exponent,
      rate,
    });
    if (!result.ok) return { ok: false, reason: 'too-small' };
    const sides = [a.value, b.value].filter((_, i) => [from.code, to.code][i] !== 'USD');
    return {
      ok: true,
      amountMinor: result.value,
      fx: {
        rate: rate.toDecimalPlaces(10).toFixed(),
        rateDate:
          sides
            .map((s) => s.rateDate)
            .sort()
            .at(-1) ?? date,
        estimated: sides.some((s) => s.estimated),
      },
    };
  }
}
