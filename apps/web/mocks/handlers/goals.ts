import { db, type GoalRecord } from '../db';
import { ApiFailure, invalid, notFound } from '../errors';
import { Reply, route } from '../http';
import { page } from '../paging';
import { contribution, goalDetail, goalSummary } from '../serialize';

// Goals and contributions (§10.3, §10.4, BR-03, BR-04, BR-08, BR-10, BR-11, BR-15, BR-18).

const FUTURE_DATE = 'This date is in the future. Choose today or an earlier date.';

function listFor(userId: string, scope: 'mine' | 'ours' | 'all'): GoalRecord[] {
  return db.goals
    .filter((g) => db.canSeeGoal(userId, g))
    .filter(
      (g) => scope === 'all' || (scope === 'mine' ? g.type === 'individual' : g.type === 'couple'),
    )
    .sort((a, b) => a.seq - b.seq);
}

export const goalHandlers = [
  route('listGoals', ({ user, query }) => {
    const goals = listFor(user.id, query.scope).filter(
      (g) => query.include === 'completed' || g.completedAt === null,
    );
    return { data: goals.map((g) => goalSummary(db, g, user)) };
  }),

  route('createGoal', ({ user, body }) => {
    const today = db.todayFor(user);
    if (body.target_date < today) throw invalid('target_date', 'Choose today or a later date.');
    const couple = body.type === 'couple' ? db.activeCoupleOf(user.id) : undefined;
    if (body.type === 'couple' && !couple) {
      throw new ApiFailure(
        'COUPLE_REQUIRED',
        'Connect with your partner before creating a shared goal.',
      );
    }
    const currency = body.currency ?? user.baseCurrency;
    db.currency(currency);
    const now = db.nowIso();
    const goal: GoalRecord = {
      id: db.newId('goal'),
      ownerId: user.id,
      coupleId: couple?.id ?? null,
      type: body.type,
      name: body.name,
      icon: body.icon ?? (body.type === 'couple' ? 'heart-handshake' : 'piggy-bank'),
      currency,
      targetMinor: body.target_amount_minor,
      targetDate: body.target_date,
      createdDate: today,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archivedAt: null,
      seq: db.nextSeq(),
    };
    db.goals.push(goal);
    return goalDetail(db, goal, user);
  }),

  route('getGoal', ({ user, params }) => goalDetail(db, db.visibleGoal(user.id, params.id), user)),

  route('patchGoal', ({ user, params, body }) => {
    const goal = db.writableGoal(user.id, params.id);
    if (body.target_date !== undefined && body.target_date < db.todayFor(user)) {
      throw invalid('target_date', 'Choose today or a later date.');
    }
    if (body.name !== undefined) goal.name = body.name;
    if (body.icon !== undefined) goal.icon = body.icon;
    if (body.target_date !== undefined) goal.targetDate = body.target_date;
    if (body.target_amount_minor !== undefined) goal.targetMinor = body.target_amount_minor;
    goal.updatedAt = db.nowIso();
    db.recomputeCompletion(goal);
    return goalDetail(db, goal, user);
  }),

  route('deleteGoal', ({ user, params }) => {
    const goal = db.writableGoal(user.id, params.id);
    db.contributions = db.contributions.filter((c) => c.goalId !== goal.id);
    db.goals = db.goals.filter((g) => g.id !== goal.id);
    return new Reply(null, 204);
  }),

  route('createContribution', ({ user, params, body }) => {
    const goal = db.writableGoal(user.id, params.id);
    if (body.contribution_date > db.todayFor(user)) throw invalid('contribution_date', FUTURE_DATE);
    if (body.id !== undefined) {
      const existing = db.contributions.find((c) => c.id === body.id);
      if (existing?.contributorId === user.id) return contribution(db, existing, user);
      if (existing) throw new ApiFailure('CONFLICT', 'That record already exists.');
    }
    const record = db.buildContribution(goal.id, user.id, body.id ?? db.newId('contribution'), {
      amountMinor: body.amount_minor,
      currency: body.currency,
      date: body.contribution_date,
      note: body.note ?? null,
      createdAt: db.nowIso(),
    });
    db.contributions.push(record);
    db.recomputeCompletion(goal);
    return contribution(db, record, user);
  }),

  route('listContributions', ({ user, params, query }) => {
    const goal = db.visibleGoal(user.id, params.id);
    const items = db
      .contributionsOf(goal.id)
      .sort((a, b) => (a.date === b.date ? b.seq - a.seq : a.date < b.date ? 1 : -1));
    const result = page(items, query.limit, query.cursor);
    return {
      data: result.data.map((c) => contribution(db, c, user)),
      next_cursor: result.next_cursor,
    };
  }),

  route('patchContribution', ({ user, params, body }) => {
    const goal = db.writableGoal(user.id, params.id);
    // Only the contributor may change a contribution; anyone else gets 404, not 403.
    const c = db.contributions.find(
      (x) => x.id === params.cid && x.goalId === goal.id && x.contributorId === user.id,
    );
    if (!c) throw notFound('That contribution');
    if (body.contribution_date !== undefined && body.contribution_date > db.todayFor(user)) {
      throw invalid('contribution_date', FUTURE_DATE);
    }
    const next = db.buildContribution(goal.id, user.id, c.id, {
      amountMinor: body.amount_minor ?? c.amountMinor,
      currency: body.currency ?? c.currency,
      date: body.contribution_date ?? c.date,
      note: body.note === undefined ? c.note : body.note === '' ? null : body.note,
      createdAt: c.createdAt,
    });
    Object.assign(c, { ...next, seq: c.seq, updatedAt: db.nowIso() });
    db.recomputeCompletion(goal);
    return contribution(db, c, user);
  }),

  route('deleteContribution', ({ user, params }) => {
    const goal = db.writableGoal(user.id, params.id);
    const c = db.contributions.find(
      (x) => x.id === params.cid && x.goalId === goal.id && x.contributorId === user.id,
    );
    if (!c) throw notFound('That contribution');
    db.contributions = db.contributions.filter((x) => x.id !== c.id);
    db.recomputeCompletion(goal);
    return new Reply(null, 204);
  }),
];
