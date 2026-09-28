import { z } from 'zod';
import { Uuid } from './primitives';

// Auth (spec §10.3, §10.4, SCR-04..06). Web sessions live in HTTP-only cookies; native
// clients receive tokens in the body. Every auth failure message is generic so it never
// reveals which field was wrong or whether an account exists.

/** E.164 phone number, e.g. +231770123456. */
export const Phone = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Enter the number with its country code, e.g. +231…');
export const Email = z.email();

/** "Email or phone" field (SCR-04 auto-detects the format). */
export const Identifier = z.union([Email, Phone]);

/** Minimum 10 characters (SCR-04 strength hint). */
export const Password = z.string().min(10, 'Use at least 10 characters.').max(128);

const Name = z.string().trim().min(1).max(80);

/** `{name, email|phone, password}`: exactly one of email or phone. */
export const RegisterRequest = z.union([
  z.strictObject({ name: Name, email: Email, password: Password }),
  z.strictObject({ name: Name, phone: Phone, password: Password }),
]);

export const LoginRequest = z.strictObject({ identifier: Identifier, password: z.string().min(1) });

/** Tokens are returned only to native clients; web clients get cookies and `tokens: null`. */
export const AuthTokens = z.strictObject({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.iso.datetime(),
});

export const AuthSession = z.strictObject({
  user: z.strictObject({ id: Uuid, name: z.string(), onboarded: z.boolean() }),
  tokens: AuthTokens.nullable(),
});
export type AuthSession = z.infer<typeof AuthSession>;

export const RefreshRequest = z.strictObject({ refresh_token: z.string().min(1) });

/** Same response whether or not the account exists (no enumeration, SCR-06). */
export const ForgotPasswordRequest = z.strictObject({ identifier: Identifier });
export const AcknowledgedResponse = z.strictObject({ message: z.string() });

export const ResetPasswordRequest = z.strictObject({
  token: z.string().min(1),
  password: Password,
});

/** Confirms an email link or phone code. */
export const VerifyRequest = z.strictObject({
  identifier: Identifier,
  code: z.string().min(1),
  purpose: z.enum(['signup', 'recovery']),
});

/**
 * Send a new verification code or link (§7.1 "verification link expired → resend").
 * Answers the same whether or not the identifier has an account (no enumeration).
 * Added after the freeze by ADR-012.
 */
export const ResendVerificationRequest = z.strictObject({ identifier: Identifier });
