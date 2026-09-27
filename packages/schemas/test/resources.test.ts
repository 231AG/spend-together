import { describe, expect, it } from 'vitest';
import { ActivityItem } from '../src/activity';
import { RegisterRequest } from '../src/auth';
import { CreateCategoryRequest } from '../src/categories';
import { createContributionRequestFor } from '../src/contributions';
import { CoupleState } from '../src/couple';
import { ExchangeRatesResponse } from '../src/currencies';
import { createGoalRequestFor } from '../src/goals';
import { PublicInvitation } from '../src/invitations';
import { PatchMeRequest } from '../src/me';
import {
  createTransactionRequestFor,
  PatchTransactionRequest,
  Transaction,
} from '../src/transactions';

const TODAY = '2026-09-17';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const usd = (minor: number, formatted: string) => ({
  amount_minor: minor,
  currency: 'USD',
  formatted,
});

const transaction = {
  id: uuid(1),
  type: 'expense',
  amount: usd(2150, '$21.50'),
  base_amount: usd(2150, '$21.50'),
  fx: { rate: '1', rate_date: '2026-09-16', estimated: false },
  category: { id: uuid(2), name: 'Food', icon: 'utensils', color: 'cat-food' },
  transaction_date: '2026-09-16',
  note: 'Lunch at Waterside market',
  created_at: '2026-09-16T12:30:00Z',
  updated_at: '2026-09-16T12:30:00Z',
};

describe('transactions', () => {
  const create = createTransactionRequestFor(TODAY);
  const base = {
    type: 'expense',
    amount_minor: 2150,
    currency: 'USD',
    category_id: uuid(2),
    transaction_date: TODAY,
  };

  it('accepts a valid create, with an optional client id for offline entries', () => {
    expect(create.safeParse(base).success).toBe(true);
    expect(create.safeParse({ ...base, id: uuid(9), note: 'Lunch' }).success).toBe(true);
  });

  it('rejects zero and negative amounts (BR-07)', () => {
    expect(create.safeParse({ ...base, amount_minor: 0 }).success).toBe(false);
    expect(create.safeParse({ ...base, amount_minor: -100 }).success).toBe(false);
  });

  it('rejects a future date (BR-09) and a float amount', () => {
    expect(create.safeParse({ ...base, transaction_date: '2026-09-18' }).success).toBe(false);
    expect(create.safeParse({ ...base, amount_minor: 21.5 }).success).toBe(false);
  });

  it('rejects a note over 280 characters', () => {
    expect(create.safeParse({ ...base, note: 'x'.repeat(281) }).success).toBe(false);
  });

  it('WAC-14: a transaction carries original amount, base amount and the locked rate', () => {
    const lrd = {
      ...transaction,
      amount: { amount_minor: 500000, currency: 'LRD', formatted: 'L$5,000.00 LRD' },
      fx: { rate: '0.0052800000', rate_date: '2026-09-16', estimated: true },
      base_amount: usd(2640, '$26.40'),
    };
    expect(Transaction.parse(lrd)).toEqual(lrd);
  });

  it('PATCH needs at least one field', () => {
    expect(PatchTransactionRequest.safeParse({}).success).toBe(false);
    expect(PatchTransactionRequest.safeParse({ note: 'fixed' }).success).toBe(true);
  });
});

describe('goals and contributions', () => {
  it('goal create enforces BR-10 (target date today or later) and a positive target', () => {
    const create = createGoalRequestFor(TODAY);
    const goal = {
      type: 'individual',
      name: 'New Laptop',
      target_amount_minor: 120000,
      target_date: '2026-12-31',
    };
    expect(create.safeParse(goal).success).toBe(true);
    expect(create.safeParse({ ...goal, target_date: '2026-09-16' }).success).toBe(false);
    expect(create.safeParse({ ...goal, target_amount_minor: 0 }).success).toBe(false);
  });

  it('contribution create rejects a future date', () => {
    const create = createContributionRequestFor(TODAY);
    const c = { amount_minor: 5000, currency: 'USD', contribution_date: TODAY };
    expect(create.safeParse(c).success).toBe(true);
    expect(create.safeParse({ ...c, contribution_date: '2026-09-20' }).success).toBe(false);
  });
});

describe('couple privacy (BR-05 by type)', () => {
  const state = {
    status: 'active',
    partner: { name: 'Sam Tweh', since: '2026-06-02T10:00:00Z' },
    invitation: null,
    shared_goal_count: 1,
    ended_at: null,
  };

  it('parses the connected state', () => {
    expect(CoupleState.parse(state)).toEqual(state);
  });

  it.each(['income', 'balance', 'transactions', 'goals', 'base_currency'])(
    'has no room for partner %s',
    (field) => {
      expect(
        CoupleState.safeParse({ ...state, partner: { ...state.partner, [field]: 1 } }).success,
      ).toBe(false);
      expect(CoupleState.safeParse({ ...state, [field]: 1 }).success).toBe(false);
    },
  );

  it('the public invitation exposes the first name and nothing else', () => {
    const inv = {
      inviter_first_name: 'Alex',
      status: 'pending',
      expires_at: '2026-09-24T00:00:00Z',
    };
    expect(PublicInvitation.parse(inv)).toEqual(inv);
    expect(PublicInvitation.safeParse({ ...inv, inviter_email: 'a@b.co' }).success).toBe(false);
  });
});

describe('activity feed', () => {
  it('discriminates transactions and contributions by kind', () => {
    const tx = { ...transaction, kind: 'transaction', date: '2026-09-16' };
    const contribution = {
      kind: 'contribution',
      id: uuid(3),
      date: '2026-09-15',
      goal: { id: uuid(4), name: 'New Laptop', icon: 'laptop', type: 'individual' },
      amount: usd(5000, '$50.00'),
      base_amount: usd(5000, '$50.00'),
      fx: { rate: '1', rate_date: '2026-09-15', estimated: false },
      note: 'Weekly top-up',
      created_at: '2026-09-15T08:00:00Z',
    };
    expect(ActivityItem.parse(tx)).toEqual(tx);
    expect(ActivityItem.parse(contribution)).toEqual(contribution);
    expect(ActivityItem.safeParse({ ...contribution, kind: 'expense' }).success).toBe(false);
  });
});

describe('auth, me, categories, currencies', () => {
  it('register takes exactly one of email or phone', () => {
    const base = { name: 'Alex Kamara', password: 'correct horse battery' };
    expect(RegisterRequest.safeParse({ ...base, email: 'alex@example.com' }).success).toBe(true);
    expect(RegisterRequest.safeParse({ ...base, phone: '+231770123456' }).success).toBe(true);
    expect(
      RegisterRequest.safeParse({ ...base, email: 'alex@example.com', phone: '+231770123456' })
        .success,
    ).toBe(false);
    expect(RegisterRequest.safeParse(base).success).toBe(false);
    expect(
      RegisterRequest.safeParse({ ...base, email: 'alex@example.com', password: 'short' }).success,
    ).toBe(false);
  });

  it('PATCH /me rejects an empty body', () => {
    expect(PatchMeRequest.safeParse({}).success).toBe(false);
    expect(PatchMeRequest.safeParse({ base_currency: 'LRD', onboarded: true }).success).toBe(true);
  });

  it('category colours are limited to the §17.3 tokens', () => {
    const c = { name: 'Rent', type: 'expense', icon: 'house', color: 'cat-bills' };
    expect(CreateCategoryRequest.safeParse(c).success).toBe(true);
    expect(CreateCategoryRequest.safeParse({ ...c, color: '#ff0000' }).success).toBe(false);
  });

  it('exchange rates are decimal strings keyed by currency code', () => {
    const rates = {
      base: 'USD',
      rate_date: '2026-09-17',
      estimated: false,
      rates: { LRD: '189.3900000000', EUR: '0.9120000000', JPY: '148.2' },
      fetched_at: '2026-09-17T01:00:04Z',
    };
    expect(ExchangeRatesResponse.parse(rates)).toEqual(rates);
    expect(ExchangeRatesResponse.safeParse({ ...rates, rates: { LRD: 189.39 } }).success).toBe(
      false,
    );
  });
});
