import { describe, expect, it } from 'vitest';
import {
  allTimeZones,
  currencyForLocale,
  detectTimeZone,
  identifierError,
  identifierKind,
  normaliseIdentifier,
  passwordError,
} from './auth-input';

// F6-01/F6-08: identifier detection, the contract-backed field rules, and the SCR-07
// locale default (FR-05).

const OFFERED = [
  'USD',
  'LRD',
  'EUR',
  'GBP',
  'NGN',
  'GHS',
  'SLE',
  'KES',
  'ZAR',
  'CAD',
  'JPY',
  'KWD',
];

describe('identifier', () => {
  it.each([
    ['ada@example.com', 'email'],
    ['+231 77 012 3456', 'phone'],
    ['(231) 770-123', 'phone'],
    ['ada', 'unknown'],
    ['', 'unknown'],
  ] as const)('%s is %s', (value, kind) => {
    expect(identifierKind(value)).toBe(kind);
  });

  it('normalises phones to E.164 and emails to lower case', () => {
    expect(normaliseIdentifier(' +231 77-012 (3456) ')).toBe('+231770123456');
    expect(normaliseIdentifier(' Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('explains what is wrong, in plain words', () => {
    expect(identifierError('')).toMatch(/Enter your email or phone/);
    expect(identifierError('ada@')).toMatch(/full email address/);
    expect(identifierError('0770123456')).toMatch(/country code/);
    expect(identifierError('ada')).toMatch(/email address or a phone number/);
    expect(identifierError('ada@example.com')).toBeNull();
    expect(identifierError('+231 77 012 3456')).toBeNull();
  });
});

describe('password', () => {
  it('requires at least 10 characters', () => {
    expect(passwordError('')).toBe('Enter a password.');
    expect(passwordError('short')).toMatch(/10 characters/);
    expect(passwordError('long-enough-1')).toBeNull();
  });
});

describe('currencyForLocale (FR-05)', () => {
  it.each([
    ['en-LR', 'LRD'],
    ['en-GB', 'GBP'],
    ['fr-FR', 'EUR'],
    ['de', 'EUR'],
    ['ja', 'JPY'],
    ['en-US', 'USD'],
    ['pt-BR', 'USD'],
    ['not a locale!', 'USD'],
    [undefined, 'USD'],
  ])('%s → %s', (locale, code) => {
    expect(currencyForLocale(locale, OFFERED)).toBe(code);
  });

  it('never returns a currency that is not offered', () => {
    expect(currencyForLocale('en-LR', ['USD', 'EUR'])).toBe('USD');
    expect(currencyForLocale('en-LR', ['EUR'])).toBe('EUR');
  });
});

describe('time zone', () => {
  it('detects a zone and lists it first when unknown to the list', () => {
    expect(detectTimeZone()).toMatch(/\w/);
    expect(allTimeZones('Mars/Olympus')[0]).toBe('Mars/Olympus');
  });
});
