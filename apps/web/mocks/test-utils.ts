import { endpoints, type EndpointName } from '@spendtogether/schemas';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { ApiError, createApiClient, type CallInput, type CallOutput } from '@/lib/api-client';
import { mockClock } from './clock';
import { db } from './db';
import { uid } from './ids';
import { applyScenario, resetScenario, type ScenarioState } from './scenarios';
import { server } from './server';

// Test harness: the real typed client (which validates every response against the frozen
// schemas) talking to the real handlers through MSW's Node server.

export const BASE = 'http://localhost/api/v1';

let keySeq = 0;
export const api = createApiClient({
  mode: 'mock',
  baseUrl: BASE,
  // Look fetch up per call: MSW patches globalThis.fetch after this module loads.
  fetch: (input, init) => globalThis.fetch(input, init),
  newKey: () => {
    keySeq += 1;
    return `test-key-${keySeq}`;
  },
});

export function useMockServer(scenario: Partial<ScenarioState> = {}) {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });
  beforeEach(() => {
    resetScenario();
    applyScenario({ recalcMs: 0, ...scenario });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
    mockClock.reset();
  });
}

export function call<N extends EndpointName>(name: N, input: CallInput<(typeof endpoints)[N]>) {
  return api.call(endpoints[name], input) as Promise<CallOutput<(typeof endpoints)[N]>>;
}

/** The ApiError a call fails with (fails the test if it succeeds). */
export async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the call to fail');
}

export function signInAs(key: string) {
  db.sessionUserId = uid(`user:${key}`);
}

export const id = {
  user: (key: string) => uid(`user:${key}`),
  goal: (key: string) => uid(`goal:${key}`),
  tx: (key: string) => uid(`tx:${key}`),
  category: (key: string) => uid(`category:${key}`),
  contribution: (key: string) => uid(`contribution:${key}`),
  invitation: (key: string) => uid(`invitation:${key}`),
};
