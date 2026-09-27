import { describe, expect, it } from 'vitest';
import { fixedClock, systemClock } from './clock';

describe('clock', () => {
  it('fixedClock returns the pinned instant every time', () => {
    const clock = fixedClock('2026-09-17T12:00:00Z');
    expect(clock.now().toISOString()).toBe('2026-09-17T12:00:00.000Z');
    expect(clock.now().getTime()).toBe(clock.now().getTime());
  });

  it('fixedClock hands out copies, so callers cannot mutate shared time', () => {
    const clock = fixedClock('2026-09-17T12:00:00Z');
    clock.now().setFullYear(2000);
    expect(clock.now().getUTCFullYear()).toBe(2026);
  });

  it('fixedClock rejects an invalid instant', () => {
    expect(() => fixedClock('not a date')).toThrow(RangeError);
  });

  it('systemClock reads real time', () => {
    expect(systemClock.now()).toBeInstanceOf(Date);
  });
});
