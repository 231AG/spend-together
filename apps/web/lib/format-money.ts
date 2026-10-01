import { toMajorString } from '@spendtogether/domain';

// Money display rules (spec §11.4, §17.2). Amounts arrive as integer minor units and are
// handed to Intl.NumberFormat as exact decimal strings, so no float ever touches them.
// Output is display-only: nothing may parse it back (§10.1).

/** U+2212, the typographic minus used for expenses (§17.2). */
export const MINUS = '\u2212';
/** No-break space: keeps a symbol, amount and code on one line. */
const NBSP = '\u00a0';
/** Shown beside fx_estimated amounts (§11.4). */
export const ESTIMATED_RATE_NOTE = 'Converted using the closest available rate.';

export interface MoneyDisplay {
  amountMinor: number;
  /** ISO 4217 code. */
  currency: string;
  /** From the currency list; falls back to Intl's own digits for the code. */
  exponent?: number;
  /** Seeded display symbol, e.g. "L$" for LRD; Intl's narrow symbol when absent. */
  symbol?: string;
  locale?: string;
}

export interface FormatOptions {
  /**
   * The user's base currency. Any other currency always shows its ISO code, because a
   * symbol alone is ambiguous ($ is both USD and LRD).
   */
  baseCurrency?: string;
  /** `income` prefixes +, `expense` prefixes − (U+2212); `auto` signs negatives only. */
  sign?: 'auto' | 'income' | 'expense';
}

const DEFAULT_LOCALE = 'en-US';

function digitsFor(currency: string, locale: string): number {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits as number;
}

/**
 * Format one amount, e.g. `$26.40`, `−$12.00`, `L$5,000.00 LRD`, `¥1,000 JPY`,
 * `KWD 1.234`. Never truncated: long values wrap in the component (§17.4).
 */
export function formatMoney(money: MoneyDisplay, options: FormatOptions = {}): string {
  const locale = money.locale ?? DEFAULT_LOCALE;
  const exponent = money.exponent ?? digitsFor(money.currency, locale);
  const negative = money.amountMinor < 0;
  const magnitude = toMajorString(Math.abs(money.amountMinor), exponent);
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).formatToParts(magnitude as Intl.StringNumericLiteral);

  let text = parts
    .map((p) => (p.type === 'currency' && money.symbol ? money.symbol : p.value))
    .join('');
  const showsCode = parts.some((p) => p.type === 'currency' && p.value === money.currency);
  if (options.baseCurrency !== undefined && money.currency !== options.baseCurrency && !showsCode) {
    text = `${text}${NBSP}${money.currency}`;
  }

  const sign = options.sign ?? 'auto';
  if (sign === 'income' && money.amountMinor !== 0) return `+${text}`;
  if (sign === 'expense' && money.amountMinor !== 0) return `${MINUS}${text}`;
  return negative ? `${MINUS}${text}` : text;
}

/** The secondary "≈ base amount" line under a non-base amount (§11.4). */
export function formatApprox(base: MoneyDisplay): string {
  return `\u2248${NBSP}${formatMoney(base)}`;
}

/** "This month · USD": totals are labelled with the base code once per card (§11.4). */
export function totalsLabel(periodLabel: string, baseCurrency: string): string {
  return `${periodLabel} · ${baseCurrency}`;
}

/**
 * Axis ticks: "$600" for whole amounts, "$0.75" otherwise — never rounded, so small
 * scales can't show duplicate or misleading ticks. Display only.
 */
export function formatAxisMoney(money: MoneyDisplay): string {
  const locale = money.locale ?? DEFAULT_LOCALE;
  const exponent = money.exponent ?? digitsFor(money.currency, locale);
  const major = toMajorString(Math.abs(money.amountMinor), exponent);
  const whole = Math.abs(money.amountMinor) % 10 ** exponent === 0;
  const text = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: whole ? 0 : exponent,
    maximumFractionDigits: whole ? 0 : exponent,
  })
    .formatToParts(major as Intl.StringNumericLiteral)
    .map((p) => (p.type === 'currency' && money.symbol ? money.symbol : p.value))
    .join('');
  return money.amountMinor < 0 ? `${MINUS}${text}` : text;
}
