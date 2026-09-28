// The mock's deterministic clock (F4-03, open-questions Q8). Pinned to the spec's
// reference instant so every worked example (§6.5, §10.5, §16.3) reproduces verbatim.
// The scenario switcher can move it to test period rollovers.

export const PINNED_NOW = '2026-09-17T12:00:00.000Z';

let current = new Date(PINNED_NOW).getTime();

export const mockClock = {
  now(): Date {
    return new Date(current);
  },
  set(iso: string): void {
    current = new Date(iso).getTime();
  },
  advance(ms: number): void {
    current += ms;
  },
  reset(): void {
    current = new Date(PINNED_NOW).getTime();
  },
};
