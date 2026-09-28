// Calendar dates (`YYYY-MM-DD`) for display. They are dates, not instants, so they are
// formatted in UTC to avoid shifting a day in the viewer's zone.

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** "17 September" (or "17 September 2025" when `withYear`). */
export function formatDay(date: string, locale = 'en-GB', withYear = false): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(toUtc(date));
}

/** "17 Sep 2026", for compact dates such as a goal's target. */
export function formatShortDate(date: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtc(date));
}
