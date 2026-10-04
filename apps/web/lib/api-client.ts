import { ErrorEnvelope, type Endpoint, type ErrorCode } from '@spendtogether/schemas';
import type { z } from 'zod';
import { env, type ApiMode } from './env';

// The frontend issues identical requests in both modes. In `mock` mode the MSW worker
// (F4) intercepts them and answers from the frozen contract; in `live` mode they reach
// the real Route Handlers. Nothing above this module knows which one is answering.
//
// Every response is parsed against its endpoint's schema, so an unvalidated payload can
// never reach a component: a malformed body is an ApiContractError, an error envelope is
// an ApiError, and nothing is ever a silent `undefined` downstream.

/** A well-formed error envelope from the API (spec §10.2). */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: Readonly<Record<string, string>>;
  readonly requestId: string;

  constructor(status: number, body: ErrorEnvelope) {
    super(body.error.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error.code;
    this.fields = body.error.fields ?? {};
    this.requestId = body.error.request_id;
  }
}

/** The server answered with something the contract does not allow. Always a bug. */
export class ApiContractError extends Error {
  readonly endpoint: string;
  readonly status: number;

  constructor(endpoint: string, status: number, detail: string) {
    super(`${endpoint} returned a response that breaks the contract (HTTP ${status}): ${detail}`);
    this.name = 'ApiContractError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

type Part<S, K extends string> = S extends z.ZodType
  ? { [P in K]: z.input<S> }
  : { [P in K]?: never };

/** Call input: `params`, `query` and `body` are required exactly when the endpoint has them. */
export type CallInput<E extends Endpoint> = Part<E['params'], 'params'> &
  Part<E['query'], 'query'> &
  Part<E['body'], 'body'> & {
    /** Reuse the same key when retrying one logical create (offline outbox, F12). */
    idempotencyKey?: string;
    signal?: AbortSignal;
  };

export type CallOutput<E extends Endpoint> = z.output<E['response']>;

export interface ApiClientOptions {
  mode: ApiMode;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  /** Idempotency keys for creates that were not given one. */
  newKey?: () => string;
}

export interface ApiClient {
  readonly mode: ApiMode;
  /** True when the in-page mock API must be started before the first request. */
  readonly usesMockWorker: boolean;
  url(path: string): string;
  call<E extends Endpoint>(endpoint: E, input: CallInput<E>): Promise<CallOutput<E>>;
}

/** Fill `:name` segments from validated params. */
function fillPath(path: string, params: Record<string, unknown> | undefined): string {
  return path.replace(/:([a-z_]+)/g, (_match, name: string) => {
    const value = params?.[name];
    if (typeof value !== 'string')
      throw new TypeError(`Missing path parameter "${name}" for ${path}`);
    return encodeURIComponent(value);
  });
}

function toSearch(query: Record<string, unknown> | undefined): string {
  if (!query) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      search.set(key, String(value));
    } else if (value !== undefined) {
      throw new TypeError(`Query parameter "${key}" must be a scalar`);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function createApiClient({
  mode,
  baseUrl,
  // Looked up per call, so test interceptors installed after import (msw/node) apply.
  fetch: doFetch = (input, init) => globalThis.fetch(input, init),
  newKey = () => crypto.randomUUID(),
}: ApiClientOptions): ApiClient {
  const base = baseUrl.replace(/\/+$/, '');
  const url = (path: string) => `${base}/${path.replace(/^\/+/, '')}`;

  async function call<E extends Endpoint>(
    endpoint: E,
    input: CallInput<E>,
  ): Promise<CallOutput<E>> {
    const raw: {
      params?: unknown;
      query?: unknown;
      body?: unknown;
      idempotencyKey?: string;
      signal?: AbortSignal;
    } = input;
    const { params, query, body, idempotencyKey, signal } = raw;
    // Validate input with the same schemas the server uses; a bad call fails here, loudly.
    const p = endpoint.params?.parse(params) as Record<string, unknown> | undefined;
    const q = endpoint.query?.parse(query ?? {}) as Record<string, unknown> | undefined;
    const b: unknown = endpoint.body?.parse(body);

    const name = `${endpoint.method} ${endpoint.path}`;
    const headers = new Headers({ accept: 'application/json' });
    if (endpoint.body) headers.set('content-type', 'application/json');
    if (endpoint.idempotent) headers.set('idempotency-key', idempotencyKey ?? newKey());

    const init: RequestInit = { method: endpoint.method, headers };
    if (endpoint.body) init.body = JSON.stringify(b);
    if (signal) init.signal = signal;
    const res = await doFetch(url(fillPath(endpoint.path, p)) + toSearch(q), init);

    if (res.ok) {
      if (endpoint.status === 204) {
        if (res.status !== 204)
          throw new ApiContractError(name, res.status, 'expected 204 No Content');
        return null as CallOutput<E>;
      }
      const json = await readJson(res, name);
      const parsed = endpoint.response.safeParse(json);
      if (!parsed.success) throw new ApiContractError(name, res.status, parsed.error.message);
      return parsed.data as CallOutput<E>;
    }

    const envelope = ErrorEnvelope.safeParse(await readJson(res, name));
    if (!envelope.success)
      throw new ApiContractError(name, res.status, 'error body is not an ErrorEnvelope');
    throw new ApiError(res.status, envelope.data);
  }

  return { mode, usesMockWorker: mode === 'mock', url, call };
}

async function readJson(res: Response, name: string): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    throw new ApiContractError(name, res.status, 'body is not JSON');
  }
}

let transport: typeof globalThis.fetch | null = null;

/** Mock mode: answer the app's calls in the page (mocks/in-page.ts) once it has started. */
export function setApiTransport(fetchImpl: typeof globalThis.fetch | null): void {
  transport = fetchImpl;
}

export const apiClient = createApiClient({
  mode: env.NEXT_PUBLIC_API_MODE,
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  fetch: (input, init) => (transport ?? globalThis.fetch)(input, init),
});
