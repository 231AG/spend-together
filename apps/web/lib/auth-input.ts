import { Email, Password, Phone } from '@spendtogether/schemas';

// Pure helpers for the auth and setup screens (F6). The schemas are the contract's own,
// so the UI validates exactly what the API will.

export type IdentifierKind = 'email' | 'phone' | 'unknown';

/** SCR-04 "auto-detects format": an @ means email; a leading + or digit means phone. */
export function identifierKind(value: string): IdentifierKind {
  const v = value.trim();
  if (v.includes('@')) return 'email';
  if (/^\+?[\d\s()-]+$/.test(v) && /\d/.test(v)) return 'phone';
  return 'unknown';
}

/** Phone numbers are sent in E.164: spaces, dashes and brackets are removed. */
export function normaliseIdentifier(value: string): string {
  const v = value.trim();
  return identifierKind(v) === 'phone' ? v.replace(/[\s()-]/g, '') : v.toLowerCase();
}

export function identifierError(value: string): string | null {
  const v = normaliseIdentifier(value);
  if (v === '') return 'Enter your email or phone number.';
  const kind = identifierKind(v);
  if (kind === 'email')
    return Email.safeParse(v).success ? null : 'Enter a full email address, like name@example.com.';
  if (kind === 'phone') {
    return Phone.safeParse(v).success
      ? null
      : 'Enter the number with its country code, like +231 77 012 3456.';
  }
  return 'Enter an email address or a phone number with its country code.';
}

export function passwordError(value: string): string | null {
  if (value === '') return 'Enter a password.';
  return Password.safeParse(value).success ? null : 'Use at least 10 characters.';
}

export const PASSWORD_MIN = 10;

// ------------------------------------------------------------------ SCR-07 defaults

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  LR: 'LRD',
  GB: 'GBP',
  NG: 'NGN',
  GH: 'GHS',
  SL: 'SLE',
  KE: 'KES',
  ZA: 'ZAR',
  CA: 'CAD',
  JP: 'JPY',
  KW: 'KWD',
};
const EURO_REGIONS = new Set([
  'AT',
  'BE',
  'HR',
  'CY',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PT',
  'SK',
  'SI',
  'ES',
]);

/**
 * FR-05: pre-select the base currency from the browser locale ("en-LR" → LRD). Falls back
 * to USD, and only returns a currency that is offered.
 */
export function currencyForLocale(locale: string | undefined, offered: readonly string[]): string {
  const fallback = offered.includes('USD') ? 'USD' : (offered[0] ?? 'USD');
  if (!locale) return fallback;
  let region: string | undefined;
  try {
    region = new Intl.Locale(locale).maximize().region;
  } catch {
    return fallback;
  }
  if (!region) return fallback;
  const code = EURO_REGIONS.has(region) ? 'EUR' : REGION_CURRENCY[region];
  return code && offered.includes(code) ? code : fallback;
}

/** The device's IANA time zone, or UTC when it can't be detected (never blocks Continue). */
export function detectTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Every IANA zone the browser knows, for the Change control. */
export function allTimeZones(current: string): string[] {
  let zones: string[];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = [];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}
