import { describe, expect, it } from 'vitest';
import { dayOf } from './couple';

describe('dayOf (F10 self-audit)', () => {
  it('shows an instant as the day in the viewer’s time zone, not its UTC date', () => {
    expect(dayOf('2026-09-23T18:00:00.000Z', 'Africa/Monrovia')).toBe('23 September 2026');
    expect(dayOf('2026-09-23T18:00:00.000Z', 'Pacific/Auckland')).toBe('24 September 2026');
  });
});
