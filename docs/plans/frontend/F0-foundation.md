# F0 — Foundation

## 1. Objective

Stand up the monorepo skeleton so every later phase has a working, enforced, verifiable
place to put code: pnpm workspaces + Turborepo laid out exactly as spec §8.3, TypeScript
strict, ESLint with the two rules that protect this project (no float money, no
cross-layer imports), Prettier, Vitest, a CI pipeline that runs lint + typecheck + unit
on every pull request, environment handling, and the `NEXT_PUBLIC_API_MODE=mock|live`
switch that makes the whole contract-first strategy possible. No product code.

## 2. Spec references

§8.1 (stack), §8.3 (repository structure), §24.3 (CI/CD pipeline — the PR half only),
§25.1 (dependency and secret scanning).

## 3. Prerequisites

Step 0 committed (`docs/spec/` present). Owner's approval to begin F0. No other phase.

## 4. Deliverables

- `pnpm-workspace.yaml`, root `package.json` with a pinned `packageManager` field,
  `turbo.json`.
- `apps/web` — a Next.js 16 app that builds and serves an empty authenticated-less
  placeholder page. No routes from §12.1 yet.
- `packages/domain`, `packages/schemas`, `packages/config` — real packages that build and
  export nothing yet.
- `packages/config/typescript/base.json` — `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`.
- `packages/config/eslint/` — flat config, including two custom rules.
- `.github/workflows/ci.yml` — install → lint → typecheck → unit → build.
- `.env.example`, `apps/web/src/env.ts` (validated at boot), `lib/api-client.ts` stub
  honouring `NEXT_PUBLIC_API_MODE`.
- `lib/clock.ts` — the injectable clock every later phase depends on.
- `CLAUDE.md` Commands section filled in.
- Dependabot and secret scanning enabled.

## 5. Task breakdown

**F0-01 · Compatibility spike** — *Purpose:* prove the pinned stack installs and runs
together before any product code depends on it (risk R-01). Install next 16.3.5, react
19.3.0, typescript 7.0.2, eslint 10.10.0, vitest 5.0.1, tailwindcss 4.3.3; run a
hello-world through lint, typecheck, test, build. *Files:* throwaway branch, then
`docs/plans/00-shared/tooling-and-skills.md` updated with findings. *Acceptance:* all
four commands pass, or an ADR records the fallback version and why.

**F0-02 · Workspace skeleton** — *Purpose:* create the tree in §8.3. *Files:*
`pnpm-workspace.yaml`, `turbo.json`, root `package.json`, the four package
`package.json` files. *Acceptance:* `pnpm install` succeeds; `pnpm -r exec true`
resolves all four workspaces.

**F0-03 · TypeScript strict base** — *Purpose:* one strictness setting for the whole
repo. *Files:* `packages/config/typescript/base.json`, per-package `tsconfig.json`
extending it. *Acceptance:* `pnpm typecheck` passes; deliberately adding `const x: any`
fails lint.

**F0-04 · ESLint, Prettier, and the money rule** — *Purpose:* make the two rules that
matter mechanical. Rule one bans `parseFloat`/`Number()`/float arithmetic on identifiers
matching money patterns (`*_minor`, `amount*`, `balance*`). Rule two enforces the import
boundaries in `repo-structure.md`. *Files:* `packages/config/eslint/index.js`,
`.prettierrc`. *Acceptance:* a fixture file violating each rule fails `pnpm lint`; a
compliant file passes.

**F0-05 · Vitest + coverage wiring** — *Purpose:* one test command across workspaces,
with the 100% gate configured for `packages/domain` (enforced from F2). *Files:*
`vitest.config.ts` per package, root script. *Acceptance:* `pnpm test` runs and reports
zero tests without error; coverage thresholds are declared.

**F0-06 · Next.js app shell placeholder** — *Purpose:* a buildable app. *Files:*
`apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `next.config.ts` (Node.js runtime).
*Acceptance:* `pnpm dev` serves a page; `pnpm build` produces a production build.

**F0-07 · Environment handling and the API-mode switch** — *Purpose:* the mechanism the
whole plan rests on. `env.ts` validates required variables at boot with Zod and fails
loudly; `api-client.ts` reads `NEXT_PUBLIC_API_MODE` and chooses a base URL / mock
transport. *Files:* `apps/web/src/env.ts`, `apps/web/lib/api-client.ts`, `.env.example`.
*Acceptance:* the app boots in both modes; a missing required variable fails the build
with a readable message naming the variable.

**F0-08 · Injectable clock** — *Purpose:* make time testable from day one so no phase
learns the habit of calling `Date.now()`. *Files:* `apps/web/lib/clock.ts`, ESLint rule
addition banning ambient `Date` construction outside it. *Acceptance:* the rule fires on
`new Date()` in a component; the clock returns a fixed instant when injected.

**F0-09 · CI pipeline** — *Purpose:* the PR half of §24.3. *Files:*
`.github/workflows/ci.yml`. *Acceptance:* a pull request runs install → lint → typecheck
→ unit → build; a deliberate lint error turns the check red.

**F0-10 · Repository hygiene** — *Purpose:* §25.1's scanning requirements and future
session ergonomics. Enable Dependabot and secret scanning; add a SessionStart hook so web
sessions bootstrap; create the `spec-trace` project skill. *Files:*
`.github/dependabot.yml`, `.claude/settings.json`, `.claude/skills/spec-trace/SKILL.md`.
*Acceptance:* Dependabot opens its first PR or reports no updates; a fresh session runs
`pnpm install` automatically.

**F0-11 · Fill in the Commands section** — *Purpose:* `CLAUDE.md` currently promises
commands that do not exist. *Files:* `CLAUDE.md`. *Acceptance:* every listed command runs
successfully from a clean clone.

## 6. Tooling

Introduced here, per `tooling-and-skills.md` §3 (root table): `pnpm` 12.4.2, `turbo`
2.10.13, `typescript` 7.0.2, `eslint` 10.10.0, `prettier` 3.9.8, `vitest` 5.0.1,
optionally `husky` + `lint-staged`. MCP: GitHub (already connected). Skills: `spec-trace`
created here; `session-start-hook` and `fewer-permission-prompts` used here.

## 7. Testing

No product tests — there is no product yet. What is tested is the tooling itself:
fixture files that must fail the money rule, the import-boundary rule and the ambient-
`Date` rule; a passing fixture that must not. Covers no T- or WAC- IDs directly, but it
is the mechanism by which every later phase's tests run at all.

## 8. Exit criteria

1. `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass from
   a clean clone.
2. All four workspaces resolve and build.
3. The three custom lint rules each fail on their fixture and pass on the compliant one.
4. CI runs on a pull request and goes red on a deliberate error.
5. The app boots with `NEXT_PUBLIC_API_MODE=mock` and with `=live`.
6. A missing required environment variable fails the build naming that variable.
7. `CLAUDE.md`'s Commands section is accurate — every command verified from a clean clone.
8. Dependabot and secret scanning are on.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-01 stack churn — five new majors at once | F0-01 is a spike *before* anything depends on them; fallback recorded as an ADR |
| Tailwind 4.3's `@theme inline` differs from what §18.1 assumes | Verified in F0-01; F3 is the phase that would pay, so the finding lands two phases early |
| Custom ESLint rules are slow or brittle under ESLint 10's flat config | Keep them simple and pattern-based; if authoring them is disproportionate, fall back to `no-restricted-syntax` selectors and record the trade-off |
| Turborepo caching masks a real failure | CI runs with `--force` on `main`; local caching stays on |

## 10. Estimate

**3 days.** Roughly: 1 day on the spike (F0-01), 1 day on workspace + config + lint rules
(F0-02…F0-05, F0-08), 1 day on the app shell, env switch, CI and hygiene (F0-06,
F0-07, F0-09…F0-11). Medium uncertainty, concentrated entirely in F0-01.

## 11. Approval gate

Owner reviews: the commands all run from a clean clone; the three lint rules demonstrably
fire; CI is green on the PR; the pinned version table in `tooling-and-skills.md` matches
what was actually installed, with any fallback recorded as an ADR. Then F1 may start.
