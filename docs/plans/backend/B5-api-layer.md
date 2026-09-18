# B5 — API layer and contract tests

## 1. Objective

Implement `/api/v1` — every endpoint in the frozen contract — as Route Handlers over a
service layer that calls `packages/domain` for all calculation and the RLS-scoped Supabase
client for all user data, and prove conformance with contract tests that run **the same
fixtures and expectations the MSW mocks satisfy**, so the two implementations cannot
diverge. This is the largest backend phase and the one the whole contract-first strategy
was built to make safe.

## 2. Spec references

§10.1 (conventions: money objects, pagination, idempotency, rate limits, 404-not-403),
§10.2 (error envelope), §10.3 and §10.4 (every endpoint), §10.5 (goal detail response),
§16.3 (insights payload), §8.4 (request lifecycle), §8.5 (the service-role rule), §6
(formulas via the domain package), ADR-002, ADR-003, ADR-005.

## 3. Prerequisites

B1–B4 complete and approved. `packages/schemas` unchanged since F1 except through ADRs.

## 4. Deliverables

- `apps/web/app/api/v1/**` — Route Handlers for the whole contract.
- `apps/web/server/services/` — `TransactionService`, `GoalService`,
  `ContributionService`, `CoupleService`, `InsightsService`, `CategoryService`,
  `ProfileService`, `FxService`.
- `apps/web/server/repositories/` — RLS-scoped data access.
- `apps/web/server/errors.ts` — domain and Postgres errors mapped to the §10.2 envelope.
- Idempotency middleware backed by `idempotency_keys`.
- Contract test suite consuming `apps/web/mocks/fixtures/`.

## 5. Task breakdown

**B5-01 · Route Handler scaffolding and the error mapper** — one shared pipeline: resolve
session → rate limit → validate body against the frozen schema → call service → map errors
→ respond. *Files:* `server/errors.ts`, `server/handler.ts`. *Acceptance:* §10.2 — every
error response carries the envelope with a `request_id` and **no stack trace, SQL or
internal identifier**; a Postgres constraint violation becomes a typed code, never a leak.

**B5-02 · Idempotency middleware** — `Idempotency-Key` on transaction and contribution
creates; replays within 48 h return the original response from `idempotency_keys`.
*Files:* `server/idempotency.ts`. *Acceptance:* §10.1 — the same key twice yields one
record and two byte-identical responses, including the same `id`.

**B5-03 · Cursor pagination** — opaque cursor, `?limit=&cursor=`, `{data, next_cursor}`.
*Files:* `server/pagination.ts`. *Acceptance:* stable ordering across pages even when rows
are inserted mid-pagination; an invalid cursor yields `422`, not a 500.

**B5-04 · `TransactionService` and routes** — list with all filters, create (with
server-side conversion at the record-date rate), detail, patch (re-converting when amount,
currency or date change), soft delete returning `{undo_until}`, and **restore**
(ADR-003). *Files:* `server/services/transaction-service.ts`, `app/api/v1/transactions/**`.
*Acceptance:* §8.4's lifecycle holds; **a foreign transaction id returns 404, not 403**;
ADR-005's too-small conversion returns `422 VALIDATION_FAILED` with a field message.

**B5-05 · `GoalService` and routes** — list with scope and include, create (409
`COUPLE_REQUIRED` without an active couple), **detail with every computed metric via
`packages/domain`**, patch rejecting currency changes (BR-15), delete (couple goal:
creator only). *Files:* `server/services/goal-service.ts`, `app/api/v1/goals/**`.
*Acceptance:* the `GET /goals/:id` response matches §10.5 field for field, including
`required_pace` `{571, 4000, 17393}` per ADR-004.

**B5-06 · `ContributionService` and routes** — create (idempotent; 409 `GOAL_ARCHIVED`
after a couple ends), list with contributor names and both currencies, patch and delete
(FR-15). Conversion produces **both** `goal_amount_minor` and
`contributor_base_amount_minor` at the contribution date's rate (§11.2). *Acceptance:*
**WAC-09** — balance always equals the sum after any mutation; the completion trigger
fires and reverses.

**B5-07 · `CoupleService` and routes** — state, invite (creating a pending couple if
none), accept via `accept_invitation()`, cancel, resend, decline, `DELETE /couple` via
`end_couple()`, and the public `GET /invitations/by-token/:token`. *Acceptance:*
**WAC-12** — the couple state response carries the partner's **name only**; the token
endpoint returns the inviter's **first name only** and is safe to call unauthenticated.

**B5-08 · `InsightsService` and routes** — daily, weekly and monthly anchored by `?date=`,
built on `period_summary`, `category_breakdown` and `spending_series`, with the
previous-period block. *Acceptance:* the §16.3 payload reproduces exactly, including
`savings_rate_pct: null` for a zero-income period (**WAC-06**).

**B5-09 · `GET /home/summary`** — the whole dashboard in one round trip, because §10.4
lists it as a performance measure. *Acceptance:* reproduces §6.5; one database round trip
per period, verified by query logging.

**B5-10 · `GET /activity`** — the merged feed of own transactions and own contributions
with the Savings Contributions filter, cursor-paginated. *Acceptance:* ordering is stable
and correct across the two sources; a partner's contributions to a couple goal appear only
on the goal, never in the user's activity.

**B5-11 · `/me`, `/categories`, `/currencies`, `/exchange-rates`** — profile read and
patch (including base-currency change enqueuing recalculation and returning
`recalculating: true`), category CRUD with archive-not-delete, currency list, rates by
date. *Acceptance:* **BR-17** — no delete path exists for a category; default categories
reject updates.

**B5-12 · Contract test suite** — for every endpoint, run the **shared fixtures** from
`apps/web/mocks/fixtures/` against the real API and assert the same expectations the MSW
handlers satisfy. *Files:* `apps/web/server/__tests__/contract/*.test.ts`. *Acceptance:*
**ADR-002** — mocks and API produce equivalent responses for identical inputs; a
divergence fails CI. A missing endpoint fails a coverage check against `api-contract.md`.

**B5-13 · Authorization double-check** — every service re-verifies ownership even though
RLS already does, per §10.1's "enforced twice". *Acceptance:* with RLS temporarily
disabled in a test harness, the application guard still denies — proving the second line
exists.

**B5-14 · Query plan review** — `EXPLAIN` on the hot paths (activity list, home summary,
insights series) against seeded volume. *Acceptance:* no sequential scan on
`transactions` or `goal_contributions`; groundwork for WAC-20's p95 target in B9.

## 6. Tooling

No new packages — `@supabase/supabase-js` arrived in B1, the domain and schema packages in
F1/F2. The `contract-first-endpoint` skill governs every ticket here.

## 7. Testing

Per §23: API integration tests for each endpoint covering happy path, validation, auth,
**404 isolation** and idempotency — plus the contract suite in B5-12, which is the phase's
centrepiece. Tests run against a local Supabase in Docker so RLS is genuinely active, not
stubbed.

Covers the API half of **WAC-03, WAC-04, WAC-05, WAC-06, WAC-08, WAC-09, WAC-10, WAC-11,
WAC-12, WAC-13, WAC-14**.

## 8. Exit criteria

1. Every endpoint in `api-contract.md` is implemented and returns contract-conformant
   responses.
2. The contract suite passes using the same fixtures as the MSW mocks.
3. §10.5 and §16.3 payloads reproduce exactly.
4. Idempotent replay returns the original response and creates no duplicate.
5. Foreign or missing resources return **404, never 403**, on every endpoint.
6. All calculation goes through `packages/domain` — no formula is reimplemented server-side
   (import-boundary lint).
7. All user data access goes through the RLS-scoped client; the service-role key appears
   only in the three §8.5 jobs.
8. Errors always use the §10.2 envelope with no internal detail.
9. Rate limits and CSRF checks apply to every mutating route.
10. No sequential scan on the hot paths.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-02 drift from the mocks | The contract suite is the mitigation and it blocks merge; ADR-002 made it structural |
| A service uses the service-role client for convenience | Import-boundary lint plus the CI check from B0-04; `security-review` on every PR |
| 403 leaks existence somewhere | A systematic test: for every resource endpoint, request another user's id and assert 404 |
| Insights performance on large accounts | Aggregation stays in SQL (B3); plans reviewed in B5-14; budget enforced in B9 |
| The largest phase overruns | Sequenced so transactions and goals (the highest-value endpoints) land first; insights and the long tail follow |

## 10. Estimate

**10 days** — the largest phase in either plan. Roughly: 1.5 days scaffolding, errors,
idempotency and pagination; 2 days transactions; 2 days goals and contributions; 1.5 days
couple and invitations; 1.5 days insights, home and activity; 1 day the remaining
resources; 0.5 day contract suite and query plans. Medium uncertainty.

## 11. Approval gate

Owner reviews: the contract suite green; a side-by-side of a mock response and a live
response for the same fixture; the 404-not-403 sweep; and the query plans. Then B6 may
start.
