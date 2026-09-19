# Tooling and skills inventory

Three tables: Claude Code skills, MCP servers, npm packages and CLIs.

**Version provenance.** Versions were read from the live npm registry on **18 September
2026** during planning, then **installed and proven together on 19 September 2026** by
the F0-01 compatibility spike (risk R-01). Rows marked ✅ verified were exercised end to
end — install, lint, typecheck, test, build.

> **The spike found one real incompatibility.** `typescript-eslint` hard-refuses
> TypeScript 7, so TypeScript is pinned to **6.0.3**, not 7.0.2 — see **ADR-009**. pnpm
> is pinned to the environment's **10.33.0** rather than 12.4.2 — see **ADR-010**. Both
> rows below reflect what is actually installed.

Verification status legend: ✅ verified now · ⚠️ `VERIFY AT F0` · 🔨 to be created by us.

---

## 1. Claude Code skills

| Name | Type | Purpose in this project | Phase introduced | Install / enable | Req? | Verified |
|---|---|---|---|---|:-:|:-:|
| `code-review` | Built-in | Correctness review on every phase PR before its approval gate | F0 | Already available | Required | ✅ |
| `security-review` | Built-in | RLS policy review, service-role-key misuse, header/CSP pass | B2, B9 | Already available | Required | ✅ |
| `dataviz` | Built-in | C-01…C-07 construction, categorical palette discipline, "view as table" | F8 | Already available | Required | ✅ |
| `simplify` | Built-in | Quality pass after the two large component phases | F3, F7 | Already available | Optional | ✅ |
| `run` | Built-in | Launch the app and verify a change in the real UI | F5 onward | Already available | Optional | ✅ |
| `session-start-hook` | Built-in | Make the repo bootstrap reliably in future web sessions | F0 | Already available | Optional | ✅ |
| `fewer-permission-prompts` | Built-in | Allowlist routine read-only commands once the workspace exists | F0 | Already available | Optional | ✅ |
| `money-handling` | **Project** | Minor units only; `decimal.js` for rates; round half away from zero exactly once per record; the branded `MoneyMinor` type; banned patterns (`parseFloat` on money, chained rounding, float multiplication). Loaded whenever a ticket touches an amount. | F2 | Create `.claude/skills/money-handling/SKILL.md` | Required | 🔨 |
| `contract-first-endpoint` | **Project** | The ordered walk for any endpoint: Zod schema → MSW handler → shared fixture → route handler → contract test. Includes the ADR requirement for post-freeze changes. | F1 | Create `.claude/skills/contract-first-endpoint/SKILL.md` | Required | 🔨 |
| `component-checklist` | **Project** | Every variant and state from §14.3 + §19.2; token-only styling; keyboard and focus map; ARIA; reduced motion; the Storybook story set each component owes. | F3 | Create `.claude/skills/component-checklist/SKILL.md` | Required | 🔨 |
| `rls-policy-review` | **Project** | For any new table or policy: the owner / partner / stranger / ex-partner matrix, the 404-not-403 rule, and the pgTAP cases that must exist before merge. | B2 | Create `.claude/skills/rls-policy-review/SKILL.md` | Required | 🔨 |
| `spec-trace` | **Project** | Update `traceability-matrix.md` as part of a ticket's definition of done; verify by grepping test names for the T- and WAC- tags. | F0 | Create `.claude/skills/spec-trace/SKILL.md` | Optional | 🔨 |

The five project skills are **created in the phase that first needs them**, not up front.
Writing `money-handling` before `packages/domain` exists would be guessing at its own
content.

---

## 2. MCP servers

| Name | Type | Purpose | Phase | Enable | Req? | Permissions needed | Verified |
|---|---|---|---|---|:-:|---|:-:|
| GitHub | MCP | PRs, CI status, review comments, check runs | F0 | Already connected | Required | Repo read/write, PR write, Actions read | ✅ connected |
| Playwright | MCP | Drive the running app for interactive UI verification during F5–F11 | F5 | ⚠️ not connected — enable at F5 | Optional | Local browser launch, localhost network | ⚠️ |
| Supabase | MCP | Inspect schema, run migrations, read logs against **local and staging only** | B1 | ⚠️ not connected — enable at B1 | Optional | Project read, SQL execute on local/staging. **Never production. Never the service-role key.** | ⚠️ |
| Unsplash | MCP | Source illustrations for EmptyState, onboarding and Welcome, per §18.2 (flat, soft gradients, people of African descent represented prominently) | F3 | Already connected | Optional | Read/search only | ✅ connected |

**On Playwright:** Chromium is preinstalled in this environment at `/opt/pw-browsers`
with `PLAYWRIGHT_BROWSERS_PATH` already set, and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
prevents npm from re-fetching it. The E2E suite runs here whether or not the MCP server
is connected; the server only adds interactive driving.

**On Supabase MCP:** convenience only. `supabase/migrations/` remains the source of
truth and the CLI remains the mechanism. No schema change may originate from an MCP call
without a matching committed migration.

---

## 3. npm packages and CLIs, by workspace

### Root — workspace and tooling

| Package | Version | Purpose | Phase | Req? | Verified |
|---|---|---|---|:-:|:-:|
| `pnpm` | **10.33.0** | Workspace manager (`packageManager` field pins it). ADR-010 | F0 | Required | ✅ proven |
| `turbo` | 2.10.13 | Task graph, remote-cacheable pipelines | F0 | Required | ✅ proven |
| `typescript` | **6.0.3** | Strict everywhere. 7.0.2 blocked by ADR-009 | F0 | Required | ✅ proven |
| `eslint` | 10.10.0 | Lint, incl. the money and import-boundary rules | F0 | Required | ✅ proven |
| `prettier` | 3.9.8 | Formatting | F0 | Required | ✅ proven |
| `vitest` | 5.0.1 | Unit + component runner, coverage | F0 | Required | ✅ proven |
| `@vitest/coverage-v8` | 5.0.1 | 100% gate for `packages/domain` (declared F0, enforced F2) | F0 | Required | ✅ installed |
| `typescript-eslint` | 8.70.0 | TS parser + rules. Supports ESLint ^10; caps TS <6.1 (ADR-009) | F0 | Required | ✅ proven |
| `@eslint/js` | 10.0.1 | ESLint recommended base. Versioned independently of `eslint` | F0 | Required | ✅ proven |
| `husky` + `lint-staged` | — | Pre-commit lint/format | — | Optional | Not adopted — CI covers it |

### `packages/domain` — pure, two dependencies only

| Package | Version | Purpose | Phase | Req? | Verified |
|---|---|---|---|:-:|:-:|
| `decimal.js` | 10.6.0 | FX rate arithmetic (§6.1) | F2 | Required | ✅ |
| `date-fns-tz` | 3.2.0 | IANA-aware period boundaries, ISO weeks (BR-16) | F2 | Required | ✅ |

Any third runtime dependency here needs an ADR. The purity of this package is a
non-negotiable rule in `CLAUDE.md`.

### `packages/schemas`

| Package | Version | Purpose | Phase | Req? | Verified |
|---|---|---|---|:-:|:-:|
| `zod` | 4.6.5 | The frozen contract (§10.2–10.4, §16.3) | F1 | Required | ✅ |

### `apps/web` — runtime

| Package | Version | Purpose | Phase | Req? | Verified |
|---|---|---|---|:-:|:-:|
| `next` | 16.3.5 | App Router, Node.js runtime, intercepted routes | F0 | Required | ✅ |
| `react` / `react-dom` | 19.3.0 | — | F0 | Required | ✅ |
| `tailwindcss` | 4.3.3 | `@theme inline` token mapping (§18.1) — indirection confirmed in F0-01 | F3 | Required | ✅ proven |
| `@radix-ui/react-dialog` | 1.1.23 | Dialogs and sheets (focus trap, Esc, focus return) | F3 | Required | ✅ |
| `@radix-ui/react-*` | ⚠️ per package | Popover, Select, Tabs, RadioGroup, Toast, Tooltip | F3 | Required | ⚠️ |
| `lucide-react` | 1.47.0 | Icon set (§18.2: rounded outline, 20/24 px, stroke 1.75) | F3 | Required | ✅ |
| `@tanstack/react-query` | 5.103.1 | Cache, optimistic updates, IndexedDB persistence | F4 | Required | ✅ |
| `@tanstack/react-query-persist-client` | ⚠️ match core | Offline read cache | F12 | Required | ⚠️ |
| `recharts` | 3.10.1 | C-01…C-07 | F8 | Required | ✅ |
| `serwist` / `@serwist/next` | 9.5.12 | Service worker, precache, runtime caching | F12 | Required | ✅ |
| `idb` | 8.0.3 | IndexedDB outbox | F12 | Required | ✅ |
| `@supabase/supabase-js` | 2.116.0 | Typed data access | B1 | Required | ✅ |
| `@supabase/ssr` | 0.12.7 | Cookie-based auth (§8.1) | B4 | Required | ✅ |

> **`@supabase/ssr` is pre-1.0 (0.12.7).** Pin it exactly, not with a caret — its cookie
> API can move between minors, and it sits on the authentication path.

### `apps/web` — development and testing

| Package | Version | Purpose | Phase | Req? | Verified |
|---|---|---|---|:-:|:-:|
| `msw` | 2.15.0 | Mock backend implementing the frozen contract | F4 | Required | ✅ |
| `@playwright/test` | 1.63.0 | E2E flows 7.1–7.10, offline, couple two-user | F13 | Required | ✅ |
| `@axe-core/playwright` | 4.13.0 | Serious/critical violations fail CI | F3 | Required | ✅ |
| `@testing-library/react` | 16.3.3 | Component tests | F3 | Required | ✅ |
| `@testing-library/user-event` | ⚠️ | Realistic interaction in component tests | F3 | Required | ⚠️ |
| `storybook` + `@storybook/nextjs` | ⚠️ | Component workbench (ADR-007) | F3 | Required | ⚠️ |
| `msw-storybook-addon` | ⚠️ | Reuse F4 handlers inside Storybook | F3 | Required | ⚠️ |
| `@lhci/cli` | ⚠️ | WAC-20 performance budgets | F13 | Required | ⚠️ |
| `k6` | ⚠️ (CLI, not npm) | API load testing for WAC-20 p95 | B9 | Optional | ⚠️ |

### Backend CLIs

| Tool | Version | Purpose | Phase | Install | Req? | Verified |
|---|---|---|---|---|:-:|:-:|
| Supabase CLI | ⚠️ | Local Docker stack, migrations, `supabase test db`, type generation | B0 | ⚠️ `VERIFY AT F0` | Required | ⚠️ |
| pgTAP | ⚠️ | RLS and constraint tests (§23.2) — ships with the Supabase CLI test harness | B2 | Via Supabase CLI | Required | ⚠️ |
| Docker | present in most CI images | Required by the local Supabase stack | B0 | Environment-provided | Required | ⚠️ verify at B0 (risk R-13) |

---

## What F0 confirmed — results

Run 19 September 2026, ticket F0-01. Anything that failed became an ADR, not a silent
downgrade.

| # | Question | Result |
|:-:|---|---|
| 1 | Does the root set install together without unresolved peer conflicts? | **No, as pinned.** `typescript-eslint` caps TypeScript at `<6.1.0`. Resolved by ADR-009 (TS 6.0.3). Everything else installed clean. |
| 2 | Does TypeScript accept `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`? | **Yes** — on both 7.0.2 and 6.0.3. Each flag was verified *firing* on a deliberate violation, not just accepted. |
| 3 | Does the ESLint 10 flat config run under it? | **Yes on TS 6.0.3. No on TS 7** — typescript-eslint throws at load. This is what forced ADR-009. |
| 4 | Does Tailwind 4.3's `@theme inline` behave as §18.1 assumes? | **Yes.** Confirmed it emits `.text-income{color:var(--money-income)}` — a variable reference, not an inlined value. That indirection is what F3's semantic aliases require. |
| 5 | Do `pnpm install / lint / typecheck / test / build` pass? | **Yes**, all five, across all four workspaces. |
| 6 | Supabase CLI version and Docker availability (risk R-13)? | **Deferred to B0**, which is where that ticket lives. No backend phase is unblocked by F0. |
