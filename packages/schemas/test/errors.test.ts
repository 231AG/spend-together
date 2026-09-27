import { describe, expect, it } from 'vitest';
import { ERROR_STATUS, ErrorCode, ErrorEnvelope, statusFor } from '../src/errors';
import example from './fixtures/spec-10-2-error.json';

describe('error envelope (§10.2)', () => {
  it('has exactly the nine spec codes with their statuses', () => {
    expect(ERROR_STATUS).toEqual({
      VALIDATION_FAILED: 422,
      UNAUTHENTICATED: 401,
      NOT_FOUND: 404,
      CONFLICT: 409,
      COUPLE_REQUIRED: 409,
      GOAL_ARCHIVED: 409,
      RATE_LIMITED: 429,
      FX_UNAVAILABLE: 503,
      INTERNAL: 500,
    });
    expect(ErrorCode.options).toHaveLength(9);
    expect(statusFor('COUPLE_REQUIRED')).toBe(409);
  });

  it('parses the §10.2 example unchanged', () => {
    expect(ErrorEnvelope.parse(example)).toEqual(example);
  });

  it('rejects an unknown code', () => {
    const bad = { error: { ...example.error, code: 'FORBIDDEN' } };
    expect(ErrorEnvelope.safeParse(bad).success).toBe(false);
  });

  it('WAC-08: COUPLE_REQUIRED has the same envelope shape', () => {
    const body = {
      error: {
        code: 'COUPLE_REQUIRED',
        message: 'Connect with your partner first.',
        request_id: 'req_1',
      },
    };
    expect(ErrorEnvelope.parse(body)).toEqual(body);
  });
});
