# B4 — Auth

## 1. Objective

Wire Supabase Auth into the Next.js app with cookie-based sessions via `@supabase/ssr`,
connect real email and SMS delivery, and enforce the rate limits §10.1 specifies — so
that the auth screens built in F6 against mocks work against a real identity provider
with no change to their markup.

## 2. Spec references

§8.1 (Supabase Auth via `@supabase/ssr`), §10.1 (auth conventions, rate limits, CSRF),
§10.3 (auth endpoints), §10.4 (forgot/reset/verify), §24.4 (email via Resend, SMS via
Twilio), §25.1 (password rules, session storage, generic errors), FR-01…FR-05, WAC-01,
WAC-02, §7.1, §7.2.

## 3. Prerequisites

B1, B2, B3 complete. Owner has provisioned the third-party accounts flagged in
open-questions **Q12** — Resend with a verified domain (SPF, DKIM, DMARC) and Twilio with
a number. These have real lead time and are not engineering work.

## 4. Deliverables

- `@supabase/ssr` cookie session handling: middleware, server client, browser client.
- `apps/web/server/auth.ts` — the single `getSession()` guard for both cookie and Bearer.
- Profile-creation trigger on `auth.users` insert.
- Custom SMTP (Resend) and SMS (Twilio) configured with branded templates.
- `apps/web/server/rate-limit.ts`.
- Origin-check CSRF protection on mutating routes.

## 5. Task breakdown

**B4-01 · Cookie session plumbing** — `@supabase/ssr` with HTTP-only, Secure,
SameSite=Lax cookies; middleware refresh; server and browser clients. *Files:*
`apps/web/middleware.ts`, `lib/supabase/{server,client}.ts`. *Acceptance:* **§25.1** —
**no token in `localStorage` or `sessionStorage`**, verified by a test that inspects
storage after login; sessions survive reload and browser restart (WAC-02).

**B4-02 · The `getSession()` guard** — one function resolving a web cookie session or a
native `Authorization: Bearer` token. *Files:* `apps/web/server/auth.ts`. *Acceptance:*
§10.1 — both paths resolve through the same guard; an unauthenticated request yields
`401 UNAUTHENTICATED` in the standard envelope.

**B4-03 · Profile creation trigger** — inserting into `auth.users` creates the matching
`profiles` row (§9.5 says profiles are inserted "via auth trigger"). *Files:*
`migrations/0007_auth_trigger.sql`. *Acceptance:* registration produces exactly one
profile; the trigger is idempotent.

**B4-04 · Register, login, logout, refresh** — the §10.3 endpoints wired to Supabase Auth.
Minimum 10-character passwords with the breached-password check enabled (§25.1).
*Files:* `app/api/v1/auth/*/route.ts`. *Acceptance:* **FR-01, FR-02, FR-03** — a duplicate
identifier returns `409 CONFLICT` with a **generic** message; the response is
indistinguishable in shape and timing from a non-duplicate failure.

**B4-05 · Forgot, reset and verify** — email link for email accounts, SMS code for phone
accounts. On successful reset, **all other sessions are revoked** (§7.2). *Files:*
`app/api/v1/auth/{forgot-password,reset-password,verify}/route.ts`. *Acceptance:*
**FR-04** — the confirmation response is byte-identical whether or not the account
exists; other sessions are genuinely revoked, verified with two live sessions.

**B4-06 · Email delivery (Resend)** — custom SMTP on a verified domain with SPF, DKIM and
DMARC; branded templates for verification and password reset. *Acceptance:* mail arrives
in the inbox, not spam, from the verified domain; templates render on mobile clients.

**B4-07 · SMS delivery (Twilio)** — phone verification and phone invitations, with
per-message cost acknowledged (§24.4). *Acceptance:* a code arrives and verifies; failures
degrade gracefully with a resend path.

**B4-08 · Rate limiting** — auth routes 5 attempts / 15 min / identifier **and** 20 / 15
min / IP; other writes 60 / min / user; `429` with `Retry-After`. *Files:*
`apps/web/server/rate-limit.ts`. *Acceptance:* §10.1 — both auth dimensions enforced
independently; the lockout message reveals nothing about account existence (§25.1).

**B4-09 · CSRF protection** — Origin header check on every mutating route using a cookie
session. *Files:* `apps/web/server/auth.ts`. *Acceptance:* §10.1 — a cross-origin POST
with valid cookies is rejected; a same-origin one succeeds.

**B4-10 · Session-clearing on logout** — server session ended; the client clears cookies,
the query cache and offline stores (the client half was built in F11/F12). *Acceptance:*
**WAC-02** — after logout nothing personal remains in browser storage.

## 6. Tooling

New: `@supabase/ssr` **0.12.7 — pinned exactly, not caret-ranged**, because it is pre-1.0
and sits on the authentication path. External: Resend, Twilio.

## 7. Testing

API integration tests for each endpoint: happy path, validation, rate limiting, and the
enumeration-safety assertions (identical shape and comparable timing for existing and
non-existing identifiers). A storage-inspection test proving no token is persisted in
client-readable storage. A two-session test proving password reset revokes the other.

Covers **FR-01…FR-05**; **WAC-01** and **WAC-02** end to end for the first time.

## 8. Exit criteria

1. Sessions are cookie-based, HTTP-only, Secure, SameSite=Lax; **no token in client
   storage**.
2. Sessions survive reload and browser restart; logout clears everything.
3. Register, login, logout, refresh, forgot, reset and verify all work against the real
   provider.
4. Registration creates exactly one profile row via the trigger.
5. Password reset revokes all other sessions.
6. No account enumeration: identical responses and messages either way.
7. Rate limits enforced on both identifier and IP dimensions, returning `429` with
   `Retry-After`.
8. Cross-origin mutations are rejected.
9. Email arrives from a verified domain; SMS delivers and verifies.
10. Passwords: minimum 10 characters, breached-password check enabled.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-14 third-party lead time | Raised in Q12 during planning; endpoints are built against mocked providers and switched at the end of the phase, so DNS propagation overlaps development |
| `@supabase/ssr` pre-1.0 API changes | Pinned exactly; the cookie handling is isolated in two files so an upgrade is contained |
| Enumeration leaks through **timing** rather than wording | Constant-time-ish handling: the same work is done for both branches, and the test compares distributions, not a single sample |
| Email lands in spam, silently breaking registration | SPF, DKIM and DMARC verified before launch; a deliverability check is part of this phase's acceptance |
| SMS costs escalate through abuse | Rate limits on the phone-invitation path; monitored in B9 |

## 10. Estimate

**5 days.** Roughly 1.5 days cookie plumbing and the guard, 1.5 days the endpoints, 1 day
email and SMS configuration, 1 day rate limiting, CSRF and the enumeration tests. Medium
uncertainty, mostly external.

## 11. Approval gate

Owner reviews: a real registration with a verification email; password reset revoking a
second live session; the rate-limit lockout; and a browser-storage inspection showing no
tokens. Then B5 may start.
