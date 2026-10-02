import type { GoalDetail } from '@spendtogether/schemas';
import { describe, expect, it } from 'vitest';
import { celebrate, celebrationFor, clearCelebration, subscribeCelebration } from './celebration';
import {
  afterThis,
  heroLine,
  progressLabel,
  projectionText,
  shortDate,
  statusSentence,
} from './goals';

// F9 display helpers against §6.5's New Laptop (target $1,200, balance $600, due 31 Dec,
// 105 days left, required $5.71/day, $40.00/week, $173.93/month) and the microcopy table.

const usd = (amountMinor: number, currency: string) => ({
  amountMinor,
  currency,
  exponent: 2,
  symbol: '$',
});
const m = (minor: number) => ({ amount_minor: minor, currency: 'USD', formatted: '' });

const LAPTOP: GoalDetail = {
  id: '00000000-0000-4000-8000-000000000001',
  type: 'individual',
  name: 'New Laptop',
  icon: 'laptop',
  currency: 'USD',
  target: m(120000),
  balance: m(60000),
  remaining: m(60000),
  progress_pct: 50,
  target_date: '2026-12-31',
  days_remaining: 105,
  required_pace: { daily: 571, weekly: 4000, monthly: 17393, overdue: false },
  current_pace_daily: 652,
  projected_completion_date: '2026-12-08',
  status: 'on_track',
  contributors: null,
  completed_at: null,
  archived_at: null,
};
const TODAY = '2026-09-17';

describe('statusSentence (one per status, plain language)', () => {
  it('on track names the weekly pace, the date and the projection', () => {
    expect(statusSentence(LAPTOP, usd, TODAY)).toBe(
      'Save $40.00/week to finish by 31 Dec. At your pace: done ~8 Dec.',
    );
  });
  it('at risk and behind name the daily pace', () => {
    expect(statusSentence({ ...LAPTOP, status: 'at_risk' }, usd, TODAY)).toBe(
      "You're a little behind. Save $5.71/day to finish by 31 Dec.",
    );
    expect(statusSentence({ ...LAPTOP, status: 'behind' }, usd, TODAY)).toBe(
      'Saving $5.71/day from today still gets you there by 31 Dec.',
    );
  });
  it('overdue has no pace number (F-15)', () => {
    const overdue = {
      ...LAPTOP,
      status: 'behind' as const,
      required_pace: { daily: null, weekly: null, monthly: null, overdue: true },
    };
    const text = statusSentence(overdue, usd, TODAY);
    expect(text).toBe(
      "This goal's date has passed. Update the date or keep saving — $600.00 to go.",
    );
    expect(text).not.toMatch(/\/day|\/week/);
  });
  it('completed thanks rather than instructs', () => {
    expect(statusSentence({ ...LAPTOP, status: 'completed' }, usd, TODAY)).toBe(
      'Goal reached. You saved $1,200.00.',
    );
  });
});

describe('projection and hero', () => {
  it('replaces the date when there are no recent contributions (F-20)', () => {
    expect(projectionText(LAPTOP, TODAY)).toBe('Done around 8 Dec at your current pace');
    expect(projectionText({ ...LAPTOP, projected_completion_date: null }, TODAY)).toBe(
      "No recent contributions, so we can't project a finish date yet.",
    );
  });
  it('reads "50% · $600.00 to go · 105 days left" (W-06)', () => {
    expect(heroLine(LAPTOP, usd)).toBe('50% · $600.00 to go · 105 days left');
    expect(heroLine({ ...LAPTOP, days_remaining: 1 }, usd)).toContain('1 day left');
    // Overdue: never "0 days left".
    expect(heroLine({ ...LAPTOP, days_remaining: 0 }, usd, true)).toBe(
      '50% · $600.00 to go · Overdue',
    );
  });
  it('shows the year only when it differs', () => {
    expect(shortDate('2026-12-31', TODAY)).toBe('31 Dec');
    expect(shortDate('2027-01-31', TODAY)).toBe('31 Jan 2027');
  });
  it('never reads 100% before completion', () => {
    expect(progressLabel(99.96, false)).toBe('99.9%');
    expect(progressLabel(100, true)).toBe('100%');
    expect(progressLabel(54.166, false)).toBe('54.2%');
  });
});

describe('afterThis (SCR-18 preview == post-save state)', () => {
  it('adds the goal-currency amount with the domain formulas', () => {
    expect(afterThis(LAPTOP, 5000)).toEqual({
      balance: 65000,
      remaining: 55000,
      pct: 54.166666666666664,
      completes: false,
    });
    expect(afterThis(LAPTOP, 60000)).toMatchObject({
      balance: 120000,
      remaining: 0,
      pct: 100,
      completes: true,
    });
    expect(afterThis(LAPTOP, 90000)).toMatchObject({ pct: 100, remaining: 0, completes: true });
  });
  it('editing replaces the old amount rather than adding to it', () => {
    expect(afterThis(LAPTOP, 3000, 10000)).toMatchObject({ balance: 53000, completes: false });
  });
});

describe('celebration scoping (F9-11)', () => {
  it('belongs to the screens open at completion, not to a later visit', () => {
    const open = {};
    const unsubscribe = subscribeCelebration(open, 'goal-1', () => undefined);
    celebrate('goal-1', 'c-1');
    expect(celebrationFor(open)).toEqual({ goalId: 'goal-1', contributionId: 'c-1' });
    const revisit = {};
    subscribeCelebration(revisit, 'goal-1', () => undefined);
    expect(celebrationFor(revisit)).toBeNull();
    clearCelebration();
    expect(celebrationFor(open)).toBeNull();
    unsubscribe();
  });

  it('with no goal screen open (full-page contribute), the next one claims it once', () => {
    celebrate('goal-2', 'c-2');
    const other = {};
    subscribeCelebration(other, 'goal-9', () => undefined);
    expect(celebrationFor(other)).toBeNull();
    const next = {};
    subscribeCelebration(next, 'goal-2', () => undefined);
    expect(celebrationFor(next)).toEqual({ goalId: 'goal-2', contributionId: 'c-2' });
    const later = {};
    subscribeCelebration(later, 'goal-2', () => undefined);
    expect(celebrationFor(later)).toBeNull();
    clearCelebration();
  });
});
