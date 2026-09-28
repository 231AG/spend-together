import { Decimal, roundHalfAwayFromZero, sumMinor, type MoneyMinor } from './money';
import { addDays, daysBetween, type IsoDate } from './period';

// Goal calculations F-11…F-21 (spec §6.3, §6.4), in goal-currency minor units. The
// balance is always derived from contributions, never stored (BR-08).

export interface GoalContribution {
  date: IsoDate;
  contributorId: string;
  goalAmountMinor: number;
}

export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';

/** F-19 thresholds, read from `app_config` by the caller and never hard-coded here. */
export interface StatusThresholds {
  onTrackMin: number;
  atRiskMin: number;
}

/** F-11. */
export function goalBalance(contributions: readonly GoalContribution[]): MoneyMinor {
  return sumMinor(contributions.map((c) => c.goalAmountMinor));
}

/** F-12. */
export function remainingAmount(target: number, balance: number): MoneyMinor {
  return sumMinor([Math.max(target - balance, 0)]);
}

/** F-13, full precision, capped at 100 (T-05). Targets are positive (BR-07). */
export function progressPct(balance: number, target: number): number {
  return Decimal.min(new Decimal(balance).dividedBy(target).times(100), 100).toNumber();
}

/** F-14, whole days in the user's time zone. */
export function daysRemaining(targetDate: IsoDate, today: IsoDate): number {
  return Math.max(daysBetween(today, targetDate), 0);
}

export interface RequiredPace {
  daily: MoneyMinor | null;
  weekly: MoneyMinor | null;
  monthly: MoneyMinor | null;
  overdue: boolean;
}

/**
 * F-15…F-17 (ADR-004). The daily quotient keeps full precision; weekly and monthly derive
 * from it, and each of the three is rounded exactly once. On the target date the divisor
 * is 1 (T-06); after it, the goal is overdue and has no pace (T-07). A completed goal is
 * never overdue: it needs nothing more.
 */
export function requiredPace(input: {
  remaining: number;
  targetDate: IsoDate;
  today: IsoDate;
}): RequiredPace {
  if (input.today > input.targetDate && input.remaining > 0) {
    return { daily: null, weekly: null, monthly: null, overdue: true };
  }
  const daily = new Decimal(input.remaining).dividedBy(
    Math.max(daysRemaining(input.targetDate, input.today), 1),
  );
  return {
    daily: roundHalfAwayFromZero(daily),
    weekly: roundHalfAwayFromZero(daily.times(7)),
    monthly: roundHalfAwayFromZero(daily.times('30.4375')),
    overdue: false,
  };
}

/**
 * F-18: contributions dated in the last 30 days (today and the 29 before) divided by
 * min(30, goal age in days), at least 1. The age counts the creation day, so a goal
 * created today has age 1. F-18 is normative; the §10.5 payload value is illustrative
 * (Q9). Unrounded: F-20 divides by it; round with `roundHalfAwayFromZero` for display.
 */
export function currentPaceDaily(input: {
  contributions: readonly GoalContribution[];
  createdDate: IsoDate;
  today: IsoDate;
}): Decimal {
  const windowStart = addDays(input.today, -29);
  const recent = sumMinor(
    input.contributions
      .filter((c) => c.date >= windowStart && c.date <= input.today)
      .map((c) => c.goalAmountMinor),
  );
  const age = daysBetween(input.createdDate, input.today) + 1;
  return new Decimal(recent).dividedBy(Math.max(Math.min(30, age), 1));
}

/** F-20: null means "No recent contributions" (or nothing left to save). */
export function projectedCompletion(input: {
  remaining: number;
  paceDaily: Decimal;
  today: IsoDate;
}): IsoDate | null {
  if (input.remaining === 0 || input.paceDaily.isZero()) return null;
  const days = new Decimal(input.remaining).dividedBy(input.paceDaily).ceil().toNumber();
  return addDays(input.today, days);
}

/** Expected-balance inputs for F-19, exposed so the §6.5 status check can be shown. */
export function expectedBalance(input: {
  target: number;
  createdDate: IsoDate;
  targetDate: IsoDate;
  today: IsoDate;
}): Decimal {
  const elapsed = Math.max(daysBetween(input.createdDate, input.today), 0);
  const total = Math.max(daysBetween(input.createdDate, input.targetDate), 1);
  return new Decimal(input.target).times(Decimal.min(new Decimal(elapsed).dividedBy(total), 1));
}

/** F-19 by the expected-balance method (§6.4). Completion precedes overdue. */
export function goalStatus(input: {
  balance: number;
  target: number;
  createdDate: IsoDate;
  targetDate: IsoDate;
  today: IsoDate;
  thresholds: StatusThresholds;
}): GoalStatus {
  if (input.balance >= input.target) return 'completed';
  if (input.today > input.targetDate) return 'behind';
  const expected = expectedBalance(input);
  const ratio = expected.isZero() ? new Decimal(1) : new Decimal(input.balance).dividedBy(expected);
  if (ratio.greaterThanOrEqualTo(input.thresholds.onTrackMin)) return 'on_track';
  if (ratio.greaterThanOrEqualTo(input.thresholds.atRiskMin)) return 'at_risk';
  return 'behind';
}

export interface ContributorShare {
  contributorId: string;
  amount: MoneyMinor;
  /** F-21, full precision. */
  sharePct: number;
}

/** F-21, in first-contribution order. Empty when the goal has no contributions. */
export function contributorShares(contributions: readonly GoalContribution[]): ContributorShare[] {
  const byContributor = new Map<string, number[]>();
  for (const c of contributions) {
    const amounts = byContributor.get(c.contributorId) ?? [];
    amounts.push(c.goalAmountMinor);
    byContributor.set(c.contributorId, amounts);
  }
  const balance = goalBalance(contributions);
  return [...byContributor].map(([contributorId, amounts]) => {
    const amount = sumMinor(amounts);
    return {
      contributorId,
      amount,
      sharePct: new Decimal(amount).dividedBy(balance).times(100).toNumber(),
    };
  });
}
