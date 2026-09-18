# Backend acceptance checklist

The backend — and therefore the MVP — is complete when every box below is ticked with
linked evidence. Completed in B11 and reviewed at that phase's approval gate.

Status key: ☐ not started · ◐ in progress · ☑ passed · ⊘ deferred (reason + owner).

## 1. Schema and data

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 1.1 | Schema matches §9.3 exactly — every table, type, constraint, index | Schema diff | ☐ |
| 1.2 | No stored goal balance anywhere (BR-08) | Schema review | ☐ |
| 1.3 | BR-06's one-open-membership index rejects a second membership | pgTAP | ☐ |
| 1.4 | Seeded currencies include LRD, and JPY (exp 0) and KWD (exp 3) | Seed test | ☐ |
| 1.5 | 14 default categories seeded, system-owned and immutable | Seed test | ☐ |
| 1.6 | `app_config` carries F-19 thresholds; changing them changes status with no deploy | Integration test | ☐ |
| 1.7 | Constraint tests cover every business rule encoded in the DDL | pgTAP | ☐ |
| 1.8 | Generated types committed and current; stale types fail CI | CI | ☐ |

## 2. Row-Level Security — the privacy guarantee

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 2.1 | RLS enabled on every table; no table readable without an explicit policy | pgTAP | ☐ |
| 2.2 | §9.5 matrix implemented exactly, verb by verb | Policy review | ☐ |
| 2.3 | Four-role suite (owner / partner / stranger / ex-partner) passes for every table | pgTAP | ☐ |
| 2.4 | **A partner cannot read the other's transactions, individual goals or profile financials** | pgTAP | ☐ |
| 2.5 | A stranger cannot read any couple goal or contribution by id | pgTAP | ☐ |
| 2.6 | An ex-partner reads archived couple history but cannot contribute | pgTAP | ☐ |
| 2.7 | A user cannot insert a contribution with another user's `user_id` | pgTAP | ☐ |
| 2.8 | `accept_invitation` rejects all five §23.2 cases | pgTAP | ☐ |
| 2.9 | `partner_profile` exposes name only | pgTAP | ☐ |
| 2.10 | A new table without an RLS suite fails a coverage check | CI | ☐ |

## 3. Derived layer

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 3.1 | `goal_balances` is a view; balances always derived | pgTAP | ☐ |
| 3.2 | `period_summary` reproduces §6.5, excluding a partner's contributions | pgTAP | ☐ |
| 3.3 | `spending_series` buckets in the user's timezone; ISO Monday weeks | pgTAP (T-13, T-14) | ☐ |
| 3.4 | `sync_goal_completion` both sets **and clears** `completed_at` | pgTAP | ☐ |
| 3.5 | `end_couple` archives goals, preserves read access for both | pgTAP | ☐ |
| 3.6 | `recalc_base_amounts` re-converts at each record's own date, preserving originals | pgTAP | ☐ |
| 3.7 | Both `security definer` functions reviewed; `search_path` pinned; no dynamic SQL | Review | ☐ |

## 4. Auth

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 4.1 | Cookie sessions: HTTP-only, Secure, SameSite=Lax; **no token in client storage** | Storage test | ☐ |
| 4.2 | Sessions survive reload and browser restart (WAC-02) | E2E | ☐ |
| 4.3 | Logout clears cookies, query cache and offline stores | E2E | ☐ |
| 4.4 | Registration creates exactly one profile via trigger | Integration | ☐ |
| 4.5 | Password reset revokes all other sessions | Two-session test | ☐ |
| 4.6 | No account enumeration: identical response shape, message and timing | Integration | ☐ |
| 4.7 | Rate limits on identifier **and** IP; 429 with `Retry-After` | Integration | ☐ |
| 4.8 | Cross-origin mutations rejected (CSRF) | Integration | ☐ |
| 4.9 | Email from a verified domain (SPF, DKIM, DMARC); SMS delivers | Manual | ☐ |
| 4.10 | Passwords ≥ 10 chars with breached-password check enabled | Config | ☐ |

## 5. API and contract

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 5.1 | Every endpoint in `api-contract.md` implemented | Coverage check | ☐ |
| 5.2 | **Contract suite passes using the same fixtures as the MSW mocks** | CI | ☐ |
| 5.3 | §10.5 goal-detail payload reproduces exactly (incl. ADR-004 pace) | Fixture test | ☐ |
| 5.4 | §16.3 insights payload reproduces exactly | Fixture test | ☐ |
| 5.5 | Idempotent replay returns the original response, creates no duplicate | Integration | ☐ |
| 5.6 | Foreign or missing resources return **404, never 403**, everywhere | Sweep test | ☐ |
| 5.7 | All calculation via `packages/domain`; no server-side reimplementation | Lint | ☐ |
| 5.8 | All user data through the RLS-scoped client; service-role only in the three §8.5 jobs | Lint + CI | ☐ |
| 5.9 | Errors always use the §10.2 envelope; no stack traces, SQL or internal ids | Integration | ☐ |
| 5.10 | Authorization enforced twice — guard still denies with RLS disabled in a harness | Integration | ☐ |
| 5.11 | No sequential scans on hot paths | EXPLAIN review | ☐ |

## 6. Multi-currency

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 6.1 | `fx-sync` runs at 01:00 UTC with retries at 01:30 and 03:00 | Cron + logs | ☐ |
| 6.2 | Fallback engages on primary failure **or omission** | Integration | ☐ |
| 6.3 | Every seeded currency confirmed available, or deactivated with a record | Report | ☐ |
| 6.4 | Conversion uses the **record's own date** rate (BR-14) | Integration | ☐ |
| 6.5 | `fx_estimated` set and surfaced for pre-launch dates (F-24) | Integration | ☐ |
| 6.6 | T-11 and T-12 pass through the real API | Integration | ☐ |
| 6.7 | Base-currency change re-expresses totals, preserves originals, leaves goal currencies alone | E2E (WAC-15) | ☐ |
| 6.8 | Recalculation < 5 s for 10,000 records; 100k figure documented | Load test | ☐ |
| 6.9 | 72-hour staleness alerts; users see "rates last updated" | Integration | ☐ |
| 6.10 | Provider attribution served and displayed | Manual | ☐ |

## 7. Jobs and notifications

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 7.1 | Four scheduled jobs registered and running | Cron | ☐ |
| 7.2 | Boundaries correct at 48 h, 30 days, 7 days | Clock tests | ☐ |
| 7.3 | 29-day soft-deleted transaction restorable; 31-day gone | Integration | ☐ |
| 7.4 | Three emails send and render on mobile | Manual | ☐ |
| 7.5 | Optional emails respect preferences; invitation email not suppressible | Integration | ☐ |
| 7.6 | No email exposes data the recipient isn't entitled to | Review + test | ☐ |
| 7.7 | Every job idempotent and re-runnable | Integration | ☐ |
| 7.8 | Job failures alert to Sentry | Forced failure | ☐ |

## 8. Integration

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 8.1 | Every domain live; mock mode still works for development | Manual | ☐ |
| 8.2 | Full Playwright suite green against the real stack, three browsers + mobile | CI | ☐ |
| 8.3 | Two-user couple scenario passes against **real RLS** | E2E | ☐ |
| 8.4 | Offline sync produces exactly one record against real idempotency storage | E2E (WAC-17) | ☐ |
| 8.5 | Conversion preview equals stored value using real rates | E2E (WAC-14) | ☐ |
| 8.6 | Drift log complete; every divergence resolved | Document | ☐ |
| 8.7 | MSW retained and green for tests and Storybook | CI | ☐ |
| 8.8 | No contract change without an ADR | Git history | ☐ |

## 9. Security and observability

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 9.1 | All §24.4 headers present; CSP enforced, no `unsafe-inline` scripts | Header report | ☐ |
| 9.2 | Every line of §25.1 evidenced | Checklist doc | ☐ |
| 9.3 | Sentry receives errors and traces with financial data scrubbed | Forced error | ☐ |
| 9.4 | `/api/health` reflects real dependency health; uptime every 5 min | Monitoring | ☐ |
| 9.5 | Notes render as text; XSS attempt inert | Integration | ☐ |
| 9.6 | Invitation tokens 32 bytes, hashed at rest, single-use, 7-day expiry | Integration | ☐ |
| 9.7 | Dashboard API p95 ≤ 800 ms under load | k6 (WAC-20) | ☐ |
| 9.8 | Logs and analytics contain no amounts, notes or category names | Log audit | ☐ |
| 9.9 | Dependabot and secret scanning active with triage | Config | ☐ |

## 10. Deployment

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 10.1 | Full §24.3 pipeline runs; each stage blocks on failure | CI | ☐ |
| 10.2 | Preview deploy per PR against staging Supabase | CI | ☐ |
| 10.3 | Production requires manual approval; smoke tests run after | CI | ☐ |
| 10.4 | Expand → migrate → contract proven by a no-downtime rename | Rehearsal | ☐ |
| 10.5 | Production on **Phase 2** infrastructure, not free tier | Config | ☐ |
| 10.6 | Supabase Pro daily backups + weekly encrypted R2 dumps, 8-week retention | Config | ☐ |
| 10.7 | **Restore drill completed with a measured recovery time** | Drill doc | ☐ |
| 10.8 | Rollback runbook written and rehearsed | Document | ☐ |
| 10.9 | Secrets in environment stores; service-role check active | CI | ☐ |

## 11. Launch readiness — §27 Definition of Done

| # | §27 item | Status |
|---|---|---|
| 11.1 | Auth (register, verify, login, logout, reset), base-currency setup, session persistence on all supported browsers | ☐ |
| 11.2 | Income and expense tracking with multi-currency conversion, editing, deletion with undo, correct recalculation | ☐ |
| 11.3 | Period calculations for today/week/month and daily/weekly/monthly insights with previous-period comparison | ☐ |
| 11.4 | Individual goals, couple invitations, couple goals, contributions, derived balances, pace, status, projection | ☐ |
| 11.5 | **Couple privacy guaranteed by RLS and proven by automated tests** | ☐ |
| 11.6 | All WAC-01…WAC-20 pass; domain coverage 100%; no serious/critical a11y violations | ☐ |
| 11.7 | Loading, empty, error and offline states on every primary screen | ☐ |
| 11.8 | Phase 2 infrastructure live: Supabase Pro with backups, monitoring, alerting, security headers, completed restore drill | ☐ |

## 12. Handover

| # | Criterion | Status |
|---|---|---|
| 12.1 | `traceability-matrix.md` has no unevidenced row | ☐ |
| 12.2 | Analytics support every §25.2 metric with no forbidden data | ☐ |
| 12.3 | §26 known limitations confirmed absent **by intent** and in the release notes | ☐ |
| 12.4 | Launch runbook and first-week monitoring plan exist | ☐ |
| 12.5 | `docs/plans/README.md` status table complete | ☐ |
| 12.6 | Open questions closed or carried to a v1.1 list | ☐ |

---

**Sign-off.** Owner: ____________ Date: ____________

Approving this checklist declares the SpendTogether MVP complete and ready to launch.
