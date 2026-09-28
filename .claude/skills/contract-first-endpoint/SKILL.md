---
name: contract-first-endpoint
description: The ordered walk for adding or changing any API endpoint in SpendTogether - Zod schema, MSW handler, shared fixture, route handler, contract test - plus the ADR required after the F1 contract freeze. Use whenever a ticket touches packages/schemas, apps/web/mocks, apps/web/app/api, or calls a new endpoint from the UI.
---

# contract-first-endpoint

The contract in `packages/schemas` was frozen in F1 (ADR-002). The MSW mock and the real
API are both checked against it, so they cannot drift. Follow these steps in order.

## 1. Schema (packages/schemas)

- Add or edit the request and response schemas in the resource module
  (`src/transactions.ts`, `src/goals.ts`, ...). Use `z.strictObject` so unknown fields
  fail. Money is `Money` / `SignedMoney`; rates are `DecimalString`; dates `IsoDate`.
- Register the endpoint in `src/endpoints.ts` with method, path, `source`, `auth`,
  `params`/`query`/`body`, `response`, `status`, `idempotent` and specific `errors`.
- Rules that need "today" (BR-09, BR-10) are factories taking `today`; the package never
  reads the clock.
- **After the freeze:** add an ADR to `docs/plans/00-shared/architecture-decisions.md`
  and update the affected backend phase file. CI (`contract-freeze.yml`) fails without it.
- Regenerate the doc: `pnpm --filter @spendtogether/schemas contract:doc`.

## 2. Mock handler (apps/web/mocks, from F4)

The handler parses the request with the same schema and answers with a payload that
parses against the response schema. Business rules (BR-*) live in the mock's store,
not in the handler.

## 3. Shared fixture

Put example payloads in the shared fixtures folder so the MSW tests and the backend
contract tests (B5) use the same bytes.

## 4. Route handler (apps/web/app/api/v1, from B5)

Parse input with the schema; map domain errors to the envelope via `server/errors.ts`;
return 404 (never 403) for foreign resources.

## 5. Contract test

Assert the route handler's responses against the same fixtures and schemas.

## Calling it from the UI

Always `apiClient.call(endpoints.x, {...})`. Never `fetch` directly: the client
validates input, attaches `Idempotency-Key` to creates, parses every response and
throws `ApiError` or `ApiContractError`.
