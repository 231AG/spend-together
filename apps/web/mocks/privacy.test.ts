import { describe, expect, it } from 'vitest';
import { db } from './db';
import { applyScenario } from './scenarios';
import { call, failure, id, signInAs, useMockServer } from './test-utils';

// F4-07 / BR-05: an adversarial walk. Signed in as one partner, call every endpoint the
// UI can reach, including the couple-context ones, and fail on anything that belongs to
// the other partner's private finances. Foreign resources must be 404, never 403.

async function walk(): Promise<string> {
  const bodies: unknown[] = [];
  const add = async (p: Promise<unknown>) => {
    bodies.push(await p);
  };
  await add(call('getMe', {}));
  await add(call('getCouple', {}));
  await add(call('getHomeSummary', { query: { period: 'today' } }));
  await add(call('getHomeSummary', { query: { period: 'week' } }));
  await add(call('getHomeSummary', { query: { period: 'month' } }));
  for (const date of ['2026-07-15', '2026-08-15', '2026-09-17']) {
    await add(call('insightsDaily', { query: { date } }));
    await add(call('insightsWeekly', { query: { date } }));
    await add(call('insightsMonthly', { query: { date } }));
  }
  await add(call('listTransactions', { query: { limit: 100 } }));
  await add(call('getActivity', { query: { limit: 100 } }));
  await add(call('getActivity', { query: { kind: 'contribution', limit: 100 } }));
  await add(call('listCategories', { query: { include: 'archived' } }));
  const goals = await call('listGoals', { query: { scope: 'all', include: 'completed' } });
  bodies.push(goals);
  for (const g of goals.data) {
    await add(call('getGoal', { params: { id: g.id } }));
    await add(call('listContributions', { params: { id: g.id }, query: { limit: 100 } }));
  }
  return JSON.stringify(bodies);
}

/** Everything private to a user: ids, notes, goal names, identifiers. */
function privateMarkers(userKey: string): string[] {
  const userId = id.user(userKey);
  const user = db.users.find((u) => u.id === userId);
  const txs = db.transactions.filter((t) => t.ownerId === userId);
  const goals = db.goals.filter((g) => g.ownerId === userId && g.type === 'individual');
  const goalContribs = db.contributions.filter((c) => goals.some((g) => g.id === c.goalId));
  return [
    ...txs.map((t) => t.id),
    ...txs.flatMap((t) => (t.note ? [t.note] : [])),
    ...goals.flatMap((g) => [g.id, g.name]),
    ...goalContribs.map((c) => c.id),
    ...(user?.email ? [user.email] : []),
    ...(user?.phone ? [user.phone] : []),
  ];
}

describe('BR-05 privacy sweep', () => {
  useMockServer();

  it.each([
    ['sam', 'alex'],
    ['alex', 'sam'],
  ])('signed in as %s, nothing private to %s appears anywhere', async (viewer, other) => {
    signInAs(viewer);
    const everything = await walk();
    const leaks = privateMarkers(other).filter((m) => everything.includes(m));
    expect(leaks).toEqual([]);
  });

  it("the partner's own base-currency figures never appear on shared contributions", async () => {
    signInAs('alex');
    const list = await call('listContributions', {
      params: { id: id.goal('vacation') },
      query: { limit: 100 },
    });
    const sams = list.data.filter((c) => !c.is_own);
    expect(sams.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(sams);
    expect(serialised).not.toContain('LRD'); // Sam's base currency
    expect(Object.keys(sams[0] ?? {})).not.toContain('base_amount');
  });

  it('foreign resources are 404, not 403', async () => {
    signInAs('sam');
    const attempts = [
      call('getTransaction', { params: { id: id.tx('alex-sep-salary') } }),
      call('patchTransaction', { params: { id: id.tx('alex-sep-salary') }, body: { note: 'x' } }),
      call('deleteTransaction', { params: { id: id.tx('alex-sep-salary') } }),
      call('restoreTransaction', { params: { id: id.tx('alex-sep-salary') } }),
      call('getGoal', { params: { id: id.goal('laptop') } }),
      call('listContributions', { params: { id: id.goal('laptop') }, query: {} }),
      call('createContribution', {
        params: { id: id.goal('laptop') },
        body: { amount_minor: 100, currency: 'USD', contribution_date: '2026-09-17' },
      }),
      call('patchGoal', { params: { id: id.goal('emergency') }, body: { name: 'Mine now' } }),
      call('deleteGoal', { params: { id: id.goal('emergency') } }),
      call('patchCategory', { params: { id: id.category('alex-pets') }, body: { name: 'x' } }),
    ];
    for (const attempt of attempts) {
      expect((await failure(attempt)).status).toBe(404);
    }
  });

  it('a transaction in an invisible category cannot be created (no cross-user categories)', async () => {
    signInAs('sam');
    const err = await failure(
      call('createTransaction', {
        body: {
          type: 'expense',
          amount_minor: 100,
          currency: 'LRD',
          category_id: id.category('alex-pets'),
          transaction_date: '2026-09-17',
        },
      }),
    );
    expect(err.status).toBe(422);
  });

  it('the public invitation landing reveals only a first name', async () => {
    applyScenario({ variant: 'pendingInvite' });
    db.sessionUserId = null;
    const landing = await call('getInvitationByToken', { params: { token: 'invite-pending' } });
    expect(Object.keys(landing).sort()).toEqual(['expires_at', 'inviter_first_name', 'status']);
    expect(landing.inviter_first_name).toBe('Alex');
  });

  it('couple responses carry names and states only, never money', async () => {
    signInAs('sam');
    const state = JSON.stringify(await call('getCouple', {}));
    for (const forbidden of ['amount', 'balance', 'income', 'expense', 'saved', 'currency']) {
      expect(state).not.toContain(forbidden);
    }
  });
});
