// MUST produce no errors under any of the three rules.
import type { Clock } from './clock-type';

export function totalMinor(parts: readonly number[]): number {
  return parts.reduce((sum, part) => sum + part, 0);
}

export function today(clock: Clock): Date {
  return clock.now();
}

export const parsed: number = Number.parseInt('1250', 10);
