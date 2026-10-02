import { progressPct, remainingAmount, roundPct1, sumMinor } from '@spendtogether/domain';
import type { GoalDetail, GoalSummary } from '@spendtogether/schemas';
import {
  Bike,
  Car,
  Gift,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  Laptop,
  Palmtree,
  PiggyBank,
  Plane,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { formatDay } from './format-date';
import { formatMoney, type MoneyDisplay } from './format-money';

// Display helpers for the goal screens (F9). Every metric arrives computed from the API;
// the only client-side figure is the "After this" preview, which calls packages/domain.

/** Goal icons offered by the picker (SCR-16), keyed by the API's `icon` string. */
export const GOAL_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  'piggy-bank': { Icon: PiggyBank, label: 'Savings' },
  laptop: { Icon: Laptop, label: 'Laptop' },
  smartphone: { Icon: Smartphone, label: 'Phone' },
  'shield-check': { Icon: ShieldCheck, label: 'Emergency fund' },
  palmtree: { Icon: Palmtree, label: 'Holiday' },
  plane: { Icon: Plane, label: 'Travel' },
  home: { Icon: Home, label: 'Home' },
  car: { Icon: Car, label: 'Car' },
  bike: { Icon: Bike, label: 'Bike' },
  'graduation-cap': { Icon: GraduationCap, label: 'Education' },
  gift: { Icon: Gift, label: 'Gift' },
  'heart-pulse': { Icon: HeartPulse, label: 'Health' },
  'heart-handshake': { Icon: HeartHandshake, label: 'Together' },
};

export function goalVisual(icon: string): { Icon: LucideIcon; label: string } {
  return GOAL_ICONS[icon] ?? { Icon: Sparkles, label: 'Goal' };
}

export type MoneyOf = (amountMinor: number, currency: string) => MoneyDisplay;

/** "31 Dec" for sentences; the year only when it isn't this year. */
export function shortDate(date: string, today: string | null): string {
  const withYear = today !== null && date.slice(0, 4) !== today.slice(0, 4);
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
  return parts.replace('Sept', 'Sep');
}

/**
 * The plain-language status sentence (ux-ui-specification "Goal status" microcopy).
 * Overdue shows no pace number (F-15); completed thanks rather than instructs.
 */
export function statusSentence(goal: GoalDetail, money: MoneyOf, today: string | null): string {
  const m = (minor: number) => formatMoney(money(minor, goal.currency));
  const by = shortDate(goal.target_date, today);
  const pace = goal.required_pace;
  if (goal.status === 'completed') return `Goal reached. You saved ${m(goal.target.amount_minor)}.`;
  if (pace.overdue) {
    return `This goal's date has passed. Update the date or keep saving — ${m(goal.remaining.amount_minor)} to go.`;
  }
  if (goal.status === 'on_track') {
    const projection = goal.projected_completion_date
      ? ` At your pace: done ~${shortDate(goal.projected_completion_date, today)}.`
      : '';
    return `Save ${m(pace.weekly ?? 0)}/week to finish by ${by}.${projection}`;
  }
  if (goal.status === 'at_risk') {
    return `You're a little behind. Save ${m(pace.daily ?? 0)}/day to finish by ${by}.`;
  }
  return `Saving ${m(pace.daily ?? 0)}/day from today still gets you there by ${by}.`;
}

/** F-20 in words: a date, or the phrase that replaces it (no recent contributions). */
export function projectionText(goal: GoalDetail, today: string | null): string {
  if (goal.status === 'completed') return 'Completed';
  return goal.projected_completion_date
    ? `Done around ${shortDate(goal.projected_completion_date, today)} at your current pace`
    : "No recent contributions, so we can't project a finish date yet.";
}

/** "50% · $600.00 to go · 105 days left" (W-06). */
export function heroLine(goal: GoalSummary, money: MoneyOf): string {
  const pct = progressLabel(goal.progress_pct, goal.status === 'completed');
  if (goal.status === 'completed') return `${pct} · Goal reached`;
  const days =
    goal.days_remaining === 1 ? '1 day left' : `${String(goal.days_remaining)} days left`;
  return `${pct} · ${formatMoney(money(goal.remaining.amount_minor, goal.currency))} to go · ${days}`;
}

/**
 * SCR-18 "After this": the balance and progress once a contribution of `addGoalMinor`
 * (already in goal currency) is saved, computed with the same domain functions as the
 * API (F-11, F-12, F-13), so the preview equals the post-save state.
 */
export function afterThis(
  goal: Pick<GoalSummary, 'balance' | 'target'>,
  addGoalMinor: number,
  /** Editing: the contribution's current goal amount, which the new one replaces. */
  replacesGoalMinor = 0,
): { balance: number; remaining: number; pct: number; completes: boolean } {
  const balance = sumMinor([goal.balance.amount_minor, addGoalMinor, -replacesGoalMinor]);
  const target = goal.target.amount_minor;
  return {
    balance,
    remaining: remainingAmount(target, balance),
    pct: progressPct(balance, target),
    completes: balance >= target,
  };
}

/**
 * A progress percentage for display (§6.1 rounding, one decimal). An unfinished goal never
 * reads 100%: 99.96% shows as 99.9%.
 */
export function progressLabel(pct: number, completed: boolean): string {
  const shown = roundPct1(pct);
  return `${String(!completed && shown >= 100 ? 99.9 : shown)}%`;
}

export function contributionDate(date: string): string {
  return formatDay(date, 'en-GB', true);
}
