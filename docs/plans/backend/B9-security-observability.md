# B9 — Security and observability

## 1. Objective

Complete the §25.1 security checklist, put security headers and a strict CSP in front of
the app, wire Sentry and uptime monitoring so failures are noticed by us rather than
reported by users, and meet the API half of WAC-20's performance budget.

## 2. Spec references

§25.1 (the security checklist, every line), §24.4 (security headers, monitoring, data
protection), §22 WAC-20 (dashboard API p95 ≤ 800 ms server time), §10.1 (rate limits,
404-not-403), §8.5 (service-role rule), §23 (k6 for API load).

## 3. Prerequisites

B8 complete — the real stack is in use end to end, so headers and instrumentation are
applied to what will actually ship.

## 4. Deliverables

- Security headers including a nonce-based strict CSP.
- Sentry for web and API with performance traces, scrubbed of financial data.
- `/api/health` and an uptime check every 5 minutes.
- Dependency and secret scanning verified active.
- k6 load tests proving the p95 budget.
- A completed §25.1 checklist with evidence.

## 5. Task breakdown

**B9-01 · Security headers and CSP** — strict CSP with nonce-based scripts, HSTS,
`X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, `frame-ancestors none`. *Files:* `next.config.ts`,
`middleware.ts`. *Acceptance:* §24.4 — headers present on every response; the CSP has **no
`unsafe-inline`** for scripts; the app functions with the policy enforced, not merely
report-only.

**B9-02 · Sentry with data scrubbing** — web and API errors plus performance traces. **No
amounts, notes or category names** reach Sentry (§24.4). *Files:* `sentry.*.config.ts`.
*Acceptance:* a deliberately thrown error with a money payload arrives with the money
redacted — verified by inspection, not by configuration alone.

**B9-03 · Health endpoint and uptime monitoring** — `/api/health` checking database
reachability and FX-rate freshness; external uptime check every 5 minutes. *Files:*
`app/api/health/route.ts`. *Acceptance:* §24.4 — the endpoint reflects real dependency
health rather than returning 200 unconditionally.

**B9-04 · §25.1 checklist verification** — walk every line: bcrypt hashing with a 10-char
minimum and the breached-password check; HTTP-only Secure SameSite=Lax cookies with no
tokens in `localStorage`; server-side Zod validation on every write with positive integer
amounts, dates ≤ today and length-capped notes rendered as text; authorization at guard
**and** RLS with 404 for foreign resources; 32-byte invitation tokens stored hashed,
single-use, 7-day expiry; rate limiting with generic errors; Dependabot and secret
scanning enabled. *Files:* `docs/plans/00-shared/security-checklist.md`. *Acceptance:*
every line evidenced by a test or a configuration screenshot — no line marked "done"
without proof.

**B9-05 · Note rendering safety** — notes are user input rendered as text, never HTML
(§25.1). *Acceptance:* a note containing `<script>` renders as literal text everywhere it
appears — activity rows, details, exports.

**B9-06 · Invitation token hardening** — 32 random bytes, stored as a SHA-256 hash, single
use, 7-day expiry, and the raw token only ever in the link. *Acceptance:* the database
never contains a raw token; a reused accepted token fails (already asserted in B2-12,
verified here at the API layer).

**B9-07 · k6 API load tests** — the dashboard endpoint under realistic concurrency.
*Files:* `load/dashboard.k6.js`. *Acceptance:* **WAC-20** — `GET /home/summary` p95 ≤ 800
ms server time at the target concurrency, on Phase-2-equivalent infrastructure.

**B9-08 · Query and index tuning** — address whatever B9-07 exposes. *Acceptance:* no
sequential scan on the hot paths under load; any added index is justified in the PR.

**B9-09 · Log hygiene review** — application logs and analytics exclude amounts, notes and
category names (§24.4). *Acceptance:* a log sample from a full user journey contains no
financial data.

**B9-10 · Dependency and secret scanning verification** — Dependabot and secret scanning
confirmed active with a triage owner. *Acceptance:* §25.1 — both on; open alerts triaged,
not merely present.

## 6. Tooling

New: Sentry SDK, k6 (CLI), an uptime monitoring service. Dependabot and secret scanning
were enabled in F0-10 and are verified here. The `security-review` skill runs across the
whole phase.

## 7. Testing

Header assertions on every route. A CSP violation test. A Sentry scrubbing test with a
real financial payload. An XSS test on notes. Load tests for the p95 budget. A log-content
audit over a complete journey.

Covers **WAC-20** (API half) and the whole of §25.1.

## 8. Exit criteria

1. All §24.4 security headers present; CSP enforced with no `unsafe-inline` scripts.
2. Every line of the §25.1 checklist is evidenced.
3. Sentry receives errors and traces with financial data scrubbed.
4. `/api/health` reflects real dependency health; uptime checks run every 5 minutes.
5. Notes render as text; an XSS attempt is inert.
6. Invitation tokens are 32 bytes, hashed at rest, single-use, 7-day expiry.
7. `GET /home/summary` p95 ≤ 800 ms server time under load.
8. No sequential scans on hot paths under load.
9. Logs and analytics contain no amounts, notes or category names.
10. Dependabot and secret scanning are active with triage.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A strict CSP breaks Next.js inline scripts or Recharts | Nonce-based policy tested against the full app in staging before production; report-only first, then enforced |
| Sentry captures financial data despite configuration | `beforeSend` scrubbing **plus** a test that throws a money-bearing error and inspects the payload |
| p95 budget missed on Phase 1 free-tier infrastructure | Measured on Phase-2-equivalent hardware (§24.2), because that is what users will run on |
| Security checklist becomes a box-ticking exercise | Every line requires linked evidence; unevidenced lines fail the gate |
| Health endpoint returns 200 while the database is unreachable | It actively checks dependencies, and a forced database outage is part of the acceptance test |

## 10. Estimate

**5 days.** Roughly: 1 day headers and CSP, 1 day Sentry and scrubbing, 0.5 day health and
uptime, 1 day the checklist walk with evidence, 1 day load testing and tuning, 0.5 day log
hygiene and scanning. Medium uncertainty, concentrated in CSP compatibility.

## 11. Approval gate

Owner reviews: a headers report; the CSP enforced with the app working; the Sentry
scrubbing proof; the k6 p95 result; and the fully evidenced §25.1 checklist. Then B10 may
start.
