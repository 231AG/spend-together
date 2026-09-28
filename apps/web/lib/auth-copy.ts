import { ApiError } from './api-client';

// Auth copy in one place (§7.1, §7.2, SCR-04…06, §19.2 Auth row) so every screen says
// exactly the same thing whatever the account's existence (FR-01, FR-04: no enumeration).

export const COPY = {
  credentials: 'Email/phone or password is incorrect.',
  lockout: 'Too many attempts. Try again in 15 minutes.',
  offline: "You're offline. Connect to sign in.",
  duplicate: 'An account with these details already exists.',
  forgotSent: "If an account exists, we've sent instructions.",
  resendSent: "If an account exists, we've sent a new code.",
  verifyFailed: 'That code is not right or has expired.',
  resetExpired: 'This reset link has expired. Request a new one.',
  resetDone: 'Your password has been changed and you have been signed out on your other devices.',
  generic: 'Something went wrong on our side. Your details are kept; try again.',
  mismatch: "Passwords don't match.",
} as const;

export type AuthProblem =
  | { kind: 'credentials' }
  | { kind: 'lockout' }
  | { kind: 'offline' }
  | { kind: 'duplicate' }
  | { kind: 'rejected' }
  | { kind: 'fields'; fields: Record<string, string> }
  | { kind: 'generic' };

/** Classify a failed auth call. A network failure (fetch rejects) is "offline". */
export function authProblem(error: unknown): AuthProblem {
  if (error instanceof TypeError) return { kind: 'offline' };
  if (!(error instanceof ApiError)) return { kind: 'generic' };
  switch (error.code) {
    case 'RATE_LIMITED':
      return { kind: 'lockout' };
    case 'CONFLICT':
      return { kind: 'duplicate' };
    case 'UNAUTHENTICATED':
      return { kind: 'rejected' };
    case 'VALIDATION_FAILED':
      return { kind: 'fields', fields: error.fields };
    default:
      return { kind: 'generic' };
  }
}

/** Where a pending verification is remembered between Register and Verify (tab only). */
export const PENDING_VERIFY_KEY = 'spendtogether.pending-verify';

export function rememberPendingVerify(identifier: string): void {
  try {
    window.sessionStorage.setItem(PENDING_VERIFY_KEY, identifier);
  } catch {
    // Verify asks for the identifier instead.
  }
}

export function pendingVerify(): string {
  try {
    return window.sessionStorage.getItem(PENDING_VERIFY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearPendingVerify(): void {
  try {
    window.sessionStorage.removeItem(PENDING_VERIFY_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** §12.1: the onboarding seen-once flag. Explicitly not security state. */
export const ONBOARDING_KEY = 'spendtogether.onboarding-seen';

export function onboardingSeen(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Onboarding shows again next time; harmless.
  }
}
