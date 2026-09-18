# Target repository structure

The tree below is spec §8.3, expanded with the purpose of every package and the phase
that creates each part. Nothing here exists yet — F0 creates the skeleton, later phases
fill it.

```
spendtogether/
├─ apps/
│  └─ web/                          Next.js application (the only app)   [F0]
│     ├─ app/
│     │  ├─ (public)/               landing, onboarding, legal           [F6]
│     │  ├─ (auth)/                 login, register, forgot/reset, verify[F6]
│     │  ├─ (setup)/setup/currency  base currency + timezone             [F6]
│     │  ├─ (app)/                  authenticated shell                  [F5]
│     │  │  ├─ home/                                                     [F8]
│     │  │  ├─ activity/            list, [id], [id]/edit                [F7]
│     │  │  ├─ insights/                                                 [F8]
│     │  │  ├─ goals/               list, new, [id], [id]/edit, contribute [F9]
│     │  │  ├─ couple/                                                   [F10]
│     │  │  ├─ profile/             categories, currency, notifications, security [F11]
│     │  │  └─ @modal/(.)add/[type] intercepted Add form (dialog/sheet)  [F5]
│     │  ├─ invite/[token]/         public invitation landing            [F10]
│     │  ├─ offline/                service-worker fallback route        [F12]
│     │  └─ api/v1/                 Route Handlers — the real API        [B5]
│     ├─ components/
│     │  ├─ ui/                     primitives: Button, Input, Dialog…   [F3]
│     │  └─ features/               domain widgets: GoalCard, TransactionRow… [F3, F7-F11]
│     ├─ server/                    server-only code                     [B5]
│     │  ├─ services/               TransactionService, GoalService…     [B5]
│     │  ├─ repositories/           Supabase data access                 [B5]
│     │  ├─ auth.ts                 getSession() guard                   [B4]
│     │  ├─ errors.ts               domain error → HTTP envelope mapper  [B5]
│     │  └─ rate-limit.ts                                                [B4]
│     ├─ lib/
│     │  ├─ api-client.ts           typed fetch; mock|live switch        [F1]
│     │  ├─ query-client.ts         TanStack Query + IndexedDB persister [F4]
│     │  ├─ offline-queue.ts        IndexedDB outbox                     [F12]
│     │  ├─ format-money.ts         Intl money formatting (§11.4)        [F3]
│     │  └─ clock.ts                injectable clock (deterministic in tests) [F2]
│     ├─ mocks/                     MSW                                  [F4]
│     │  ├─ handlers/               one file per resource
│     │  ├─ fixtures/               SHARED with backend contract tests
│     │  ├─ db.ts                   in-memory store enforcing BR rules
│     │  └─ scenarios.ts            empty/error/offline/couple/zero-income…
│     ├─ e2e/                       Playwright specs                     [F13]
│     ├─ .storybook/                component workbench (ADR-007)        [F3]
│     └─ sw.ts                      Serwist service worker               [F12]
│
├─ packages/
│  ├─ domain/                       PURE TypeScript. No framework imports. [F2]
│  │  ├─ src/money.ts               minor units, rounding half away from zero
│  │  ├─ src/period.ts              BR-16 day/ISO-week/month in an IANA tz
│  │  ├─ src/summary.ts             F-01…F-10
│  │  ├─ src/goal.ts                F-11…F-21, status F-19
│  │  ├─ src/fx.ts                  F-22…F-24
│  │  └─ test/                      T-01…T-16; 100% line+branch gate
│  ├─ schemas/                      Zod contract — THE contract          [F1]
│  │  ├─ src/primitives.ts          Money, Currency, IsoDate, Cursor
│  │  ├─ src/errors.ts              envelope + the 9 codes (§10.2)
│  │  ├─ src/transactions.ts  goals.ts  couple.ts  insights.ts
│  │  │  me.ts  categories.ts  activity.ts  currencies.ts  auth.ts
│  │  └─ src/index.ts               re-exports + inferred types
│  └─ config/                       shared tooling config                [F0]
│     ├─ eslint/                    incl. the no-float-money rule
│     ├─ typescript/                strict base tsconfig
│     └─ tailwind/                  design tokens (§17–18)               [F3]
│
├─ supabase/                                                            [B1]
│  ├─ migrations/                   ordered SQL — source of truth        [B1]
│  ├─ functions/fx-sync/            Edge Function: daily rates           [B6]
│  ├─ tests/                        pgTAP: RLS, constraints, functions   [B2]
│  └─ seed.sql                      currencies, default categories, app_config [B1]
│
├─ docs/
│  ├─ spec/                         sources + digest (committed, Step 0)
│  └─ plans/                        this plan
│
├─ .github/workflows/               CI                                   [F0, B10]
├─ CLAUDE.md                        standing rules
├─ turbo.json  pnpm-workspace.yaml  package.json                         [F0]
└─ .gitignore
```

## Why each package exists

**`packages/domain` — the reason this project is trustworthy.** Every financial number
the user sees comes from here, and nothing else does arithmetic on money. It is pure so
it can run identically in a Route Handler, a server component, a Vitest test and the
offline client. It has no `Date.now()`: the clock is a parameter, which is what makes
timezone cases (T-13) and "current period" logic (F-07) testable at all. Its 100%
line-and-branch gate is not perfectionism — the untested branch is exactly where a
rounding or boundary bug lives.

**`packages/schemas` — the frozen contract.** One definition of "valid", imported by the
form, the mock and the server. Client-side validation is a convenience; the server's run
of the *same* schema is authoritative. Because the mock and the real API both parse
against these schemas, an incompatible backend change fails a test rather than a user.

**`packages/config` — one source of tooling truth.** Shared tsconfig, ESLint (including
the rule that bans float arithmetic on money), and the Tailwind token mapping, so
`apps/web` and both packages cannot drift into different strictness.

**`apps/web` — everything user-facing, plus the API.** Next.js co-locates them; the
layering rule (§8.2) keeps dependencies pointing downward: presentation → application →
domain → data access → database. `server/` is importable only from server contexts;
`lib/` is shared.

**`supabase/` — the database as code.** Migrations are the source of truth, types are
generated from them in CI, and the pgTAP suite proves the privacy rule (BR-05) rather
than asserting it in prose.

## The import rule, stated once

```
apps/web/app        →  may import  components, lib, server, packages/*
apps/web/server     →  may import  lib, packages/*            (never components)
apps/web/components →  may import  lib, packages/*            (never server)
packages/schemas    →  may import  nothing but zod
packages/domain     →  may import  nothing but decimal.js + date-fns-tz
```

F0 enforces this with an ESLint boundary rule, not a convention.
