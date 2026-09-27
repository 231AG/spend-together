import { z } from 'zod';

// The error envelope and its nine stable codes (spec §10.2). No tenth code exists; adding
// one is a contract change that needs an ADR.

export const ERROR_STATUS = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  COUPLE_REQUIRED: 409,
  GOAL_ARCHIVED: 409,
  RATE_LIMITED: 429,
  FX_UNAVAILABLE: 503,
  INTERNAL: 500,
} as const;

export const ErrorCode = z.enum(
  Object.keys(ERROR_STATUS) as [keyof typeof ERROR_STATUS, ...(keyof typeof ERROR_STATUS)[]],
);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorEnvelope = z.strictObject({
  error: z.strictObject({
    /** Stable and machine-readable. Clients branch on this, never on `message`. */
    code: ErrorCode,
    /** Human-readable, safe to show. Never contains stack traces or SQL (§10.1). */
    message: z.string(),
    /** Per-field messages for VALIDATION_FAILED, keyed by request field name. */
    fields: z.record(z.string(), z.string()).optional(),
    request_id: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/** HTTP status for a code. */
export const statusFor = (code: ErrorCode): number => ERROR_STATUS[code];
