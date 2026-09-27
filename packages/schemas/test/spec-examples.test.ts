import { describe, expect, it } from 'vitest';
import { GoalDetail, PatchGoalRequest } from '../src/goals';
import { InsightsResponse } from '../src/insights';
import goalDetail from './fixtures/spec-10-5-goal-detail.json';
import insights from './fixtures/spec-16-3-insights-monthly.json';

// The spec's own payloads, asserted exactly: parsing must accept them and must not add,
// drop or change a single field (see fixtures/README.md for the documented edits).

describe('§10.5 goal detail', () => {
  it('parses byte-for-byte', () => {
    const parsed = GoalDetail.parse(goalDetail);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(goalDetail));
  });

  it('rejects an extra field (strict: a partner-finance field cannot sneak in)', () => {
    expect(GoalDetail.safeParse({ ...goalDetail, partner_balance: 5 }).success).toBe(false);
  });

  it('allows the overdue shape: no pace values, overdue true', () => {
    const overdue = {
      ...goalDetail,
      status: 'behind',
      required_pace: { daily: null, weekly: null, monthly: null, overdue: true },
    };
    expect(GoalDetail.safeParse(overdue).success).toBe(true);
  });
});

describe('§16.3 insights', () => {
  it('parses byte-for-byte', () => {
    const parsed = InsightsResponse.parse(insights);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(insights));
  });

  it('AC05: savings rate may be null (N/A when income is 0)', () => {
    const zeroIncome = {
      ...insights,
      totals: { ...insights.totals, income: 0, savings_rate_pct: null },
    };
    expect(InsightsResponse.safeParse(zeroIncome).success).toBe(true);
  });

  it('allows negative remaining and net (Overspent)', () => {
    const overspent = {
      ...insights,
      totals: { ...insights.totals, net: -1000, remaining: -31000 },
    };
    expect(InsightsResponse.safeParse(overspent).success).toBe(true);
  });
});

describe('goal PATCH (BR-15)', () => {
  it('rejects currency, which is immutable', () => {
    expect(PatchGoalRequest.safeParse({ name: 'Laptop', currency: 'EUR' }).success).toBe(false);
    expect(PatchGoalRequest.safeParse({ name: 'Laptop' }).success).toBe(true);
  });
});
