import {
  contributorShares,
  currentPaceDaily,
  daysRemaining,
  goalBalance,
  goalStatus,
  progressPct,
  projectedCompletion,
  remainingAmount,
  requiredPace,
  roundHalfAwayFromZero,
  type GoalContribution,
} from '@spendtogether/domain';
import type {
  ActivityItem,
  Category,
  Contribution,
  CoupleState,
  GoalDetail,
  GoalSummary,
  Invitation,
  Me,
  Transaction,
} from '@spendtogether/schemas';
import { formatMoney } from '@/lib/format-money';
import {
  STATUS_THRESHOLDS,
  type CategoryRecord,
  type ContributionRecord,
  type GoalRecord,
  type InvitationRecord,
  type MockDb,
  type TransactionRecord,
  type UserRecord,
} from './db';
import type { FxApplied } from './fx';

// Records → wire objects. Every computed figure comes from packages/domain; the server
// formats money for display with Intl (§10.1), and clients never parse `formatted`.

const LOCALE = 'en-US';

export function money(db: MockDb, amountMinor: number, currency: string, viewerBase?: string) {
  const c = db.currencies.find((x) => x.code === currency);
  return {
    amount_minor: amountMinor,
    currency,
    formatted: formatMoney(
      {
        amountMinor,
        currency,
        locale: LOCALE,
        ...(c ? { exponent: c.exponent, symbol: c.symbol } : {}),
      },
      viewerBase === undefined ? {} : { baseCurrency: viewerBase },
    ),
  };
}

const fx = (f: FxApplied) => ({ rate: f.rate, rate_date: f.rateDate, estimated: f.estimated });

export function categoryRef(c: CategoryRecord) {
  return { id: c.id, name: c.name, icon: c.icon, color: c.color };
}

export function category(c: CategoryRecord): Category {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color as Category['color'],
    is_default: c.isDefault,
    archived_at: c.archivedAt,
  };
}

export function transaction(db: MockDb, t: TransactionRecord, viewer: UserRecord): Transaction {
  const cat = db.categories.find((c) => c.id === t.categoryId);
  if (!cat) throw new Error(`Transaction ${t.id} has no category`);
  return {
    id: t.id,
    type: t.type,
    amount: money(db, t.amountMinor, t.currency, viewer.baseCurrency),
    base_amount: money(db, t.baseAmountMinor, t.baseCurrency),
    fx: fx(t.fx),
    category: categoryRef(cat),
    transaction_date: t.date,
    note: t.note,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function contribution(db: MockDb, c: ContributionRecord, viewer: UserRecord): Contribution {
  const goal = db.goals.find((g) => g.id === c.goalId);
  const contributor = db.users.find((u) => u.id === c.contributorId);
  if (!goal || !contributor) throw new Error(`Contribution ${c.id} is orphaned`);
  return {
    id: c.id,
    goal_id: c.goalId,
    contributor: { user_id: contributor.id, name: contributor.name },
    is_own: c.contributorId === viewer.id,
    amount: money(db, c.amountMinor, c.currency, goal.currency),
    goal_amount: money(db, c.goalAmountMinor, goal.currency),
    fx: fx(c.goalFx),
    contribution_date: c.date,
    note: c.note,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

/** The viewer's own record in the Activity feed (own contributions only, F-03). */
export function activityContribution(db: MockDb, c: ContributionRecord): ActivityItem {
  const goal = db.goals.find((g) => g.id === c.goalId);
  if (!goal) throw new Error(`Contribution ${c.id} is orphaned`);
  return {
    kind: 'contribution',
    id: c.id,
    date: c.date,
    goal: { id: goal.id, name: goal.name, icon: goal.icon, type: goal.type },
    amount: money(db, c.amountMinor, c.currency, c.baseCurrency),
    base_amount: money(db, c.baseAmountMinor, c.baseCurrency),
    fx: fx(c.baseFx),
    note: c.note,
    created_at: c.createdAt,
  };
}

export function activityTransaction(
  db: MockDb,
  t: TransactionRecord,
  viewer: UserRecord,
): ActivityItem {
  return { ...transaction(db, t, viewer), kind: 'transaction', date: t.date };
}

function goalContributions(db: MockDb, goal: GoalRecord): GoalContribution[] {
  return db.contributionsOf(goal.id).map((c) => ({
    date: c.date,
    contributorId: c.contributorId,
    goalAmountMinor: c.goalAmountMinor,
  }));
}

/** GoalDetail in §10.5 field order, every metric from packages/domain (F-11…F-21). */
export function goalDetail(db: MockDb, goal: GoalRecord, viewer: UserRecord): GoalDetail {
  const today = db.todayFor(viewer);
  const contribs = goalContributions(db, goal);
  const balance = goalBalance(contribs);
  const remaining = remainingAmount(goal.targetMinor, balance);
  const pace = currentPaceDaily({ contributions: contribs, createdDate: goal.createdDate, today });
  const required = requiredPace({ remaining, targetDate: goal.targetDate, today });
  const shares =
    goal.type === 'couple'
      ? contributorShares(contribs).map((s) => {
          const person = db.users.find((u) => u.id === s.contributorId);
          return {
            user_id: s.contributorId,
            name: person?.name ?? 'Former partner',
            amount: money(db, s.amount, goal.currency),
            share_pct: s.sharePct,
          };
        })
      : null;
  return {
    id: goal.id,
    type: goal.type,
    name: goal.name,
    icon: goal.icon,
    currency: goal.currency,
    target: money(db, goal.targetMinor, goal.currency),
    balance: money(db, balance, goal.currency),
    remaining: money(db, remaining, goal.currency),
    progress_pct: progressPct(balance, goal.targetMinor),
    target_date: goal.targetDate,
    days_remaining: daysRemaining(goal.targetDate, today),
    required_pace: required,
    current_pace_daily: roundHalfAwayFromZero(pace),
    projected_completion_date: projectedCompletion({ remaining, paceDaily: pace, today }),
    status: goalStatus({
      balance,
      target: goal.targetMinor,
      createdDate: goal.createdDate,
      targetDate: goal.targetDate,
      today,
      thresholds: STATUS_THRESHOLDS,
    }),
    contributors: shares,
    completed_at: goal.completedAt,
    archived_at: goal.archivedAt,
  };
}

export function goalSummary(db: MockDb, goal: GoalRecord, viewer: UserRecord): GoalSummary {
  const detail = goalDetail(db, goal, viewer);
  return {
    id: detail.id,
    type: detail.type,
    name: detail.name,
    icon: detail.icon,
    currency: detail.currency,
    target: detail.target,
    balance: detail.balance,
    remaining: detail.remaining,
    progress_pct: detail.progress_pct,
    target_date: detail.target_date,
    days_remaining: detail.days_remaining,
    status: detail.status,
    completed_at: detail.completed_at,
    archived_at: detail.archived_at,
  };
}

export function me(db: MockDb, u: UserRecord): Me {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    base_currency: u.baseCurrency,
    timezone: u.timezone,
    notify_email: { ...u.notifyEmail },
    onboarded_at: u.onboardedAt,
    recalculating: db.recalculating.has(u.id),
  };
}

export function invitation(db: MockDb, i: InvitationRecord): Invitation {
  const expired = i.status === 'pending' && db.nowIso() > i.expiresAt;
  return {
    id: i.id,
    invitee: i.invitee,
    invitee_kind: i.inviteeKind,
    status: expired ? 'expired' : i.status,
    expires_at: i.expiresAt,
    created_at: i.createdAt,
  };
}

/** `{status, partner:{name}, invitation?, shared_goal_count}`: names only, never money (BR-05). */
export function coupleState(db: MockDb, viewer: UserRecord): CoupleState {
  const active = db.activeCoupleOf(viewer.id);
  const sharedGoals = (coupleId: string) => db.goals.filter((g) => g.coupleId === coupleId).length;
  if (active) {
    const partner = db.user(db.partnerId(active, viewer.id));
    return {
      status: 'active',
      partner: { name: partner.name, since: active.since },
      invitation: null,
      shared_goal_count: sharedGoals(active.id),
      ended_at: null,
    };
  }
  const pending = db.invitations.find(
    (i) => i.inviterId === viewer.id && invitation(db, i).status === 'pending',
  );
  if (pending) {
    return {
      status: 'pending',
      partner: null,
      invitation: invitation(db, pending),
      shared_goal_count: 0,
      ended_at: null,
    };
  }
  const ended = db.couples
    .filter((c) => c.memberIds.includes(viewer.id) && c.endedAt !== null)
    .sort((a, b) => ((a.endedAt ?? '') < (b.endedAt ?? '') ? 1 : -1))[0];
  if (ended) {
    const partner = db.user(db.partnerId(ended, viewer.id));
    return {
      status: 'ended',
      partner: { name: partner.name, since: ended.since },
      invitation: null,
      shared_goal_count: sharedGoals(ended.id),
      ended_at: ended.endedAt,
    };
  }
  return { status: 'none', partner: null, invitation: null, shared_goal_count: 0, ended_at: null };
}
