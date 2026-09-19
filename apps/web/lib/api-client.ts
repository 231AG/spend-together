import { env, isMockMode } from '@/src/env';

/**
 * Typed API client.
 *
 * In F1 this gains per-endpoint response parsing against the frozen Zod schemas,
 * so an unparseable response becomes an error rather than an undefined that
 * surfaces three components later. For now it only resolves the base URL from
 * the API-mode switch, which is what F0 needs to prove.
 */
export function apiBaseUrl(): string {
  return env.NEXT_PUBLIC_API_BASE_URL;
}

export function apiMode(): 'mock' | 'live' {
  return isMockMode ? 'mock' : 'live';
}
