import {
  avgDailySpending,
  categoryTotals,
  daysElapsed,
  periodChangePct,
  periodContaining,
  periodTotals,
  previousPeriod,
  savingsRateChangePts,
  sumMinor,
  isInPeriod,
  type CashTransaction,
  type Period,
  type PeriodType,
  type SavingsContribution,
} from '@spendtogether/domain';
import type { HomeSummaryResponse, InsightsResponse } from '@spendtogether/schemas';
import type { MockDb, UserRecord } from './db';
import { activityContribution, activityTransaction, goalSummary } from './serialize';

// Home summary (§10.4), insights (§16.3) and the activity feed. Only the viewer's own
// records ever enter these calculations (BR-05); every formula is packages/domain.

type WirePeriod = 'daily' | 'weekly' | 'monthly';
const TO_DOMAIN: Record<WirePeriod, PeriodType> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};
const TO_WIRE: Record<PeriodType, WirePeriod> = { day: 'daily', week: 'weekly', month: 'monthly' };

function ownCash(db: MockDb, user: UserRecord): CashTransaction[] {
  return db.transactions
    .filter((t) => t.ownerId === user.id && t.deletedAt === null)
    .map((t) => ({
      type: t.type,
      date: t.date,
      categoryId: t.categoryId,
      baseAmountMinor: t.baseAmountMinor,
    }));
}

function ownSavings(db: MockDb, user: UserRecord): SavingsContribution[] {
  return db.contributions
    .filter((c) => c.contributorId === user.id)
    .map((c) => ({
      date: c.date,
      contributorId: c.contributorId,
      contributorBaseAmountMinor: c.baseAmountMinor,
    }));
}

function wirePeriod(period: Period, today: string) {
  return {
    type: TO_WIRE[period.type],
    start: period.start,
    end: period.end,
    days_elapsed: daysElapsed(period, today),
  };
}

function totalsFor(db: MockDb, user: UserRecord, period: Period, today: string) {
  const cash = ownCash(db, user);
  const t = periodTotals({
    transactions: cash,
    contributions: ownSavings(db, user),
    period,
    userId: user.id,
  });
  return {
    income: t.income,
    expenses: t.expenses,
    saved: t.saved,
    net: t.net,
    remaining: t.remaining,
    savings_rate_pct: t.savingsRatePct,
    avg_daily_spending: avgDailySpending(t.expenses, period, today),
  };
}

function categoriesFor(db: MockDb, user: UserRecord, period: Period) {
  return categoryTotals(ownCash(db, user), period).map((c) => {
    const cat = db.categories.find((x) => x.id === c.categoryId);
    return { id: c.categoryId, name: cat?.name ?? 'Other', amount: c.amount, pct: c.pct };
  });
}

/** C-02/C-03 buckets: 14 days, 8 weeks or 6 months ending with the selected period. */
function seriesFor(db: MockDb, user: UserRecord, period: Period) {
  const count = period.type === 'day' ? 14 : period.type === 'week' ? 8 : 6;
  const buckets: Period[] = [period];
  while (buckets.length < count) {
    const first = buckets[0];
    if (!first) break;
    buckets.unshift(previousPeriod(first));
  }
  const cash = ownCash(db, user);
  return {
    bucket: period.type,
    points: buckets.map((b) => {
      const inBucket = cash.filter((t) => isInPeriod(t.date, b));
      return {
        start: b.start,
        income: sumMinor(inBucket.filter((t) => t.type === 'income').map((t) => t.baseAmountMinor)),
        expenses: sumMinor(
          inBucket.filter((t) => t.type === 'expense').map((t) => t.baseAmountMinor),
        ),
      };
    }),
  };
}

export function insights(
  db: MockDb,
  user: UserRecord,
  type: WirePeriod,
  anchor?: string,
): InsightsResponse {
  const today = db.todayFor(user);
  const period = periodContaining(TO_DOMAIN[type], anchor ?? today);
  const previous = previousPeriod(period);
  const now = totalsFor(db, user, period, today);
  const before = totalsFor(db, user, previous, today);
  return {
    period: wirePeriod(period, today),
    currency: user.baseCurrency,
    totals: now,
    previous: {
      income: before.income,
      expenses: before.expenses,
      saved: before.saved,
      savings_rate_pct: before.savings_rate_pct,
    },
    change_pct: {
      income: periodChangePct(now.income, before.income),
      expenses: periodChangePct(now.expenses, before.expenses),
      saved: periodChangePct(now.saved, before.saved),
      savings_rate_pts: savingsRateChangePts(now.savings_rate_pct, before.savings_rate_pct),
    },
    categories: categoriesFor(db, user, period),
    series: seriesFor(db, user, period),
  };
}

/** Own transactions and own contributions, newest first (§10.4 GET /activity). */
export function activityItems(db: MockDb, user: UserRecord) {
  const txs = db.transactions
    .filter((t) => t.ownerId === user.id && t.deletedAt === null)
    .map((t) => ({ date: t.date, seq: t.seq, item: activityTransaction(db, t, user), record: t }));
  const contribs = db.contributions
    .filter((c) => c.contributorId === user.id)
    .map((c) => ({ date: c.date, seq: c.seq, item: activityContribution(db, c), record: c }));
  return [...txs, ...contribs].sort((a, b) =>
    a.date === b.date ? b.seq - a.seq : a.date < b.date ? 1 : -1,
  );
}

/** Active goals for Home: own individual goals and current couple goals, not completed. */
export function activeGoals(db: MockDb, user: UserRecord) {
  return db.goals
    .filter((g) => db.canSeeGoal(user.id, g) && g.completedAt === null && g.archivedAt === null)
    .sort((a, b) =>
      a.targetDate === b.targetDate
        ? a.name.localeCompare(b.name)
        : a.targetDate < b.targetDate
          ? -1
          : 1,
    );
}

export function homeSummary(
  db: MockDb,
  user: UserRecord,
  period: 'today' | 'week' | 'month',
): HomeSummaryResponse {
  const today = db.todayFor(user);
  const p = periodContaining(period === 'today' ? 'day' : period, today);
  return {
    period: wirePeriod(p, today),
    currency: user.baseCurrency,
    totals: totalsFor(db, user, p, today),
    categories: categoriesFor(db, user, p).slice(0, 5),
    goals: activeGoals(db, user)
      .slice(0, 3)
      .map((g) => goalSummary(db, g, user)),
    recent: activityItems(db, user)
      .slice(0, 5)
      .map((a) => a.item),
  };
}
