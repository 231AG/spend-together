// Calendar periods in the user's IANA time zone (BR-16). Records are dated with local
// calendar dates (IsoDate); this module decides which period a date belongs to. Only
// `localDate` touches time zones; everything else is pure calendar arithmetic.

/** `YYYY-MM-DD`. */
export type IsoDate = string;
export type PeriodType = 'day' | 'week' | 'month';

export interface Period {
  type: PeriodType;
  start: IsoDate;
  /** Inclusive. */
  end: IsoDate;
}

const MS_PER_DAY = 86_400_000;

function toUtcMs(date: IsoDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Not an ISO date: ${date}`);
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The local calendar date of an instant in an IANA time zone (T-13). */
export function localDate(instant: Date, timeZone: string): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** The day, ISO week (Monday to Sunday, T-14) or calendar month containing `anchor`. */
export function periodContaining(type: PeriodType, anchor: IsoDate): Period {
  if (type === 'day') return { type, start: anchor, end: anchor };
  if (type === 'week') {
    const weekday = new Date(toUtcMs(anchor)).getUTCDay(); // 0 = Sunday
    const start = addDays(anchor, -((weekday + 6) % 7));
    return { type, start, end: addDays(start, 6) };
  }
  const start = `${anchor.slice(0, 7)}-01`;
  const nextMonth = new Date(toUtcMs(start));
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { type, start, end: addDays(fromUtcMs(nextMonth.getTime()), -1) };
}

/** The period immediately before `period`, for F-10 comparisons. */
export function previousPeriod(period: Period): Period {
  return periodContaining(period.type, addDays(period.start, -1));
}

export function isInPeriod(date: IsoDate, period: Period): boolean {
  return date >= period.start && date <= period.end;
}

/** Calendar length of the period in days. */
export function periodLength(period: Period): number {
  return daysBetween(period.start, period.end) + 1;
}

/**
 * F-07's divisor D: the full length for a completed period, days elapsed including today
 * for the current one (T-15). Always at least 1, so it is safe to divide by.
 */
export function daysElapsed(period: Period, today: IsoDate): number {
  if (today > period.end) return periodLength(period);
  return Math.max(daysBetween(period.start, today) + 1, 1);
}
