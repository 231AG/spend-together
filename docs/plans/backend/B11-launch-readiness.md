# B11 — Launch readiness

## 1. Objective

Prove the product is done against the specification's own definition: every acceptance
criterion WAC-01 to WAC-20 passing, the §27 Definition of Done satisfied in production,
and the traceability matrix showing every requirement evidenced by a passing test. This
phase writes almost no code — it verifies, documents and hands over.

## 2. Spec references

§22 (WAC-01…WAC-20, all of them), §27 (Definition of Done, all eight items), §23 (the full
testing architecture), §25.2 (success metrics), §16.4 (analytics events), §26 (known
limitations — confirming they are absent by intent).

## 3. Prerequisites

B0–B10 complete and approved. F13 approved. Nothing in progress.

## 4. Deliverables

- Every WAC verified against production or a production-equivalent environment.
- Completed `backend-acceptance.md`.
- Final `traceability-matrix.md` with no unevidenced row.
- Analytics verified against §25.2's success metrics.
- A launch runbook and a first-week monitoring plan.
- `docs/plans/README.md` status table fully complete.

## 5. Task breakdown

**B11-01 · WAC-01…WAC-20 verification** — each criterion exercised against the real stack,
with linked evidence. *Files:* `docs/plans/backend/backend-acceptance.md`. *Acceptance:*
§22 — every criterion passes with an automated test, except WAC-19's manual screen-reader
portion which carries its report.

**B11-02 · §27 Definition of Done walk** — all eight items: auth across supported
browsers; multi-currency tracking with undo and recalculation; period calculations and
insights; goals, invitations, couple goals, contributions, pace, status and projection;
couple privacy proven by automated tests; all WACs passing with 100% domain coverage and
no serious or critical a11y violations; loading, empty, error and offline states on every
primary screen; Phase 2 infrastructure live with backups, monitoring, alerting, security
headers and a completed restore drill. *Acceptance:* each item ticked with evidence.

**B11-03 · Cross-browser production verification** — Chrome, Safari, Firefox and Edge
(latest two), plus iOS Safari and Android Chrome at 320–430 px. *Acceptance:* **WAC-16**
against production.

**B11-04 · Performance verification in production** — LCP ≤ 2.5 s on the Lighthouse mobile
profile; dashboard API p95 ≤ 800 ms. *Acceptance:* **WAC-20** measured on production
hardware, not staging.

**B11-05 · Analytics and success metrics** — the §16.4 events feed §25.2's activation,
engagement, retention and outcome metrics, with **no amounts, notes, category names or
partner identity** in any payload. *Acceptance:* the funnel (account created → base
currency set → first transaction → first goal → partner connected) is measurable.

**B11-06 · Traceability sweep** — every FR, WAC and T maps to at least one passing test.
*Files:* `docs/plans/00-shared/traceability-matrix.md`. *Acceptance:* no unevidenced row;
anything genuinely uncovered is reported explicitly rather than quietly omitted.

**B11-07 · Known limitations confirmation** — verify that everything in §26 is absent **by
intent** and recorded, so nobody mistakes a deliberate exclusion for an oversight.
*Acceptance:* §26 is reproduced in the release notes with its rationale.

**B11-08 · Launch runbook and first-week plan** — go-live steps, a rollback trigger list,
what to watch in the first week (error rate, FX sync success, email deliverability, signup
funnel), and who is called when. *Files:*
`docs/plans/00-shared/launch-runbook.md`. *Acceptance:* someone who did not build the
system could follow it.

**B11-09 · Final status update** — `docs/plans/README.md` status table completed; open
questions closed or carried forward to a v1.1 list. *Acceptance:* the plan reflects
reality, so the next person starts from truth.

## 6. Tooling

No new tooling. Lighthouse CI, Playwright, k6 and Sentry all from earlier phases.

## 7. Testing

No new tests are written — the full suite is run against production-equivalent
infrastructure and its results recorded as evidence. If a new test is needed here, that
is a finding: it means an earlier phase's exit criteria were not strict enough, and it is
recorded as such.

Verifies **WAC-01…WAC-20** and **T-01…T-16** in production.

## 8. Exit criteria

1. All twenty WAC criteria pass with linked evidence.
2. All eight §27 Definition of Done items are satisfied in production.
3. `packages/domain` still at 100% coverage; all sixteen T- cases pass.
4. No serious or critical accessibility violations; the manual screen-reader pass is
   documented.
5. Cross-browser and mobile verification complete on production.
6. Performance budgets met on production hardware.
7. Analytics support every §25.2 metric with no forbidden data.
8. `traceability-matrix.md` has no unevidenced row.
9. The launch runbook and first-week monitoring plan exist.
10. `backend-acceptance.md` is fully ticked and signed off.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A WAC fails here, late and expensive | Each WAC was verified at its owning phase's gate; this is confirmation. A failure here means a gate was approved too generously, and the drift log will usually say which |
| Production behaves differently from staging | WAC-20 is measured on production hardware; smoke tests run post-deploy |
| Traceability gaps discovered at the end | The matrix is updated per ticket as a definition-of-done item from F0 onward, not reconstructed here |
| Launch proceeds despite an unmet §27 item | The gate is explicit: items are ticked with evidence or the launch does not happen |

## 10. Estimate

**4 days.** Roughly: 1.5 days the WAC and DoD walk with evidence, 1 day cross-browser and
performance verification, 0.5 day analytics, 1 day runbook, traceability and sign-off. Low
uncertainty — provided earlier gates were honest.

## 11. Approval gate

Owner reviews the complete `backend-acceptance.md`, the §27 walk and the traceability
matrix. **Approving this gate declares the MVP complete and ready to launch.**
