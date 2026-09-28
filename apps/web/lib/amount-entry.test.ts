import { describe, expect, it } from 'vitest';
import { entryFromMinor, readEntry, sanitiseEntry } from './amount-entry';

describe('amount entry (F3-07)', () => {
  it('accepts either decimal mark and drops everything else', () => {
    expect(sanitiseEntry('12,50')).toBe('12.50');
    expect(sanitiseEntry(' 1 2.5x ')).toBe('12.5');
    expect(sanitiseEntry('1.2.3')).toBe('1.23');
  });

  it('reads minor units by exponent', () => {
    expect(readEntry('12.5', 2)).toEqual({ kind: 'ok', minor: 1250 });
    expect(readEntry('.5', 2)).toEqual({ kind: 'ok', minor: 50 });
    expect(readEntry('7.', 2)).toEqual({ kind: 'ok', minor: 700 });
    expect(readEntry('1000', 0)).toEqual({ kind: 'ok', minor: 1000 });
    expect(readEntry('1.234', 3)).toEqual({ kind: 'ok', minor: 1234 });
    expect(readEntry('', 2)).toEqual({ kind: 'empty' });
    expect(readEntry('.', 2)).toEqual({ kind: 'empty' });
  });

  it('rejects decimals beyond the exponent, including any for yen', () => {
    expect(readEntry('10.5', 0)).toEqual({ kind: 'too-many-decimals', exponent: 0 });
    expect(readEntry('1.234', 2)).toEqual({ kind: 'too-many-decimals', exponent: 2 });
  });

  it('round-trips stored amounts', () => {
    expect(entryFromMinor(1250, 2)).toBe('12.50');
    expect(entryFromMinor(5, 2)).toBe('0.05');
    expect(entryFromMinor(1234, 3)).toBe('1.234');
    expect(entryFromMinor(1000, 0)).toBe('1000');
    expect(entryFromMinor(null, 2)).toBe('');
  });
});
