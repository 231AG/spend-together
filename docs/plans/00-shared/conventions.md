# Conventions

Binding for every phase. Where this file and a phase file disagree, this file wins.

## Scope fence

The MVP is the original PRD **plus multi-currency**, and nothing else. Everything listed
in spec §26 — goal withdrawals, recurring transactions, dark mode, budgets, bank sync,
receipt scanning, splitting shared balances — is **out of scope**. So is anything not
stated in the spec at all (§ "How to read this document": *anything not stated here is
out of scope for the MVP*).

Good ideas are not the enemy; unrecorded ones are. New ideas go to
`00-shared/open-questions.md` with a recommendation. They do not go into code, and they
do not quietly expand a ticket.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files, directories | `kebab-case` | `format-money.ts`, `goal-card.tsx` |
| React components | `PascalCase`, one per file, named export | `GoalCard`, `AmountInput` |
| Hooks | `useThing` | `useGoalDetail` |
| TypeScript types | `PascalCase`, no `I` prefix | `GoalDetail`, `MoneyMinor` |
| Zod schemas | `thingSchema`; inferred type is the `PascalCase` name | `goalDetailSchema` → `GoalDetail` |
| Domain functions | verb-first, pure | `computeSavingsRate`, `goalStatus` |
| API fields (the wire) | `snake_case` — spec §10.1 | `base_amount_minor` |
| DB tables / columns | `snake_case`, tables plural | `goal_contributions.goal_amount_minor` |
| SQL functions | `snake_case`, verb-first | `accept_invitation`, `recalc_base_amounts` |
| CSS custom properties | `--group-name-step` | `--color-primary-700` |
| Test files | `*.test.ts` beside source; E2E `*.spec.ts` in `e2e/` | `goal.test.ts` |
| Query keys | tuple, resource first | `['goals', id]`, `['insights', period, date]` |

**The wire is `snake_case`; TypeScript is `camelCase`.** Conversion happens in exactly
one place — the schema layer in `packages/schemas`. Nothing downstream sees `snake_case`
except the raw payload types.

## Money, dates and numbers

- Money is **integer minor units**, always, with its currency code alongside. A bare
  number is never money.
- Money in TypeScript is the branded type `MoneyMinor`; `packages/domain` exports the
  only constructors. This makes "multiply two amounts together" a type error.
- Exchange rates are `decimal.js` `Decimal`, never `number`. Rounding is **half away
  from zero**, once per record, into the target currency's exponent.
- Percentages: full precision internally, rounded to one decimal place only when
  displayed.
- Dates on the wire are `YYYY-MM-DD` for dates and RFC 3339 UTC with `Z` for timestamps.
- **No `new Date()` or `Date.now()` outside `lib/clock.ts`.** Enforced by lint. Period
  boundaries are computed in the user's IANA timezone (BR-16) via `date-fns-tz`.
- Reference dataset for every fixture, mockup and example: spec §6.5. Never the design
  boards.

## Error handling

One shape, everywhere (spec §10.2):

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "…",
             "fields": { "amount": "…" }, "request_id": "req_…" } }
```

- Codes are the nine in §10.2 and no others: `VALIDATION_FAILED` 422,
  `UNAUTHENTICATED` 401, `NOT_FOUND` 404, `CONFLICT` 409, `COUPLE_REQUIRED` 409,
  `GOAL_ARCHIVED` 409, `RATE_LIMITED` 429, `FX_UNAVAILABLE` 503, `INTERNAL` 500.
- **A missing or foreign resource is 404, never 403.** 403 leaks existence.
- No stack traces, SQL, or internal identifiers in a response body. `request_id` is the
  only breadcrumb, and it appears in Sentry.
- Domain code returns typed results; it does not throw for expected conditions (an
  amount that rounds to zero, a goal that is archived). Only `server/errors.ts` maps to
  HTTP.
- **User-facing messages are plain language with no codes** (spec §19.1). "We couldn't
  save that. Try again." — not "Error 500".
- Input is preserved on failure, always. A form that clears itself on a server error is
  a bug.

## Accessibility — non-negotiable, per ticket

Every UI ticket's acceptance check includes: reachable and operable by keyboard; visible
focus ring from the token; labels present and programmatically associated; meaning not
carried by colour alone; touch targets ≥ 44 px; works at 200% zoom and 320 px width;
respects `prefers-reduced-motion`. Serious or critical axe violations fail CI.

## Git

**Branches.** `<type>/<short-description>`, e.g. `feat/f3-design-tokens`,
`fix/f7-undo-focus`. One phase may span several branches; one branch never spans phases.

**Commits.** Conventional Commits. Types: `feat`, `fix`, `docs`, `test`, `refactor`,
`chore`, `perf`, `build`, `ci`. Scope is the phase or package:

```
feat(f2-domain): add F-19 goal status with configurable thresholds
test(f2-domain): cover T-09 threshold boundaries at 0.95 and 0.7499
docs(plans): record ADR-004 pace rounding decision
```

The body explains *why*, not *what* — the diff already shows what.

**Pull requests.** One per phase minimum, opened as draft, targeting `main`. The
description names the phase, lists the tickets closed, and states which FR/WAC/T IDs the
phase's tests now cover. Never push directly to `main`.

## Code style

- TypeScript `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- No `any`. `unknown` then narrow. A justified escape hatch carries a one-line comment
  saying why.
- No default exports except where a framework demands them (Next.js pages, layouts,
  route handlers).
- Prefer server components; add `'use client'` only when the component needs state,
  effects or browser APIs, and keep the boundary as low in the tree as possible.
- Comment density matches the surrounding file. Comments explain intent and
  non-obvious constraints (a spec rule, a rounding subtlety), never restate the code.
- Every non-trivial domain function carries a docstring naming its formula ID: `/** F-06
  Savings Rate. Returns null when income is zero (AC05). */`

## Tests

- Unit tests sit beside the code. E2E lives in `apps/web/e2e/`.
- Test names read as behaviour: `returns N/A when income is zero`, not `test savings rate 2`.
- The 16 mandated cases (T-01…T-16) are tagged in their test names so the traceability
  matrix can be verified by grep.
- Fixtures are shared between MSW and backend contract tests — one directory, two
  consumers (ADR-002). Never fork a fixture.
- A test that needs "now" injects the clock. Pinned instant for all fixtures:
  **2026-09-17T12:00:00Z** (see open-questions Q8), which makes every worked example in
  spec §6.5, §10.5, §16.3 and W-01…W-09 reproduce exactly.
