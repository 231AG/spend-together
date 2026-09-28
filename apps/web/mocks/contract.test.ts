import { endpoints, type EndpointName } from '@spendtogether/schemas';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { variants } from './fixtures';
import { db } from './db';
import { applyScenario } from './scenarios';
import { call, id, signInAs, useMockServer } from './test-utils';

// F4-12: every endpoint of the frozen contract has a handler, and every response parses
// against its schema. The typed client validates each response, so a malformed body
// fails with ApiContractError; a missing handler fails as an unhandled request.

const seen = new Set<EndpointName>();

async function hit<N extends EndpointName>(name: N, input: Parameters<typeof call<N>>[1]) {
  seen.add(name);
  try {
    return await call(name, input);
  } catch (error) {
    // A well-formed error envelope still conforms; anything else is a contract failure.
    if (error instanceof ApiError) return error;
    throw error;
  }
}

describe('contract conformance (F4-12)', () => {
  useMockServer();

  afterEach(() => {
    db.sessionUserId = id.user('alex');
  });

  it('serves every read endpoint for the reference user', async () => {
    await hit('getMe', {});
    await hit('listTransactions', { query: { limit: 5 } });
    await hit('getTransaction', { params: { id: id.tx('alex-sep-lunch-16') } });
    await hit('insightsDaily', { query: {} });
    await hit('insightsWeekly', { query: {} });
    await hit('insightsMonthly', { query: { date: '2026-09-17' } });
    await hit('listGoals', { query: { scope: 'all' } });
    await hit('getGoal', { params: { id: id.goal('laptop') } });
    await hit('listContributions', { params: { id: id.goal('vacation') }, query: {} });
    await hit('getCouple', {});
    await hit('listCategories', { query: {} });
    await hit('getActivity', { query: { kind: 'contribution' } });
    await hit('getHomeSummary', { query: { period: 'week' } });
    await hit('listCurrencies', {});
    await hit('getExchangeRates', { query: { date: '2026-08-20' } });
    await hit('getInvitationByToken', { params: { token: 'invite-alex-sam' } });
  });

  it('serves every write endpoint', async () => {
    await hit('patchMe', { body: { name: 'Alex K.' } });
    const t = await call('createTransaction', {
      body: {
        type: 'expense',
        amount_minor: 1200,
        currency: 'USD',
        category_id: id.category('food'),
        transaction_date: '2026-09-17',
        note: 'Lunch',
      },
    });
    seen.add('createTransaction');
    await hit('patchTransaction', { params: { id: t.id }, body: { note: 'Lunch, edited' } });
    await hit('deleteTransaction', { params: { id: t.id } });
    await hit('restoreTransaction', { params: { id: t.id } });

    const goal = await call('createGoal', {
      body: {
        type: 'individual',
        name: 'Bicycle',
        target_amount_minor: 30000,
        target_date: '2026-12-01',
      },
    });
    seen.add('createGoal');
    await hit('patchGoal', { params: { id: goal.id }, body: { name: 'Road bicycle' } });
    const c = await call('createContribution', {
      params: { id: goal.id },
      body: { amount_minor: 1000, currency: 'USD', contribution_date: '2026-09-17' },
    });
    seen.add('createContribution');
    await hit('patchContribution', {
      params: { id: goal.id, cid: c.id },
      body: { amount_minor: 2000 },
    });
    await hit('deleteContribution', { params: { id: goal.id, cid: c.id } });
    await hit('deleteGoal', { params: { id: goal.id } });

    const cat = await call('createCategory', {
      body: { name: 'Books', type: 'expense', icon: 'book', color: 'cat-education' },
    });
    seen.add('createCategory');
    await hit('patchCategory', { params: { id: cat.id }, body: { archived: true } });
  });

  it('serves the couple and invitation lifecycle', async () => {
    applyScenario({ variant: 'noPartner' });
    const inv = await call('invitePartner', { body: { invitee: 'sam.tweh@example.com' } });
    seen.add('invitePartner');
    await hit('resendInvitation', { params: { id: inv.id } });
    await hit('cancelInvitation', { params: { id: inv.id } });
    const again = await call('invitePartner', { body: { invitee: 'sam.tweh@example.com' } });
    const token = db.invitations.find((i) => i.id === again.id)?.token ?? '';
    signInAs('sam');
    await hit('acceptInvitation', { params: { id: again.id }, body: { token } });
    await hit('endCouple', {});
    signInAs('alex');
    const third = await call('invitePartner', { body: { invitee: 'sam.tweh@example.com' } });
    const thirdToken = db.invitations.find((i) => i.id === third.id)?.token ?? '';
    signInAs('sam');
    await hit('declineInvitation', { params: { id: third.id }, body: { token: thirdToken } });
  });

  it('serves every auth endpoint', async () => {
    applyScenario({ variant: 'signedOut' });
    await hit('register', {
      body: { name: 'Pat Doe', email: 'pat@example.com', password: 'long-enough-pass' },
    });
    await hit('logout', {});
    await hit('login', { body: { identifier: 'pat@example.com', password: 'long-enough-pass' } });
    await hit('refresh', { body: { refresh_token: 'refresh-token' } });
    await hit('forgotPassword', { body: { identifier: 'pat@example.com' } });
    await hit('resetPassword', { body: { token: 'reset-token', password: 'another-long-pass' } });
    await hit('verify', {
      body: { identifier: 'pat@example.com', code: '123456', purpose: 'signup' },
    });
  });

  it('covers every endpoint in api-contract.md', () => {
    expect([...seen].sort()).toEqual(Object.keys(endpoints).sort());
    expect(Object.keys(variants).length).toBeGreaterThan(5);
  });
});
