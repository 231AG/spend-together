import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import { authProblem } from './auth-copy';

const envelope = (code: string, fields?: Record<string, string>) =>
  ({
    error: { code, message: 'server words', request_id: 'r', ...(fields ? { fields } : {}) },
  }) as never;

describe('authProblem', () => {
  it('classifies each failure without using the server message', () => {
    expect(authProblem(new TypeError('Failed to fetch'))).toEqual({ kind: 'offline' });
    expect(authProblem(new ApiError(429, envelope('RATE_LIMITED')))).toEqual({ kind: 'lockout' });
    expect(authProblem(new ApiError(409, envelope('CONFLICT')))).toEqual({ kind: 'duplicate' });
    expect(authProblem(new ApiError(401, envelope('UNAUTHENTICATED')))).toEqual({
      kind: 'rejected',
    });
    expect(authProblem(new ApiError(422, envelope('VALIDATION_FAILED', { email: 'Bad' })))).toEqual(
      {
        kind: 'fields',
        fields: { email: 'Bad' },
      },
    );
    expect(authProblem(new ApiError(500, envelope('INTERNAL')))).toEqual({ kind: 'generic' });
    expect(authProblem(new Error('x'))).toEqual({ kind: 'generic' });
  });
});
