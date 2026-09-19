/**
 * The injectable clock.
 *
 * Every period boundary in this product is a calendar period in the *user's*
 * IANA timezone (BR-16), and "today" decides which records fall inside it. That
 * makes time a dependency, not an ambient fact — so it is injected, and tests
 * pin it.
 *
 * This is the ONLY module permitted to read the real clock. The `clockRules`
 * lint rule in @spendtogether/config enforces that everywhere else.
 */
export type Clock = { now: () => Date };

/**
 * The real clock. Used in production; never in a test.
 * The `web` ESLint config exempts this file — and only this file — from the
 * ambient-clock rule, so the exemption lives in configuration rather than in a
 * disable comment that could be copied elsewhere.
 */
export const systemClock: Clock = { now: () => new Date() };

/** A clock frozen at a fixed instant. */
export function fixedClock(instant: Date | string): Clock {
  const frozen = typeof instant === 'string' ? new Date(instant) : instant;
  return { now: () => new Date(frozen.getTime()) };
}

/**
 * The instant every fixture and test is pinned to: the specification's own
 * reference date (spec 6.5). Pinning here makes the worked examples in 6.5,
 * 10.5, 16.3 and wireframes W-01..W-09 reproduce verbatim.
 */
export const REFERENCE_INSTANT = '2026-09-17T12:00:00.000Z';

/** The clock used by fixtures and tests. */
export const referenceClock: Clock = fixedClock(REFERENCE_INSTANT);
