import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('accepts both API modes and defaults the base URL', () => {
    expect(parseEnv({ NEXT_PUBLIC_API_MODE: 'mock' })).toEqual({
      NEXT_PUBLIC_API_MODE: 'mock',
      NEXT_PUBLIC_API_BASE_URL: '/api/v1',
    });
    expect(
      parseEnv({ NEXT_PUBLIC_API_MODE: 'live', NEXT_PUBLIC_API_BASE_URL: '/v2' })
        .NEXT_PUBLIC_API_MODE,
    ).toBe('live');
  });

  it('names the missing variable', () => {
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_API_MODE/);
  });

  it('rejects an unknown mode', () => {
    expect(() => parseEnv({ NEXT_PUBLIC_API_MODE: 'staging' })).toThrow(/NEXT_PUBLIC_API_MODE/);
  });
});
