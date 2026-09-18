# B7 — Jobs and notifications

## 1. Objective

Run the scheduled work the product depends on quietly — purging idempotency keys and
soft-deleted records, expiring invitations — and send the three emails the spec promises,
honouring the user's notification preferences.

## 2. Spec references

§24.4 (scheduled jobs), §9.3 (`idempotency_keys` purged after 48 h; soft deletes purged
after 30 days), §10.3 (`DELETE /transactions/:id` "purged after 30 days"), §7.8
(invitation expiry after 7 days), FR-26 (the three emails and which two are optional),
§9.3 `profiles.notify_email`, §24.4 (Resend).

## 3. Prerequisites

B4 (email delivery configured), B5 (the services the jobs act through), B6 (pg_cron
already in use).

## 4. Deliverables

- pg_cron jobs: idempotency purge (hourly), soft-delete purge (daily, > 30 days),
  invitation expiry (hourly). `fx-sync` was scheduled in B6.
- Three transactional emails: partner invitation, invitation accepted, couple goal
  completed.
- Preference enforcement from `profiles.notify_email`.
- Job observability — every run recorded, failures alerting.

## 5. Task breakdown

**B7-01 · Idempotency purge** — delete `idempotency_keys` older than 48 hours, hourly.
*Files:* `migrations/0009_jobs.sql`. *Acceptance:* §9.3 — keys older than 48 h disappear;
a key at 47 h still replays correctly, which is the boundary that matters.

**B7-02 · Soft-delete purge** — permanently remove transactions with
`deleted_at < now() - 30 days`, daily. *Acceptance:* §10.3 — a transaction soft-deleted 31
days ago is gone; one deleted 29 days ago is still restorable via ADR-003's endpoint.

**B7-03 · Invitation expiry** — mark `pending` invitations past `expires_at` as `expired`,
hourly. *Acceptance:* §7.8 — a 7-day-old invitation becomes `expired` and its token stops
working; the inviter's SCR-19 card reflects it and offers Resend.

**B7-04 · Invitation email** — sent on invite, containing the tokenised link. Not optional
(FR-26 makes only the other two switchable). *Acceptance:* the link resolves to
`/invite/[token]` and shows the inviter's first name only.

**B7-05 · Invitation-accepted email** — to the inviter, respecting
`notify_email.invite_accepted`. *Acceptance:* **FR-26** — suppressed when the preference is
off; sent when on.

**B7-06 · Couple-goal-completed email** — to both members when a couple goal completes,
respecting `notify_email.goal_completed`. *Acceptance:* §7.7 — fires on the completion
transition only, not on every contribution to an already-complete goal, and not at all for
individual goals.

**B7-07 · Email templates** — branded, plain-language, mobile-legible, with a working
unsubscribe path to the preference screen. Content carries **no amounts** beyond what the
recipient is already entitled to see. *Acceptance:* a couple-goal-completed email reveals
nothing about the partner's personal finances (BR-05).

**B7-08 · Job observability** — each run logs start, end, rows affected and outcome;
failures alert to Sentry. *Acceptance:* a forced failure alerts; a silent job failure is
detectable rather than invisible.

**B7-09 · Idempotent, re-runnable jobs** — every job is safe to run twice. *Acceptance:*
running each job twice in succession produces no duplicate side effect and no duplicate
email.

## 6. Tooling

pg_cron (already in use from B6), Resend (configured in B4).

## 7. Testing

Integration tests with a manipulated clock: the 47-hour and 49-hour idempotency
boundaries, 29 and 31 days for purge, 6 and 8 days for invitation expiry. Email tests
assert send-or-suppress against each preference combination and that no forbidden data
appears in a body.

Covers **FR-26**; supports **WAC-12** (emails must not leak partner data).

## 8. Exit criteria

1. All four scheduled jobs (three here plus `fx-sync`) are registered and run on schedule.
2. Boundary behaviour is correct at 48 h, 30 days and 7 days.
3. A transaction soft-deleted 29 days ago is still restorable; 31 days ago is gone.
4. All three emails send correctly and render on mobile clients.
5. Both optional emails respect their preference; the invitation email is not suppressible.
6. No email exposes data the recipient is not entitled to.
7. Every job is idempotent and re-runnable.
8. Job failures alert to Sentry.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A purge deletes more than intended | Every purge is written as a `select` first, reviewed against seeded data, then converted to a delete; run in a transaction with a row-count assertion |
| A job fails silently for weeks | Per-run logging plus Sentry alerting (B7-08); a job that has not run in twice its interval alerts |
| Goal-completed email fires repeatedly | Keyed to the completion transition (the trigger from B3-05), not to goal state |
| Email leaks partner financial data | Template content reviewed against BR-05; asserted by test |
| Purging breaks Undo for a user mid-action | The 30-day window is far beyond the 5-second Undo; `undo_until` is server-tracked |

## 10. Estimate

**4 days.** Roughly 1.5 days the three jobs with boundary tests, 1.5 days the three emails
and templates, 1 day observability and idempotency. Low uncertainty.

## 11. Approval gate

Owner reviews: each job running with its row counts; the three emails rendered on a phone;
preferences suppressing the optional two; and a forced job failure alerting. Then B8 may
start.
