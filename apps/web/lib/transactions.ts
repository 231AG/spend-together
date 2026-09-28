import { crossRate, Decimal } from '@spendtogether/domain';
import type { ActivityItem } from '@spendtogether/schemas';
import type { TransactionRowData } from '@/components/ui/transaction-row';
import type { MoneyDisplay } from './format-money';

// Pure helpers for the transaction screens (F7). Arithmetic on money or rates stays in
// packages/domain; this module only picks inputs and shapes display data.

export interface CurrencyMeta {
  code: string;
  exponent: number;
  symbol: string;
}

type Lookup = ReadonlyMap<string, CurrencyMeta>;

/**
 * The F-22 cross rate from `from` to `base`, from one day's USD-based rates, as the
 * server computes it (each side's rate for the record's date). Null when either is
 * missing.
 */
export function crossRateFor(
  rates: Readonly<Record<string, string>> | undefined,
  from: string,
  base: string,
): string | null {
  if (!rates) return null;
  const usd = (code: string) => (code === 'USD' ? (rates[code] ?? '1') : rates[code]);
  const a = usd(from);
  const b = usd(base);
  if (a === undefined || b === undefined) return null;
  return crossRate(new Decimal(a), new Decimal(b)).toFixed();
}

/**
 * "1 USD = 189.39 LRD": the stored cross rate (original → base), stated from the side
 * whose unit is worth more so the number reads naturally (W-04). Display only.
 */
export function describeRate(rate: string, original: string, base: string): string {
  const r = new Decimal(rate);
  if (r.isZero()) return '';
  const show = (d: Decimal) => d.toDecimalPlaces(4).toString();
  return r.lessThan(1)
    ? `1 ${base} = ${show(new Decimal(1).dividedBy(r))} ${original}`
    : `1 ${original} = ${show(r)} ${base}`;
}

/** The first `n` distinct values in list order ("last five used", SCR-11). */
export function recentDistinct<T>(items: readonly T[], pick: (item: T) => string, n = 5): string[] {
  const out: string[] = [];
  for (const item of items) {
    const v = pick(item);
    if (!out.includes(v)) out.push(v);
    if (out.length === n) break;
  }
  return out;
}

export function display(
  money: { amount_minor: number; currency: string },
  lookup: Lookup,
): MoneyDisplay {
  const meta = lookup.get(money.currency);
  return {
    amountMinor: money.amount_minor,
    currency: money.currency,
    ...(meta ? { exponent: meta.exponent, symbol: meta.symbol } : {}),
  };
}

/** An Activity item as a TransactionRow (§14.3): the base line only for non-base amounts. */
export function toRowData(item: ActivityItem, lookup: Lookup): TransactionRowData {
  const foreign = item.amount.currency !== item.base_amount.currency;
  const common = {
    amount: display(item.amount, lookup),
    ...(foreign ? { base: display(item.base_amount, lookup) } : {}),
    ...(foreign && item.fx.estimated ? { estimated: true } : {}),
    date: item.date,
    ...(item.note ? { note: item.note } : {}),
  };
  if (item.kind === 'contribution') {
    return { ...common, kind: 'contribution', title: item.goal.name };
  }
  return {
    ...common,
    kind: item.type,
    title: item.category.name,
    category: { icon: item.category.icon, color: item.category.color },
  };
}

/** Where a row opens: a transaction's details, or the goal a contribution belongs to. */
export function itemHref(item: ActivityItem, search: string): string {
  if (item.kind === 'contribution') return `/goals/${item.goal.id}`;
  return `/activity/${item.id}${search ? `?${search}` : ''}`;
}

/** Group items (already newest first) into date sections, keeping order. */
export function groupByDate<T extends { date: string }>(
  items: readonly T[],
): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}
