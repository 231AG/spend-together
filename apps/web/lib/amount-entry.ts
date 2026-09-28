import { parseMajor } from '@spendtogether/domain';

// Locale-aware decimal entry for AmountInput (§14.3). People type either "." or "," as
// the decimal mark; group separators are not accepted while typing, so "1.250" is never
// silently read as one thousand two hundred and fifty.

export type EntryResult =
  | { kind: 'empty' }
  | { kind: 'ok'; minor: number }
  | { kind: 'too-many-decimals'; exponent: number }
  | { kind: 'invalid' };

/** Keep only characters that could form an amount, normalising the decimal mark to ".". */
export function sanitiseEntry(raw: string): string {
  let text = raw.replace(/\s/g, '').replace(',', '.');
  text = text.replace(/[^\d.]/g, '');
  const [whole = '', ...fractions] = text.split('.');
  // A decimal mark is kept even for exponent-0 currencies, so readEntry can say why the
  // amount is rejected instead of silently turning 10.5 yen into 105.
  return fractions.length > 0 ? `${whole}.${fractions.join('')}` : whole;
}

export function readEntry(text: string, exponent: number): EntryResult {
  if (text === '' || text === '.') return { kind: 'empty' };
  const fraction = text.split('.')[1] ?? '';
  if (fraction.length > exponent) return { kind: 'too-many-decimals', exponent };
  const normalised = text.startsWith('.')
    ? `0${text}`
    : text.endsWith('.')
      ? text.slice(0, -1)
      : text;
  const minor = parseMajor(normalised, exponent);
  return minor === null ? { kind: 'invalid' } : { kind: 'ok', minor };
}

/** The editable text for a stored amount: 1250 at exponent 2 -> "12.50". */
export function entryFromMinor(minor: number | null, exponent: number): string {
  if (minor === null) return '';
  if (exponent === 0) return String(minor);
  const digits = String(minor).padStart(exponent + 1, '0');
  return `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
}
