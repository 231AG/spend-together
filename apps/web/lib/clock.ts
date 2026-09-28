// The only module allowed to read the wall clock (enforced by the no-ambient-date lint
// rule). Everything that needs "now" takes a Clock, so tests can pin time.

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** A clock frozen at one instant. Throws on an unparseable instant rather than returning Invalid Date. */
export function fixedClock(instant: Date | string): Clock {
  const ms = new Date(instant).getTime();
  if (Number.isNaN(ms)) throw new RangeError(`fixedClock: invalid instant "${String(instant)}"`);
  return { now: () => new Date(ms) };
}

// The clock the app reads for "today". In mock mode the mock API runs on its own pinned
// clock (F4-03), so the mock installs that clock here at start-up and the UI and the API
// agree on what "today" is; in live mode it is the system clock (D-59).
let current: Clock = systemClock;

export const appClock: Clock = {
  now: () => current.now(),
};

export function setAppClock(clock: Clock): void {
  current = clock;
}
