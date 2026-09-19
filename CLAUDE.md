# CLAUDE.md — standing rules for every session on SpendTogether

**SpendTogether** is a mobile-first responsive web app (installable PWA) for tracking
income and expenses and reaching savings goals, alone or as a couple, with full
multi-currency entry and conversion. Next.js + Supabase, pnpm workspaces + Turborepo.

## Where things are

| You need | Read |
|---|---|
| Any requirement, formula, ID, endpoint, token | `docs/spec/spec-digest.md` — **search this, not the PDF** |
| The original specification (legal source of truth) | `docs/spec/SpendTogether_Web_App_Specification.pdf` |
| Why board numbers must never be copied | `docs/spec/design-boards.md` |
| Phase order, status, what to work on next | `docs/plans/README.md` |
| Decisions already made and why | `docs/plans/00-shared/architecture-decisions.md` |
| Naming, branching, commits, error handling | `docs/plans/00-shared/conventions.md` |
| Which FR/WAC/T is covered where | `docs/plans/00-shared/traceability-matrix.md` |
| Anything undecided | `docs/plans/00-shared/open-questions.md` |

If the digest and the PDF ever disagree, **the PDF wins** and you fix the digest in the
same commit.

## Phase gating

Work on **one phase at a time, only after the owner has approved it.** At the end of
every phase:

1. Update the status table in `docs/plans/README.md`.
2. List what changed.
3. **Stop.** Do not roll into the next phase.

Do not start a phase whose prerequisites are not marked Complete.

## Load only what the phase needs

Open the phase file and the spec sections it names in its *Spec references* section
(search `spec-digest.md` for them). Do not load the whole spec. Do not load other
phases' files unless you are checking an interface between them.

## Non-negotiable rules

- **Money is integer minor units.** `bigint` in Postgres, `number`/`bigint` in TS, never
  a float, never a string parsed as a float. Exchange rates use `decimal.js`. If you
  find yourself writing `parseFloat` on money, stop.
- **Every formula lives in `packages/domain`** and that package stays pure — no Next.js,
  no Supabase, no React, no `fetch`, no `Date.now()` (a clock is injected). The API,
  server components and the offline client all call the same functions.
- **Zod schemas in `packages/schemas` are the contract.** Changing one after the contract
  freeze (phase F1) requires an ADR and a matching update to the backend plan.
- **The service-role key is never used client-side**, never prefixed `NEXT_PUBLIC_`, and
  is used only in the server-side jobs named in spec §8.5. Every user-initiated read and
  write goes through the RLS-scoped client.
- **Components use design tokens only.** No hard-coded colours, sizes, radii, durations
  or z-indexes. If a token is missing, add it to the token file — do not inline a value.
- **Colour is never the only carrier of meaning**, and WCAG 2.2 AA is part of done, not a
  later pass.
- **Do not add scope.** Everything in spec §26 is deliberately excluded. New ideas go in
  `docs/plans/00-shared/open-questions.md`, not into the code.
- **Never copy a number from the design boards.** Use the corrected reference dataset in
  spec §6.5. The boards are wrong on purpose-of-record; see `docs/spec/design-boards.md`.

## Definition of done, per ticket

- Tests written and passing.
- `pnpm typecheck` and `pnpm lint` clean.
- Accessibility checked for any UI work (keyboard path, focus, labels, contrast, reduced
  motion).
- `docs/plans/00-shared/traceability-matrix.md` updated if the ticket closes an FR, WAC
  or T.

## Commands

Verified working from a clean clone at the end of phase F0.

```bash
pnpm install            # install workspace dependencies
pnpm dev                # run apps/web (defaults to NEXT_PUBLIC_API_MODE=mock)
pnpm build              # build all packages
pnpm typecheck          # tsc --noEmit across the workspace
pnpm lint               # eslint across the workspace
pnpm lint:rules         # prove the three custom lint rules still fire
pnpm format             # prettier --write
pnpm format:check       # prettier --check (what CI runs)
pnpm test               # vitest unit + component
pnpm test:domain        # vitest packages/domain (100% coverage gate, enforced from F2)
```

Not available until the backend phases create them:

```bash
pnpm db:start           # supabase start            (arrives in B0)
pnpm db:test            # supabase test db (pgTAP)  (arrives in B2)
```

### Toolchain versions, and why

Pinned exactly — no caret ranges — and proven together by the F0-01 spike:

| Tool | Version | Note |
|---|---|---|
| Node | 22 | |
| pnpm | 10.33.0 | **Not 12.x.** ADR-010 |
| TypeScript | 6.0.3 | **Not 7.x.** `typescript-eslint` refuses TS 7 — ADR-009 |
| Next.js | 16.3.5 | |
| React | 19.3.0 | |
| ESLint | 10.10.0 | with `typescript-eslint` 8.70.0 |
| Vitest | 5.0.1 | |
| Tailwind | 4.3.3 | `@theme inline` confirmed working as spec §18.1 assumes |

If Dependabot proposes TypeScript 7, the answer is no until
[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)
ships. ADR-009 is the reason to point at.

## Two habits that keep this project honest

**Contract first.** Schema → mock handler → shared fixture → route handler → contract
test, in that order. The MSW mocks and the real API are verified against the *same*
fixtures so they cannot drift.

**Trace as you go.** Every ticket names the FR-, WAC- or T- IDs it serves. If you cannot
name one, ask whether the ticket is in scope at all.
