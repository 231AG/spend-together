import { endpoints } from '@spendtogether/schemas';
import { describe, expect, it, vi } from 'vitest';
import { ApiContractError, ApiError, createApiClient } from './api-client';
import goalDetail from '../../../packages/schemas/test/fixtures/spec-10-5-goal-detail.json';

const GOAL_ID = goalDetail.id;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function clientWith(response: Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(response));
  const client = createApiClient({
    mode: 'mock',
    baseUrl: '/api/v1/',
    fetch,
    newKey: () => 'key-1',
  });
  const lastCall = () => {
    const call = fetch.mock.calls[0];
    if (!call) throw new Error('fetch was not called');
    const init = call[1] ?? {};
    return { url: call[0] as string, init, headers: new Headers(init.headers) };
  };
  return { client, lastCall };
}

describe('api client', () => {
  it('joins the base URL and path without doubling slashes', () => {
    const client = createApiClient({ mode: 'live', baseUrl: '/api/v1/' });
    expect(client.url('/transactions')).toBe('/api/v1/transactions');
  });

  it('starts the mock worker only in mock mode', () => {
    expect(createApiClient({ mode: 'mock', baseUrl: '/x' }).usesMockWorker).toBe(true);
    expect(createApiClient({ mode: 'live', baseUrl: '/x' }).usesMockWorker).toBe(false);
  });

  it('fills path params and returns the parsed response', async () => {
    const { client, lastCall } = clientWith(json(goalDetail));
    const goal = await client.call(endpoints.getGoal, { params: { id: GOAL_ID } });
    expect(goal.required_pace.weekly).toBe(4000);
    expect(lastCall().url).toBe(`/api/v1/goals/${GOAL_ID}`);
    expect(lastCall().init.method).toBe('GET');
  });

  it('serialises the query, applying schema defaults', async () => {
    const { client, lastCall } = clientWith(json({ data: [], next_cursor: null }));
    await client.call(endpoints.listTransactions, { query: { type: 'expense' } });
    expect(lastCall().url).toBe('/api/v1/transactions?limit=50&type=expense');
  });

  it('attaches an Idempotency-Key to transaction creates, reusing a given key', async () => {
    const tx = {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'expense',
      amount: { amount_minor: 2150, currency: 'USD', formatted: '$21.50' },
      base_amount: { amount_minor: 2150, currency: 'USD', formatted: '$21.50' },
      fx: { rate: '1', rate_date: '2026-09-16', estimated: false },
      category: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Food',
        icon: 'utensils',
        color: 'cat-food',
      },
      transaction_date: '2026-09-16',
      note: null,
      created_at: '2026-09-16T12:30:00Z',
      updated_at: '2026-09-16T12:30:00Z',
    };
    const body = {
      type: 'expense',
      amount_minor: 2150,
      currency: 'USD',
      category_id: tx.category.id,
      transaction_date: '2026-09-16',
    } as const;

    const first = clientWith(json(tx, 201));
    await first.client.call(endpoints.createTransaction, { body });
    expect(first.lastCall().headers.get('idempotency-key')).toBe('key-1');
    expect(first.lastCall().headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(first.lastCall().init.body as string)).toEqual(body);

    const retry = clientWith(json(tx, 201));
    await retry.client.call(endpoints.createTransaction, { body, idempotencyKey: 'outbox-7' });
    expect(retry.lastCall().headers.get('idempotency-key')).toBe('outbox-7');
  });

  it('does not attach an Idempotency-Key to other writes', async () => {
    const { client, lastCall } = clientWith(new Response(null, { status: 204 }));
    await expect(
      client.call(endpoints.deleteGoal, { params: { id: GOAL_ID } }),
    ).resolves.toBeNull();
    expect(lastCall().headers.has('idempotency-key')).toBe(false);
  });

  it('turns an error envelope into a typed ApiError', async () => {
    const envelope = {
      error: {
        code: 'COUPLE_REQUIRED',
        message: 'Connect with your partner first.',
        request_id: 'req_9',
      },
    };
    const { client } = clientWith(json(envelope, 409));
    const body = {
      type: 'couple',
      name: 'Trip',
      target_amount_minor: 1000,
      target_date: '2026-12-31',
    } as const;
    const error = await client.call(endpoints.createGoal, { body }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'COUPLE_REQUIRED', status: 409, requestId: 'req_9' });
  });

  it('rejects a malformed success body instead of passing it on', async () => {
    const { client } = clientWith(json({ ...goalDetail, balance: 600 }));
    await expect(
      client.call(endpoints.getGoal, { params: { id: GOAL_ID } }),
    ).rejects.toBeInstanceOf(ApiContractError);
  });

  it('rejects a non-JSON body and a malformed error body', async () => {
    const html = clientWith(new Response('<html>', { status: 200 }));
    await expect(html.client.call(endpoints.getMe, {})).rejects.toBeInstanceOf(ApiContractError);
    const junk = clientWith(json({ oops: true }, 500));
    await expect(junk.client.call(endpoints.getMe, {})).rejects.toBeInstanceOf(ApiContractError);
  });

  it('validates input before sending: a bad body never reaches the network', async () => {
    const { client } = clientWith(json({}));
    const bad = {
      type: 'expense',
      amount_minor: -5,
      currency: 'USD',
      category_id: GOAL_ID,
      transaction_date: '2026-09-16',
    } as const;
    await expect(client.call(endpoints.createTransaction, { body: bad })).rejects.toThrow();
  });
});
