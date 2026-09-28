import { roundPct1 } from '@spendtogether/domain';
import { describe, expect, it } from 'vitest';
import { mockClock } from './clock';
import { db } from './db';
import { applyScenario } from './scenarios';
import { BASE, call, failure, id, signInAs, useMockServer } from './test-utils';

// The mock enforces the real business rules (F4-01…F4-09) and reproduces the spec's
// worked examples exactly (F4 exit criteria 3, 5, 6, 7, 9).

describe('spec payloads', () => {
  useMockServer();

  it('§6.5: GET /home/summary for September', async () => {
    const home = await call('getHomeSummary', { query: { period: 'month' } });
    expect(home.period).toEqual({
      type: 'monthly',
      start: '2026-09-01',
      end: '2026-09-30',
      days_elapsed: 17,
    });
    expect(home.totals).toEqual({
      income: 120000,
      expenses: 57000,
      saved: 30000,
      net: 63000,
      remaining: 33000,
      savings_rate_pct: 25,
      avg_daily_spending: 3353,
    });
    expect(home.categories.map((c) => [c.name, c.amount, roundPct1(c.pct)])).toEqual([
      ['Bills', 15000, 26.3],
      ['Food', 14000, 24.6],
      ['Other', 10500, 18.4],
      ['Transport', 9000, 15.8],
      ['Shopping', 8500, 14.9],
    ]);
    expect(home.goals.map((g) => [g.name, g.status])).toEqual([
      ['Emergency fund', 'behind'],
      ['New Laptop', 'on_track'],
      ['Vacation', 'at_risk'],
    ]);
    expect(home.recent).toHaveLength(5);
  });

  it('§10.5: GET /goals/:id for New Laptop, with F-18 normative (Q9, D-04)', async () => {
    const goal = await call('getGoal', { params: { id: id.goal('laptop') } });
    expect(goal).toEqual({
      id: id.goal('laptop'),
      type: 'individual',
      name: 'New Laptop',
      icon: 'laptop',
      currency: 'USD',
      target: { amount_minor: 120000, currency: 'USD', formatted: '$1,200.00' },
      balance: { amount_minor: 60000, currency: 'USD', formatted: '$600.00' },
      remaining: { amount_minor: 60000, currency: 'USD', formatted: '$600.00' },
      progress_pct: 50,
      target_date: '2026-12-31',
      days_remaining: 105,
      required_pace: { daily: 571, weekly: 4000, monthly: 17393, overdue: false },
      // §10.5 prints 769 / 2026-12-05, which F-18 cannot produce from the history (Q9).
      current_pace_daily: 833,
      projected_completion_date: '2026-11-28',
      status: 'on_track',
      contributors: null,
      completed_at: null,
      archived_at: null,
    });
    expect(Object.keys(goal)).toEqual([
      'id',
      'type',
      'name',
      'icon',
      'currency',
      'target',
      'balance',
      'remaining',
      'progress_pct',
      'target_date',
      'days_remaining',
      'required_pace',
      'current_pace_daily',
      'projected_completion_date',
      'status',
      'contributors',
      'completed_at',
      'archived_at',
    ]);
  });

  it('§16.3: GET /insights/monthly?date=2026-09-17', async () => {
    const r = await call('insightsMonthly', { query: { date: '2026-09-17' } });
    expect(r.period).toEqual({
      type: 'monthly',
      start: '2026-09-01',
      end: '2026-09-30',
      days_elapsed: 17,
    });
    expect(r.currency).toBe('USD');
    expect(r.totals).toEqual({
      income: 120000,
      expenses: 57000,
      saved: 30000,
      net: 63000,
      remaining: 33000,
      savings_rate_pct: 25,
      avg_daily_spending: 3353,
    });
    expect({
      ...r.previous,
      savings_rate_pct: roundPct1(r.previous.savings_rate_pct ?? NaN),
    }).toEqual({
      income: 111111,
      expenses: 59500,
      saved: 25000,
      savings_rate_pct: 22.5,
    });
    const change = r.change_pct;
    expect(
      [change.income, change.expenses, change.saved, change.savings_rate_pts].map((v) =>
        roundPct1(v ?? NaN),
      ),
    ).toEqual([8, -4.2, 20, 2.5]);
    expect(r.categories[0]).toMatchObject({ name: 'Bills', amount: 15000 });
    expect(r.series.bucket).toBe('month');
    expect(r.series.points.map((p) => [p.start, p.income, p.expenses])).toEqual([
      ['2026-04-01', 0, 0],
      ['2026-05-01', 0, 0],
      ['2026-06-01', 0, 0],
      ['2026-07-01', 110000, 64000],
      ['2026-08-01', 111111, 59500],
      ['2026-09-01', 120000, 57000],
    ]);
  });

  it('couple goal: contributor shares 60 / 40 (F-21, T-08 shape)', async () => {
    const goal = await call('getGoal', { params: { id: id.goal('vacation') } });
    expect(goal.balance.amount_minor).toBe(80000);
    expect(goal.contributors?.map((c) => [c.name, c.amount.amount_minor, c.share_pct])).toEqual([
      ['Alex Kamara', 48000, 60],
      ['Sam Tweh', 32000, 40],
    ]);
  });

  it('T-11: the August LRD expense is stored as 26.40 USD at 189.39', async () => {
    const t = await call('getTransaction', { params: { id: id.tx('alex-aug-lrd') } });
    expect(t.amount).toEqual({
      amount_minor: 500000,
      currency: 'LRD',
      formatted: 'L$5,000.00 LRD',
    });
    expect(t.base_amount.amount_minor).toBe(2640);
    expect(t.fx).toEqual({ rate: '0.0052801098', rate_date: '2026-08-01', estimated: false });
  });
});

describe('transaction rules', () => {
  useMockServer();

  const lunch = {
    type: 'expense' as const,
    amount_minor: 1200,
    currency: 'USD',
    category_id: id.category('food'),
    transaction_date: '2026-09-17',
  };

  it('replays an Idempotency-Key: one record, identical responses', async () => {
    const before = db.transactions.length;
    const a = await call('createTransaction', { body: lunch, idempotencyKey: 'same-key' });
    const b = await call('createTransaction', { body: lunch, idempotencyKey: 'same-key' });
    expect(b).toEqual(a);
    expect(db.transactions.length).toBe(before + 1);
  });

  it('BR-09: a future date is rejected on the field', async () => {
    const err = await failure(
      call('createTransaction', { body: { ...lunch, transaction_date: '2026-09-18' } }),
    );
    expect(err.status).toBe(422);
    expect(err.fields['transaction_date']).toMatch(/future/);
  });

  it('ADR-005: 0.01 LRD is too small to record in USD', async () => {
    const err = await failure(
      call('createTransaction', { body: { ...lunch, amount_minor: 1, currency: 'LRD' } }),
    );
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.fields['amount_minor']).toBe(
      'This amount is too small to record in USD. Enter a larger amount.',
    );
  });

  it('BR-14: converts at the record date’s rate, re-converting when the date changes', async () => {
    const t = await call('createTransaction', {
      body: { ...lunch, amount_minor: 1901000, currency: 'LRD' },
    });
    expect(t.fx.rate_date).toBe('2026-09-15');
    expect(t.base_amount.amount_minor).toBe(10000); // 19,010 LRD at 190.10
    const moved = await call('patchTransaction', {
      params: { id: t.id },
      body: { transaction_date: '2026-09-01' },
    });
    expect(moved.fx.rate_date).toBe('2026-08-01');
    expect(moved.base_amount.amount_minor).toBe(10037); // 19,010 LRD at 189.39 = 100.37
    expect(moved.amount.amount_minor).toBe(1901000);
  });

  it('soft delete hides the record; restore brings it back', async () => {
    const target = id.tx('alex-sep-barber');
    const del = await call('deleteTransaction', { params: { id: target } });
    expect(del.undo_until).toBe('2026-09-17T12:00:05.000Z');
    expect((await failure(call('getTransaction', { params: { id: target } }))).status).toBe(404);
    const home = await call('getHomeSummary', { query: { period: 'month' } });
    expect(home.totals.expenses).toBe(54000);
    await call('restoreTransaction', { params: { id: target } });
    expect((await call('getHomeSummary', { query: { period: 'month' } })).totals.expenses).toBe(
      57000,
    );
  });

  it('rejects categories of the wrong type and archived ones (BR-17)', async () => {
    expect(
      (
        await failure(
          call('createTransaction', { body: { ...lunch, category_id: id.category('salary') } }),
        )
      ).fields['category_id'],
    ).toMatch(/expense/);
    expect(
      (
        await failure(
          call('createTransaction', { body: { ...lunch, category_id: id.category('alex-gym') } }),
        )
      ).fields['category_id'],
    ).toMatch(/archived/);
  });

  it('filters and paginates with an opaque cursor', async () => {
    const first = await call('listTransactions', {
      query: { type: 'expense', from: '2026-09-01', limit: 10 },
    });
    expect(first.data).toHaveLength(10);
    const second = await call('listTransactions', {
      query: {
        type: 'expense',
        from: '2026-09-01',
        limit: 10,
        ...(first.next_cursor ? { cursor: first.next_cursor } : {}),
      },
    });
    expect(second.data).toHaveLength(8); // 18 September expenses
    expect(second.next_cursor).toBeNull();
    const search = await call('listTransactions', { query: { q: 'waterside' } });
    expect(search.data.map((t) => t.note)).toEqual(['Lunch at Waterside market']);
  });
});

describe('goal rules', () => {
  useMockServer();

  it('BR-11: completion sets and clears as contributions change', async () => {
    applyScenario({ variant: 'goalAboutToComplete' });
    const laptop = id.goal('laptop');
    const c = await call('createContribution', {
      params: { id: laptop },
      body: { amount_minor: 2000, currency: 'USD', contribution_date: '2026-09-17' },
    });
    const done = await call('getGoal', { params: { id: laptop } });
    expect(done.status).toBe('completed');
    expect(done.completed_at).toBe('2026-09-17T12:00:00.000Z');
    expect((await call('listGoals', { query: {} })).data.map((g) => g.name)).not.toContain(
      'New Laptop',
    );
    expect(
      (await call('listGoals', { query: { include: 'completed' } })).data.map((g) => g.name),
    ).toContain('New Laptop');

    await call('deleteContribution', { params: { id: laptop, cid: c.id } });
    const back = await call('getGoal', { params: { id: laptop } });
    expect(back.status).toBe('on_track');
    expect(back.completed_at).toBeNull();
  });

  it('BR-11 both ways through a target change', async () => {
    const laptop = id.goal('laptop');
    expect(
      (await call('patchGoal', { params: { id: laptop }, body: { target_amount_minor: 60000 } }))
        .status,
    ).toBe('completed');
    const back = await call('patchGoal', {
      params: { id: laptop },
      body: { target_amount_minor: 120000 },
    });
    expect(back.completed_at).toBeNull();
  });

  it('409 COUPLE_REQUIRED without an active couple', async () => {
    applyScenario({ variant: 'noPartner' });
    const err = await failure(
      call('createGoal', {
        body: {
          type: 'couple',
          name: 'House',
          target_amount_minor: 100000,
          target_date: '2027-01-01',
        },
      }),
    );
    expect([err.status, err.code]).toEqual([409, 'COUPLE_REQUIRED']);
  });

  it('409 GOAL_ARCHIVED once the couple has ended; history stays visible (BR-18)', async () => {
    applyScenario({ variant: 'exPartner' });
    const vacation = id.goal('vacation');
    const goal = await call('getGoal', { params: { id: vacation } });
    expect(goal.archived_at).not.toBeNull();
    const err = await failure(
      call('createContribution', {
        params: { id: vacation },
        body: { amount_minor: 1000, currency: 'USD', contribution_date: '2026-09-17' },
      }),
    );
    expect([err.status, err.code]).toEqual([409, 'GOAL_ARCHIVED']);
    expect((await call('getCouple', {})).status).toBe('ended');
  });

  it('BR-10 and BR-15: target date today or later; currency is immutable', async () => {
    const err = await failure(
      call('createGoal', {
        body: {
          type: 'individual',
          name: 'Old',
          target_amount_minor: 100,
          target_date: '2026-09-16',
        },
      }),
    );
    expect(err.fields['target_date']).toBeDefined();
    const res = await fetch(`${BASE}/goals/${id.goal('laptop')}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currency: 'EUR' }),
    });
    expect(res.status).toBe(422);
  });

  it('only the contributor can change a contribution (404 for anyone else)', async () => {
    const samContribution = id.contribution('vacation-sam-1');
    const err = await failure(
      call('deleteContribution', { params: { id: id.goal('vacation'), cid: samContribution } }),
    );
    expect(err.status).toBe(404);
  });
});

describe('profile, auth and categories', () => {
  useMockServer();

  it('WAC-15: base-currency change re-expresses totals and keeps originals', async () => {
    applyScenario({ recalcMs: 60_000 });
    const me = await call('patchMe', { body: { base_currency: 'EUR' } });
    expect(me.recalculating).toBe(true);
    const home = await call('getHomeSummary', { query: { period: 'month' } });
    expect(home.currency).toBe('EUR');
    expect(home.totals.income).toBe(110400); // 1,200.00 USD at 0.92
    const lrd = await call('getTransaction', { params: { id: id.tx('alex-aug-lrd') } });
    expect(lrd.amount.amount_minor).toBe(500000);
    expect(lrd.base_amount.currency).toBe('EUR');
    db.recalculating.clear();
  });

  it('auth failures are generic, and five in 15 minutes lock with Retry-After', async () => {
    applyScenario({ variant: 'signedOut' });
    const wrong = await failure(
      call('login', { body: { identifier: 'alex.kamara@example.com', password: 'nope' } }),
    );
    const unknown = await failure(
      call('login', { body: { identifier: 'nobody@example.com', password: 'nope' } }),
    );
    expect(wrong.message).toBe(unknown.message);
    for (let i = 0; i < 4; i++) {
      await failure(
        call('login', { body: { identifier: 'alex.kamara@example.com', password: 'nope' } }),
      );
    }
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'alex.kamara@example.com',
        password: 'correct-horse-battery',
      }),
    });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    mockClock.advance(15 * 60 * 1000);
    expect(
      (
        await call('login', {
          body: { identifier: 'alex.kamara@example.com', password: 'correct-horse-battery' },
        })
      ).user.name,
    ).toBe('Alex Kamara');
  });

  it('FR-01: a duplicate identifier is refused without saying the account exists', async () => {
    applyScenario({ variant: 'signedOut' });
    const err = await failure(
      call('register', {
        body: { name: 'Alex', email: 'alex.kamara@example.com', password: 'long-enough-pass' },
      }),
    );
    expect(err.code).toBe('CONFLICT');
    expect(err.message).not.toMatch(/exists|already registered|alex/i);
  });

  it('401 without a session', async () => {
    applyScenario({ variant: 'signedOut' });
    expect((await failure(call('getMe', {}))).status).toBe(401);
  });

  it('BR-17: defaults are locked; custom categories archive instead of deleting', async () => {
    expect(
      (
        await failure(
          call('patchCategory', { params: { id: id.category('food') }, body: { name: 'Meals' } }),
        )
      ).code,
    ).toBe('CONFLICT');
    await call('patchCategory', {
      params: { id: id.category('alex-pets') },
      body: { archived: true },
    });
    const visible = await call('listCategories', { query: { type: 'expense' } });
    expect(visible.data.map((c) => c.name)).not.toContain('Pets');
    const all = await call('listCategories', { query: { include: 'archived' } });
    expect(all.data.map((c) => c.name)).toEqual(expect.arrayContaining(['Pets', 'Gym']));
  });
});

describe('scenarios (F4-10)', () => {
  useMockServer();

  it('zero income: savings rate is null (AC05)', async () => {
    applyScenario({ variant: 'zeroIncome' });
    const home = await call('getHomeSummary', { query: { period: 'month' } });
    expect(home.totals.savings_rate_pct).toBeNull();
    expect(home.totals.remaining).toBe(-87000);
  });

  it('empty: a new user sees zero totals and nothing recent', async () => {
    applyScenario({ variant: 'empty' });
    const home = await call('getHomeSummary', { query: { period: 'month' } });
    expect(home.totals.income).toBe(0);
    expect(home.categories).toEqual([]);
    expect(home.goals).toEqual([]);
    expect(home.recent).toEqual([]);
    expect((await call('getCouple', {})).status).toBe('none');
  });

  it('error and offline behave like a failing server and a dead network', async () => {
    applyScenario({ failing: ['getHomeSummary'] });
    const err = await failure(call('getHomeSummary', { query: {} }));
    expect([err.status, err.code]).toEqual([500, 'INTERNAL']);
    expect((await call('getMe', {})).name).toBe('Alex Kamara');
    applyScenario({ failing: [], offline: true });
    await expect(call('getMe', {})).rejects.toThrow(TypeError);
  });

  it('pending invitation and foreign currency states', async () => {
    applyScenario({ variant: 'pendingInvite' });
    expect((await call('getCouple', {})).status).toBe('pending');
    applyScenario({ variant: 'foreignCurrency' });
    expect((await call('getMe', {})).base_currency).toBe('LRD');
    signInAs('alex');
    expect((await call('getMe', {})).base_currency).toBe('USD');
  });
});
