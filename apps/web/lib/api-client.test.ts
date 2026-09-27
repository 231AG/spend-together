import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './api-client';

describe('createApiClient', () => {
  it('joins the base URL and path without doubling slashes', () => {
    const client = createApiClient({ mode: 'live', baseUrl: '/api/v1/' });
    expect(client.url('/transactions')).toBe('/api/v1/transactions');
    expect(client.url('me')).toBe('/api/v1/me');
  });

  it('starts the mock worker only in mock mode', () => {
    expect(createApiClient({ mode: 'mock', baseUrl: '/api/v1' }).usesMockWorker).toBe(true);
    expect(createApiClient({ mode: 'live', baseUrl: '/api/v1' }).usesMockWorker).toBe(false);
  });

  it('sends the same request in both modes, asking for JSON', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response('{}')));
    for (const mode of ['mock', 'live'] as const) {
      await createApiClient({ mode, baseUrl: '/api/v1', fetch }).request('goals', {
        method: 'GET',
      });
    }
    const [first, second] = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(first?.[0]).toBe('/api/v1/goals');
    expect(second?.[0]).toBe(first?.[0]);
    expect(new Headers(first?.[1].headers).get('accept')).toBe('application/json');
  });
});
