import { env, type ApiMode } from './env';

// The frontend issues identical requests in both modes. In `mock` mode the MSW worker
// (F4) intercepts them and answers from the frozen contract; in `live` mode they reach
// the real Route Handlers. Nothing above this module knows which one is answering.

export interface ApiClientOptions {
  mode: ApiMode;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export interface ApiClient {
  readonly mode: ApiMode;
  /** True when the MSW worker must be started before the first request. */
  readonly usesMockWorker: boolean;
  url(path: string): string;
  request(path: string, init?: RequestInit): Promise<Response>;
}

export function createApiClient({
  mode,
  baseUrl,
  fetch: doFetch = globalThis.fetch,
}: ApiClientOptions): ApiClient {
  const base = baseUrl.replace(/\/+$/, '');
  const url = (path: string) => `${base}/${path.replace(/^\/+/, '')}`;
  return {
    mode,
    usesMockWorker: mode === 'mock',
    url,
    request: (path, init = {}) => {
      const headers = new Headers(init.headers);
      if (!headers.has('accept')) headers.set('accept', 'application/json');
      return doFetch(url(path), { ...init, headers });
    },
  };
}

export const apiClient = createApiClient({
  mode: env.NEXT_PUBLIC_API_MODE,
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL,
});
