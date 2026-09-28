import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  daysElapsed,
  isInPeriod,
  localDate,
  periodContaining,
  periodLength,
  previousPeriod,
} from '../src';

describe('period boundaries (F2-02, BR-16)', () => {
  it('a day is its own period', () => {
    expect(periodContaining('day', '2026-09-17')).toEqual({
      type: 'day',
      start: '2026-09-17',
      end: '2026-09-17',
    });
  });

  it('months have their calendar length, including February and December', () => {
    expect(periodContaining('month', '2026-02-10').end).toBe('2026-02-28');
    expect(periodContaining('month', '2028-02-10').end).toBe('2028-02-29');
    expect(periodContaining('month', '2026-12-31')).toEqual({
      type: 'month',
      start: '2026-12-01',
      end: '2026-12-31',
    });
  });

  it('ISO weeks span a year boundary', () => {
    expect(periodContaining('week', '2027-01-01')).toEqual({
      type: 'week',
      start: '2026-12-28',
      end: '2027-01-03',
    });
  });

  it('previous periods', () => {
    expect(previousPeriod(periodContaining('month', '2026-03-15')).start).toBe('2026-02-01');
    expect(previousPeriod(periodContaining('week', '2026-09-17')).start).toBe('2026-09-07');
    expect(previousPeriod(periodContaining('day', '2026-01-01')).start).toBe('2025-12-31');
  });

  it('membership is inclusive at both ends', () => {
    const p = periodContaining('month', '2026-09-17');
    expect(isInPeriod('2026-09-01', p)).toBe(true);
    expect(isInPeriod('2026-09-30', p)).toBe(true);
    expect(isInPeriod('2026-10-01', p)).toBe(false);
    expect(isInPeriod('2026-08-31', p)).toBe(false);
  });

  it('day arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-07-01', '2026-12-31')).toBe(183);
    expect(daysBetween('2026-09-17', '2026-09-16')).toBe(-1);
    expect(periodLength(periodContaining('week', '2026-09-17'))).toBe(7);
  });

  it('daysElapsed is at least 1 and never exceeds the period', () => {
    const p = periodContaining('month', '2026-09-17');
    expect(daysElapsed(p, '2026-09-01')).toBe(1);
    expect(daysElapsed(p, '2026-08-20')).toBe(1);
    expect(daysElapsed(p, '2026-10-05')).toBe(30);
  });

  it('localDate across DST in a zone that observes it', () => {
    expect(localDate(new Date('2026-03-29T00:30:00Z'), 'Europe/London')).toBe('2026-03-29');
    expect(localDate(new Date('2026-10-25T23:30:00Z'), 'Europe/London')).toBe('2026-10-25');
  });

  it('rejects a malformed date', () => {
    expect(() => addDays('2026-9-1', 1)).toThrow(RangeError);
  });
});
