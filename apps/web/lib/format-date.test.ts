import { describe, expect, it } from 'vitest';
import { formatDay, formatShortDate } from './format-date';

describe('format-date', () => {
  it('formats calendar dates without shifting the day', () => {
    expect(formatDay('2026-09-17')).toBe('17 September');
    expect(formatDay('2026-09-17', 'en-GB', true)).toBe('17 September 2026');
    expect(formatShortDate('2026-12-31')).toBe('31 Dec 2026');
  });
});
