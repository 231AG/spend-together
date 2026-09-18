# F4 — MSW mock backend

## 1. Objective

Build a mock API that is honest. It implements every endpoint of the frozen contract and
**enforces the real business rules** — couple privacy (BR-05), idempotency, conversion at
the record date's rate, goal completion and reversal (BR-11), `409 COUPLE_REQUIRED`, `409
GOAL_ARCHIVED`, and genuine validation errors — over a seeded dataset built from the
spec's corrected reference data, on a deterministic clock. It also provides a dev-only
scenario switcher so any screen can be viewed in empty, loading, error, offline,
slow-network, zero-income, couple and foreign-currency states on demand. A frontend built
against this cannot render a privacy leak or a fabricated total, because the mock will
not produce one.

## 2. Spec references

§10.1–10.5 (the contract), §16.3 (insights payload), §4 BR-02, BR-05, BR-06, BR-09,
BR-10, BR-11, BR-13, BR-14, BR-15, BR-17, BR-18, §6.5 (reference dataset), §11.2
(conversion rules), §19.2 (state matrix — the scenarios), §23 (fixtures shared with
backend contract tests). ADR-002, ADR-005.

## 3. Prerequisites

F1 complete and approved (the contract is frozen). F2 complete (the mock computes with
the real domain package — it does not reimplement a formula). F3 in progress or complete.

## 4. Deliverables

- `apps/web/mocks/db.ts` — in-memory store enforcing the business rules above.
- `apps/web/mocks/handlers/` — one module per resource, covering every endpoint in the
  frozen contract.
- `apps/web/mocks/fixtures/` — the seeded dataset, **shared with backend contract tests
  in B5** (ADR-002). This directory is a public interface, not an implementation detail.
- `apps/web/mocks/scenarios.ts` + a dev-only scenario switcher UI.
- `apps/web/mocks/browser.ts` and `server.ts` — worker and Node setups.
- Wiring so `NEXT_PUBLIC_API_MODE=mock` activates MSW in dev, in tests and in Storybook.

## 5. Task breakdown

**F4-01 · In-memory store with rule enforcement** — *Purpose:* the mock's integrity lives
here, not in the handlers. Entities mirror §9.1; goal balances are **derived** from
contributions on every read (BR-08), never stored; completion is recomputed on every
contribution change, in both directions (BR-11). *Files:* `mocks/db.ts`. *Acceptance:*
deleting a contribution from a completed goal returns it to an active status; no
`balance` field exists on the goal record.

**F4-02 · Seeded fixtures from the corrected reference dataset** — *Purpose:* one
canonical dataset for mocks, component tests, E2E and later the backend. Alex (base USD,
Africa/Monrovia) with September income $1,200, expenses $570 across the five corrected
categories, savings $300; goals New Laptop ($600/$1,200, created 1 Jul, due 31 Dec),
Vacation ($800/$2,000), Emergency fund ($250/$1,000); a partner Sam; a couple goal with
60/40 contributor split; one LRD transaction (5,000 LRD at 189.39). *Files:*
`mocks/fixtures/*.ts`. *Acceptance:* `GET /home/summary` returns exactly the §6.5 figures;
the category breakdown matches Bills 26.3 / Food 24.6 / Other 18.4 / Transport 15.8 /
Shopping 14.9 and sums to 100.0%. **No value traces to the design boards.**

**F4-03 · Deterministic clock** — *Purpose:* make every worked example reproducible.
Pinned to 2026-09-17T12:00:00Z (open-questions Q8), advanceable from the scenario
switcher for testing period rollovers. *Files:* `mocks/clock.ts`. *Acceptance:* "105 days
left" on the New Laptop goal and "$570 ÷ 17 = $33.53" both reproduce without special
casing.

**F4-04 · Auth handlers** — register, login, logout, refresh, forgot/reset/verify. A
duplicate identifier returns `409 CONFLICT` with a **generic** message (FR-01); five
failures within 15 minutes returns `429 RATE_LIMITED` with `Retry-After`. *Files:*
`mocks/handlers/auth.ts`. *Acceptance:* the mock never reveals which field was wrong, and
never reveals whether an account exists.

**F4-05 · Transaction handlers incl. idempotency and restore** — list with all filters
and cursor pagination, create, detail, patch with re-conversion when amount/currency/date
change, soft delete returning `{undo_until}`, and restore (ADR-003). An
`Idempotency-Key` replay within 48 h returns the **original** response, not a second
record. *Files:* `mocks/handlers/transactions.ts`. *Acceptance:* posting the same key
twice yields one transaction and two identical responses; a future `transaction_date` is
rejected (BR-09); an amount converting below one minor unit returns ADR-005's 422.

**F4-06 · Goal and contribution handlers** — list with `scope`/`include`, create (couple
type without an active couple → **409 `COUPLE_REQUIRED`**), detail computing every metric
via `packages/domain`, patch rejecting a currency change (BR-15), delete, and
contributions create/list/patch/delete (contribution to an archived couple goal → **409
`GOAL_ARCHIVED`**). *Files:* `mocks/handlers/goals.ts`, `contributions.ts`.
*Acceptance:* the `GET /goals/:id` response for New Laptop matches §10.5 field for field.

**F4-07 · Couple, invitation and privacy enforcement** — the three couple states; invite,
accept, cancel, resend, decline; `DELETE /couple` archiving couple goals read-only
(BR-18); `GET /invitations/by-token/:token` returning **only** the inviter's first name.
*Purpose:* BR-05 is enforced in the mock, so a frontend bug cannot even render private
data. *Files:* `mocks/handlers/couple.ts`. *Acceptance:* **no response from any endpoint
contains the partner's transactions, individual goals, balances or summaries** — asserted
by a test that walks every couple-context response and fails on any forbidden field;
requesting a partner's transaction by id returns 404, not 403.

**F4-08 · Insights, home summary and activity** — the §16.3 payload with previous-period
comparison, `GET /home/summary`, and the merged activity feed (own transactions + own
contributions) with the Savings Contributions filter. *Files:* `mocks/handlers/`.
*Acceptance:* the §16.3 example reproduces exactly for September; zero-income periods
return `savings_rate_pct: null`.

**F4-09 · Me, categories, currencies, exchange rates** — profile read/patch (including
base-currency change with a `recalculating: true` window), category CRUD with archive-
not-delete (BR-17), currency list, rates by date. *Files:* `mocks/handlers/`.
*Acceptance:* changing base currency returns `recalculating: true` for a configurable
delay, then re-expressed totals with original amounts preserved (WAC-15).

**F4-10 · Scenario switcher** — *Purpose:* make every state in §19.2 reachable in one
click during development and review. Scenarios: empty, loading (delayed), error (per
endpoint), offline, slow network, zero income, no partner / pending / connected /
ex-partner, foreign currency, goal about to complete, recalculating. *Files:*
`mocks/scenarios.ts`, `components/dev/scenario-switcher.tsx`. *Acceptance:* the switcher
is excluded from production builds — verified by a bundle assertion, not by intent.

**F4-11 · Wire MSW into dev, tests and Storybook** — *Purpose:* one handler set, three
consumers (which is also what keeps them honest). *Files:* `mocks/browser.ts`,
`server.ts`, Storybook and Vitest setup. *Acceptance:* the same handlers serve all three;
`NEXT_PUBLIC_API_MODE=live` disables MSW entirely.

**F4-12 · Contract conformance test** — *Purpose:* prove the mock implements the frozen
contract rather than something adjacent. Every handler's response is parsed against its
schema from `packages/schemas`. *Files:* `mocks/contract.test.ts`. *Acceptance:* every
endpoint in `api-contract.md` has a handler, and every response parses. A missing handler
fails the test.

## 6. Tooling

New: `msw` 2.15.0, `@tanstack/react-query` 5.103.1 (the client the handlers serve).
Reuses `packages/domain` and `packages/schemas`. The `contract-first-endpoint` skill
governs every handler added here.

## 7. Testing

The mock is itself tested: rule-enforcement tests (idempotency replay, BR-05 privacy
sweep, BR-11 completion reversal, 409 conditions, BR-09/BR-10 validation) and the
contract conformance test. These are not throwaway — in B5 the **same fixtures** drive
the backend contract tests, so the assertions written here outlive the mock.

Establishes the fixture basis for **WAC-03, WAC-04, WAC-05, WAC-06, WAC-08, WAC-09,
WAC-10, WAC-11, WAC-12, WAC-13, WAC-14, WAC-15** — each is finally asserted in F13
end-to-end, but the data and rules behind them are fixed here.

## 8. Exit criteria

1. Every endpoint in `api-contract.md` has a handler, and every response parses against
   its schema (F4-12 green).
2. The mock computes via `packages/domain` — no formula is reimplemented in a handler,
   verified by an import-boundary rule.
3. `GET /home/summary`, `GET /goals/:id` and `GET /insights/monthly` reproduce spec §6.5,
   §10.5 and §16.3 exactly.
4. The BR-05 privacy sweep passes: no couple-context response exposes a partner's private
   data; foreign resources return 404.
5. Idempotency replay returns the original response and creates no duplicate.
6. Goal completion sets and **clears** correctly as contributions change.
7. `409 COUPLE_REQUIRED` and `409 GOAL_ARCHIVED` are produced under their real
   conditions.
8. All scenarios in F4-10 are reachable, and the switcher is absent from a production
   bundle.
9. The deterministic clock makes every worked example reproducible.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-02 mock/API drift | Shared fixtures (ADR-002) and the conformance test; B5 reuses both |
| The mock becomes a second implementation of the domain | Handlers import `packages/domain`; an import-boundary rule forbids arithmetic in `mocks/` |
| Mock leniency hides a real 404-vs-403 or privacy bug until B8 | The privacy sweep test (F4-07) is written as an adversarial walk over responses, not a happy-path assertion |
| Scenario switcher ships to production | Bundle assertion in CI, not a code-review promise |
| R-11 seed guesses (Q4/Q5) baked into fixtures | Fixtures reference categories by key, never by literal UUID; a lint rule enforces it |

## 10. Estimate

**6 days.** Roughly: 1.5 days store and fixtures, 3 days handlers across the resources,
1 day scenarios and wiring, 0.5 day the conformance and privacy tests. Medium uncertainty
— enforcing rules is substantially more work than stubbing responses, and that is the
point of the phase.

## 11. Approval gate

Owner reviews: the contract conformance report showing every endpoint handled; the
privacy sweep passing; the three spec payloads reproduced; and a live walk through the
scenario switcher showing empty, error, offline, zero-income and couple states. Then F5
may start.
