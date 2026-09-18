# F1 — Contract freeze (`packages/schemas`)

## 1. Objective

Turn spec §10 into executable, shared types: Zod schemas and inferred TypeScript types
for every endpoint in §10.3 and §10.4, the error envelope and its nine codes (§10.2), the
money object, cursor pagination, and the insights payload (§16.3). At the end of this
phase **the contract is frozen** — the frontend, the mock backend and, months later, the
real API all validate against these same schemas, and any change requires an ADR plus an
edit to the affected backend phase (ADR-002).

## 2. Spec references

§10.1 (conventions), §10.2 (error envelope), §10.3 (PRD endpoint catalogue), §10.4
(implementation endpoints), §10.5 (goal detail example), §16.3 (insights contract), §6.1
(money representation), §11.4 (display rules that constrain the money object).
ADR-003 (restore endpoint), ADR-005 (amount-too-small rejection).

## 3. Prerequisites

F0 complete and approved. Owner's answers — or acceptance of the assumptions — on **Q1**
(restore endpoint) and **Q3** (sub-minor-unit rejection), both of which change the
contract surface.

## 4. Deliverables

- `packages/schemas/src/primitives.ts` — `Money`, `CurrencyCode`, `IsoDate`,
  `IsoTimestamp`, `Cursor`, `Paginated<T>`, and the branded `MoneyMinor`.
- `packages/schemas/src/errors.ts` — the envelope plus a discriminated union of the nine
  codes with their HTTP statuses.
- Resource modules: `auth.ts`, `me.ts`, `transactions.ts`, `categories.ts`, `activity.ts`,
  `goals.ts`, `contributions.ts`, `couple.ts`, `invitations.ts`, `insights.ts`,
  `home.ts`, `currencies.ts`, `exchange-rates.ts`.
- `packages/schemas/src/index.ts` — re-exports and inferred types.
- `docs/plans/00-shared/api-contract.md` — the endpoint table with its request and
  response schema names, generated from the code so it cannot drift.
- `apps/web/lib/api-client.ts` — typed client that parses every response against its
  schema and throws a typed `ApiError` on the envelope.

## 5. Task breakdown

**F1-01 · Primitives** — *Purpose:* the money object is the single most repeated shape in
the contract; get it exactly right. `{amount_minor: number, currency: string, formatted:
string}` per §10.1, with `formatted` explicitly documented as display-only ("clients
never parse `formatted`"). *Files:* `src/primitives.ts`. *Acceptance:* round-trip tests
for USD (exp 2), JPY (exp 0), KWD (exp 3); a negative `amount_minor` fails parsing.

**F1-02 · Error envelope and codes** — *Purpose:* one error shape everywhere. *Files:*
`src/errors.ts`. *Acceptance:* all nine codes present with correct statuses; the §10.2
example parses; an unknown code fails.

**F1-03 · Auth schemas** — register, login, logout, refresh, forgot-password,
reset-password, verify. *Files:* `src/auth.ts`. *Acceptance:* §10.3 and §10.4 auth rows
each have a request and response schema; duplicate-registration returns the 409 envelope
with a generic message.

**F1-04 · Transactions** — list (with the `type`, `category_id`, `from`, `to`, `q`,
`currency` filters and cursor), create (including the optional client-supplied `id` for
offline), detail, patch, soft delete returning `{undo_until}`, **and restore
(ADR-003)**. *Files:* `src/transactions.ts`. *Acceptance:* every §10.3 transaction row
has schemas; the create schema rejects a zero or negative `amount_minor` and a future
`transaction_date` (BR-09).

**F1-05 · Goals and contributions** — list with `scope`/`include`, create (409
`COUPLE_REQUIRED`), detail with all computed metrics matching §10.5 exactly, patch
(currency absent — immutable per BR-15), delete, contributions create/list/patch/delete.
*Files:* `src/goals.ts`, `src/contributions.ts`. *Acceptance:* the §10.5 example payload
parses byte-for-byte; a payload containing `currency` in a goal PATCH fails.

**F1-06 · Couple and invitations** — couple state, invite, accept, cancel, resend,
decline, `DELETE /couple`, and `GET /invitations/by-token/:token` returning **only** the
inviter's first name. *Files:* `src/couple.ts`, `src/invitations.ts`. *Acceptance:* the
couple-state schema cannot express partner financial data — there is no field for it
(BR-05 enforced by type).

**F1-07 · Insights and home summary** — the §16.3 payload with `period`, `totals`,
`previous`, `change_pct`, `categories`, `series`; `GET /home/summary`. *Files:*
`src/insights.ts`, `src/home.ts`. *Acceptance:* the §16.3 example parses exactly;
`savings_rate_pct` accepts `null` for the N/A case (AC05).

**F1-08 · Me, categories, activity, currencies, rates** — the remaining §10.4 rows.
*Files:* `src/me.ts`, `src/categories.ts`, `src/activity.ts`, `src/currencies.ts`,
`src/exchange-rates.ts`. *Acceptance:* the activity feed schema expresses a merged
transaction-and-contribution row discriminated by `kind`.

**F1-09 · Typed API client** — *Purpose:* make it impossible to consume an unvalidated
response. Every call parses against its schema; envelope errors become a typed
`ApiError`; the `Idempotency-Key` header is attached to transaction and contribution
creates. *Files:* `apps/web/lib/api-client.ts`. *Acceptance:* a handcrafted malformed
response throws a parse error, not a silent `undefined` downstream.

**F1-10 · Contract documentation** — *Purpose:* a human-readable table that cannot drift
from the code. A script walks the exported schemas and emits the endpoint → schema table.
*Files:* `docs/plans/00-shared/api-contract.md`, `scripts/gen-contract-doc.ts`.
*Acceptance:* the generated table lists every §10.3 and §10.4 endpoint plus the restore
endpoint; CI fails if the file is out of date.

**F1-11 · Freeze the contract** — *Purpose:* make the freeze real. Tag the commit, add a
CODEOWNERS entry on `packages/schemas`, and add a CI check that fails any PR touching it
without a matching ADR file change. *Files:* `.github/CODEOWNERS`,
`.github/workflows/contract-freeze.yml`. *Acceptance:* a PR editing a schema without an
ADR fails CI.

## 6. Tooling

`zod` 4.6.5 (new in this phase). Skill `contract-first-endpoint` is **created here** and
governs every endpoint from now on. No MCP additions.

## 7. Testing

Schema unit tests in `packages/schemas/test/`: every schema parses its spec example and
rejects at least one realistic malformation. The three verbatim payloads from the spec —
§10.2 error, §10.5 goal detail, §16.3 insights — are committed as fixtures and asserted
byte-for-byte, which is what makes "the contract matches the spec" a test rather than a
claim.

Covers no T- IDs (those are domain cases in F2). Underpins **WAC-08** (409
`COUPLE_REQUIRED` shape) and **WAC-14** (the conversion fields exist on the wire).

## 8. Exit criteria

1. Every endpoint in §10.3 and §10.4 — plus `POST /transactions/:id/restore` — has a
   request schema, a response schema and an inferred type exported from the package index.
2. The three spec example payloads parse byte-for-byte in tests.
3. The nine error codes are present with correct HTTP statuses, and no tenth code exists.
4. `api-client.ts` parses every response; an unparseable response is an error, never a
   silent pass.
5. `api-contract.md` is generated, committed and CI-verified as current.
6. The contract-freeze CI check demonstrably fails a schema change with no ADR.
7. `pnpm typecheck` and `pnpm lint` clean.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-02 contract drift | This phase *is* the mitigation; the freeze check makes it mechanical |
| A missing endpoint is discovered in F7–F11, after the freeze | The ADR path exists and is cheap — the cost is deliberate friction, not a blocker. ADR-003 is the first such case, found during planning rather than during F7 |
| Zod 4's inference differs from Zod 3 idioms in ways that bite on large unions | Keep schemas flat; avoid deeply recursive types; the insights payload is the only complex nesting |
| `formatted` money strings tempt a client to parse them | Documented in the schema, and a lint rule bans reading `.formatted` outside display components |

## 10. Estimate

**4 days.** Roughly 1 day on primitives and errors (the shapes everything else reuses),
2 days across the resource modules, 1 day on the client, doc generation and the freeze
mechanism. Low uncertainty — the spec is unusually complete here.

## 11. Approval gate

Owner reviews: `api-contract.md` against spec §10.3/§10.4 for completeness; that ADR-003
and ADR-005 are accepted or replaced; that the three spec examples are asserted verbatim.
**This is the last cheap moment to change the API surface.** Then F2 may start.
