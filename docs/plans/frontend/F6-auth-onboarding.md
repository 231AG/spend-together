# F6 — Auth and onboarding UI

## 1. Objective

Build the seven screens that get a new user from first visit to a usable Home: welcome,
onboarding, register, login, forgot/reset password, verification, and base-currency
setup — all against F4's mocked auth adapter. Security posture is part of the UI here:
no account enumeration anywhere, generic credential errors, lockout messaging that
reveals nothing, and password fields that work with password managers.

## 2. Spec references

SCR-01 (splash/session restore), SCR-02 (welcome), SCR-03 (onboarding), SCR-04
(register), SCR-05 (login), SCR-06 (forgot/reset), SCR-07 (currency setup); §7.1 (first
launch), §7.2 (login and reset); FR-01…FR-05; §12.1 routes; §19.2 Auth row; §20
(authentication accessibility, WCAG 3.3.8); §25.1 (password rules); W-08 wireframe.

## 3. Prerequisites

F3 complete (forms, pickers, buttons). F4 complete (auth handlers with rate limiting and
generic errors). F5 complete (route groups, guest-only guards, `?next=` handling).

## 4. Deliverables

Seven screens at `/` , `/onboarding`, `/register`, `/login`, `/forgot-password`,
`/reset-password`, `/verify`, `/setup/currency`, plus the splash/session-restore
behaviour, all with their loading, error and offline states from §19.2.

## 5. Task breakdown

**F6-01 · Splash / session restore (SCR-01)** — *Purpose:* never a dead end. Progress
indicator only after 400 ms; valid session → `/home` or `/setup/currency` if not
onboarded; no session → Welcome; network failure → "Can't reach SpendTogether" + Retry.
*Files:* `app/(public)/page.tsx`, `components/features/auth/session-restore.tsx`.
*Acceptance:* all four outcomes reachable via the scenario switcher; the failure state
offers Retry rather than hanging.

**F6-02 · Welcome (SCR-02)** — brand, tagline, illustration, the three-line promise,
Create account (primary), Log in (secondary); desktop split layout with illustration
right. *Files:* `app/(public)/page.tsx`. *Acceptance:* matches W-08 content; renders at
320 px without horizontal scroll.

**F6-03 · Onboarding (SCR-03)** — three skippable pages with the exact content from
SCR-03; dots, Skip, Next / Get started; swipe or arrow keys. Seen-once flag in
`localStorage` (explicitly non-sensitive, per §12.1). *Files:*
`app/(public)/onboarding/page.tsx`. *Acceptance:* arrow keys move between pages; Skip
goes to `/register`; the flag suppresses it on return but a direct URL still renders it.

**F6-04 · Register (SCR-04)** — name, email-or-phone with format auto-detection, password
with show/hide and a min-10-character strength hint, confirm password. Validation on
blur; submit disabled with an inline spinner while pending. *Files:*
`app/(auth)/register/page.tsx`. *Acceptance:* **FR-01** — a duplicate identifier returns
a generic conflict message with a Log in link and reveals nothing else; autocomplete
attributes are `name`, `email`/`tel`, `new-password`; paste is allowed.

**F6-05 · Login (SCR-05)** — identifier, password with show/hide, forgot link. The error
sits above the button and never says which field was wrong. After five failures: "Too
many attempts. Try again in 15 minutes." *Files:* `app/(auth)/login/page.tsx`.
*Acceptance:* **FR-02** — the generic error is identical for unknown identifier and wrong
password; `?next=` is honoured same-origin only; `current-password` autocomplete present.

**F6-06 · Forgot / reset password (SCR-06)** — step 1 identifier → *always* "If an account
exists, we've sent instructions"; step 2 new password + confirm. *Files:*
`app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx`. *Acceptance:* **FR-04**
— the confirmation message is byte-identical whether or not the account exists; on
success the UI states that other sessions were signed out.

**F6-07 · Verification** — the post-registration verify step, with an expired-link path
offering resend (§7.1). *Files:* `app/(auth)/verify/page.tsx`. *Acceptance:* an expired
token renders the resend screen, not an error page.

**F6-08 · Currency setup (SCR-07)** — searchable currency list showing code and name,
pre-selected from browser locale, detected timezone with a Change link, Continue →
`PATCH /me` → `/home` empty state. *Files:* `app/(setup)/setup/currency/page.tsx`.
*Acceptance:* **FR-05** — locale pre-selection works and is overridable; the detected
timezone is shown and changeable; the list is keyboard navigable and searchable.

**F6-09 · States and copy** — loading (button spinners), error (generic credential,
lockout), offline ("You're offline. Connect to sign in."). *Files:* across the above.
*Acceptance:* every §19.2 Auth-row state renders; input is preserved through every
failure.

## 6. Tooling

No new packages. The `component-checklist` skill governs each screen's state coverage.

## 7. Testing

Component tests for validation timing (blur, not keystroke), the enumeration-safe
messages, and autocomplete attributes. Playwright covers **flow 7.1** (first launch →
register → verify → currency → Home) and **flow 7.2** (login, wrong credentials, lockout,
forgot password). axe on every screen and state.

Covers **FR-01…FR-05**; the frontend half of **WAC-01** (register → currency → Home in
under 90 s, duplicates rejected without disclosure) and **WAC-02** (session persistence —
completed once real sessions exist in B8).

## 8. Exit criteria

1. All seven screens built with every §19.2 Auth state.
2. No account enumeration anywhere — asserted by tests comparing responses and copy for
   existing and non-existing identifiers.
3. Lockout messaging appears after five failures and reveals nothing.
4. Password managers and paste work; autocomplete attributes correct (WCAG 3.3.8).
5. Locale-based currency pre-selection and timezone detection both work and are
   overridable.
6. Playwright flows 7.1 and 7.2 pass against MSW.
7. axe clean on every screen and state; full keyboard operation.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Enumeration leaks through a subtle difference — timing, wording, focus | Tests assert identical copy *and* identical response shape for both cases; the mock enforces it too |
| `?next=` becomes an open redirect | Same-origin validation in F5-02, with a test for an absolute external URL |
| Timezone detection is wrong or unavailable | Fall back to UTC with the Change link prominent; never block Continue |
| Onboarding `localStorage` flag treated as security state | It is explicitly non-sensitive (§12.1); no auth decision reads it |

## 10. Estimate

**4 days.** Roughly 2.5 days across the seven screens, 1 day on states, copy and the
enumeration tests, 0.5 day on the two Playwright flows. Low uncertainty — these are
well-specified, self-contained forms.

## 11. Approval gate

Owner reviews: the registration and login flows end to end; the identical forgot-password
confirmation for a real and a fake identifier; the lockout message; currency setup with a
non-US locale. Then F7 may start.
