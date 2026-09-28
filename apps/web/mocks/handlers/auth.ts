import { mockClock } from '../clock';
import { db, type UserRecord } from '../db';
import { ApiFailure } from '../errors';
import { Reply, route } from '../http';

// Auth (§10.3, §10.4, FR-01…FR-04). Messages are generic: the mock never says which field
// was wrong or whether an account exists. Web sessions are cookies, so tokens are null;
// the mock keeps one signed-in session per worker.

const VERIFY_CODE = '123456';
const RESET_TOKEN = 'reset-token';
const REFRESH_TOKEN = 'refresh-token';

const CREDENTIALS_ERROR = 'That email, phone or password is not right.';

function findByIdentifier(identifier: string): UserRecord | undefined {
  const needle = identifier.trim().toLowerCase();
  return db.users.find((u) => u.email?.toLowerCase() === needle || u.phone === identifier.trim());
}

function session(user: UserRecord) {
  return {
    user: { id: user.id, name: user.name, onboarded: user.onboardedAt !== null },
    tokens: null,
  };
}

export const authHandlers = [
  route('register', ({ body }) => {
    const identifier = 'email' in body ? body.email : body.phone;
    if (findByIdentifier(identifier)) {
      // FR-01: rejected without revealing that the account exists.
      throw new ApiFailure(
        'CONFLICT',
        "We couldn't create an account with those details. Try signing in instead.",
      );
    }
    const now = db.nowIso();
    const user: UserRecord = {
      id: db.newId('user'),
      key: `runtime-${identifier}`,
      name: body.name,
      email: 'email' in body ? body.email.toLowerCase() : null,
      phone: 'phone' in body ? body.phone : null,
      password: body.password,
      baseCurrency: 'USD',
      timezone: 'Africa/Monrovia',
      notifyEmail: { invite_accepted: true, goal_completed: true },
      onboardedAt: null,
      createdAt: now,
    };
    db.users.push(user);
    db.sessionUserId = user.id;
    return session(user);
  }),

  route('login', ({ body }) => {
    db.assertLoginAllowed(body.identifier);
    const user = findByIdentifier(body.identifier);
    if (!user || user.password !== body.password) {
      db.recordLoginFailure(body.identifier);
      throw new ApiFailure('UNAUTHENTICATED', CREDENTIALS_ERROR);
    }
    db.clearLoginFailures(body.identifier);
    db.sessionUserId = user.id;
    return session(user);
  }),

  route('logout', () => {
    db.sessionUserId = null;
    return new Reply(null, 204);
  }),

  route('refresh', ({ body }) => {
    if (body.refresh_token !== REFRESH_TOKEN || db.sessionUserId === null) {
      throw new ApiFailure('UNAUTHENTICATED', 'Your session has ended. Sign in again.');
    }
    return {
      access_token: 'mock-access-token',
      refresh_token: REFRESH_TOKEN,
      expires_at: new Date(mockClock.now().getTime() + 60 * 60 * 1000).toISOString(),
    };
  }),

  // SCR-06: identical response whether or not the account exists.
  route('forgotPassword', () => ({
    message:
      'If an account exists for those details, we have sent instructions to reset the password.',
  })),

  route('resetPassword', ({ body }) => {
    if (body.token !== RESET_TOKEN) {
      throw new ApiFailure('UNAUTHENTICATED', 'This reset link has expired. Request a new one.');
    }
    return new Reply(null, 204);
  }),

  route('verify', ({ body }) => {
    const user = findByIdentifier(body.identifier);
    if (!user || body.code !== VERIFY_CODE) {
      throw new ApiFailure('UNAUTHENTICATED', 'That code is not right or has expired.');
    }
    db.sessionUserId = user.id;
    return session(user);
  }),
];

export const MOCK_AUTH = { VERIFY_CODE, RESET_TOKEN, REFRESH_TOKEN };
