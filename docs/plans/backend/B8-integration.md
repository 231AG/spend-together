# B8 — Integration: mocks to live

## 1. Objective

Switch the frontend from MSW to the real API, domain by domain, behind the
`NEXT_PUBLIC_API_MODE` flag built in F0; run the full Playwright suite against the real
stack; fix whatever drift surfaces; and keep MSW afterwards for tests and Storybook. This
is where the contract-first bet pays off or is proved wrong, and it is deliberately
incremental so a problem in one domain does not block the others.

## 2. Spec references

§10 (the whole contract), §23 (E2E against a real stack), §22 (all WAC criteria, now end
to end), ADR-002 (mocks retained for tests and development), §8.4 (request lifecycle),
§27 (definition of done items 1–7).

## 3. Prerequisites

B5 complete and approved. B6 and B7 complete — currency and notification behaviour must be
real before the flows that exercise them are switched.

## 4. Deliverables

- Per-domain switching: auth → transactions → goals and contributions → couple → insights
  and home → profile, currencies and categories.
- The full Playwright suite green against the real stack.
- A drift log recording every divergence found, with its resolution.
- MSW retained and still green for unit, component and Storybook use.

## 5. Task breakdown

**B8-01 · Per-domain flag plumbing** — extend the API-mode switch so individual domains can
be live while others remain mocked. *Files:* `apps/web/lib/api-client.ts`, `env.ts`.
*Acceptance:* any subset of domains can be live; the app functions in every combination,
so a failing domain can be reverted alone.

**B8-02 · Switch auth** — real registration, login, logout, reset and verification.
*Acceptance:* **flows 7.1 and 7.2** pass against the real stack; **WAC-01** and **WAC-02**
verified end to end, including session survival across a browser restart.

**B8-03 · Switch transactions** — including foreign-currency entry, edit, soft delete and
restore. *Acceptance:* **flows 7.3 and 7.4**; **WAC-03, WAC-04, WAC-14** — the conversion
preview equals the stored value against real rates from B6.

**B8-04 · Switch goals and contributions** — *Acceptance:* **flows 7.5, 7.6, 7.7**;
**WAC-07…WAC-11**, including completion reversal driven by the real trigger.

**B8-05 · Switch couple and invitations** — with two real accounts and a real invitation
email. *Acceptance:* **flows 7.8 and 7.9**; **WAC-12** verified against real RLS — the
two-user privacy scenario now proves the database guarantee, not the mock's imitation.

**B8-06 · Switch insights, home and activity** — *Acceptance:* **WAC-05, WAC-06, WAC-13**;
the §16.3 payload from the real API matches what the frontend has consumed all along.

**B8-07 · Switch profile, currencies and categories** — including a real base-currency
change with the recalculation banner. *Acceptance:* **flow 7.10**; **WAC-15**.

**B8-08 · Drift log and resolution** — every divergence found is recorded with its cause
and fix, and whether the mock or the API was wrong. *Files:*
`docs/plans/00-shared/contract-drift-log.md`. *Acceptance:* **ADR-002's test** — the log
is a short, honest document. A long one means the contract-first discipline slipped, and
that is worth knowing.

**B8-09 · Offline against the real API** — the outbox syncing to real endpoints with real
idempotency keys. *Acceptance:* **WAC-17** — an expense created offline syncs exactly once
against the real `idempotency_keys` table.

**B8-10 · Retain MSW** — mocks stay wired for unit tests, component tests and Storybook.
*Acceptance:* **ADR-002** — `pnpm test` and the Storybook build still pass with mocks;
the mock suite is not deleted.

**B8-11 · Full regression** — the entire Playwright suite across Chromium, WebKit and
Firefox plus mobile viewports, against the real stack. *Acceptance:* **WAC-16** — green
everywhere, or each failure triaged with an owner.

## 6. Tooling

No new packages. Playwright now targets a deployed preview backed by the staging Supabase
project.

## 7. Testing

The entire existing suite, re-run against reality. The novel tests here are the ones that
could not exist before: real session persistence across a browser restart, real RLS
denial in the two-user scenario, real idempotency against the database table, and real FX
rates flowing through conversion.

Verifies **WAC-01…WAC-17** end to end against the real stack.

## 8. Exit criteria

1. Every domain runs live; the mock mode still works for development.
2. The full Playwright suite is green against the real stack on three browsers and mobile
   viewports.
3. The two-user couple scenario passes against **real RLS**, not mocked privacy.
4. Offline sync produces exactly one record against real idempotency storage.
5. The conversion preview equals the stored value using real rates.
6. The drift log is complete, with every divergence resolved.
7. MSW still passes for unit, component and Storybook use.
8. No contract change was made without an ADR.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-02 drift surfaces here as a pile of surprises | Prevented by ADR-002 and B5's shared-fixture contract suite; this phase should confirm, not discover. Per-domain switching contains whatever does appear |
| A domain fails and blocks the whole switch | B8-01's per-domain flags mean one domain reverts alone |
| Real network latency breaks optimistic-update assumptions | Slow-network scenarios were already exercised in F4; retested here against real latency |
| Real FX rates differ from fixtures, breaking assertions | Assertions compare preview against stored value rather than against a hard-coded rate |
| E2E flakiness against a shared staging database | Each test seeds and tears down its own account; no test depends on another's data |

## 10. Estimate

**7 days** — flagged high-uncertainty (±30%), because it depends on how well the contract
discipline held. Roughly: 0.5 day flag plumbing, 4 days switching the six domains with
their flows, 1 day offline and regression, 1.5 days drift resolution — the buffer that
absorbs the uncertainty.

## 11. Approval gate

Owner reviews: the full suite green against the real stack; the drift log; the two-user
privacy scenario passing against real RLS; and the app still running in mock mode for
development. Then B9 may start.
