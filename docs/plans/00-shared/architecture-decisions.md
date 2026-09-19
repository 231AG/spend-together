# Architecture Decision Record

One entry per decision that would be expensive to reverse. Status is one of
**Accepted**, **Proposed** (needs the owner's confirmation), **Superseded**.

Format: context → decision → consequences. Keep entries short; the reasoning matters
more than the prose.

---

## ADR-001 — Stack: Next.js App Router + Supabase, pnpm workspaces + Turborepo

**Status:** Accepted (fixed by the owner; recorded here so later sessions do not relitigate it)
**Spec:** §8.1, §8.3

**Context.** The product is a responsive web app and installable PWA that must keep
financial queries off the client, enforce couple privacy at the data layer, and remain
reusable by a possible future React Native client.

**Decision.** Next.js (App Router, TypeScript strict, Node.js runtime) with REST Route
Handlers under `/api/v1`; Supabase Postgres + Auth + Row-Level Security; a pnpm
workspace monorepo orchestrated by Turborepo, laid out exactly as spec §8.3.

**Consequences.**
- Privacy is enforced twice — application guard *and* RLS — so a UI bug cannot leak a
  partner's data.
- A REST surface (rather than Server-Actions-only) costs a little ceremony now and buys
  a native client later at no redesign cost.
- The monorepo makes `packages/domain` and `packages/schemas` importable by both the web
  app and the API without publishing anything.

---

## ADR-002 — Contract-first delivery: freeze the API contract, build the frontend against MSW

**Status:** Accepted (fixed by the owner)
**Spec:** §10.1–10.5, §16.3

**Context.** The frontend is built to completion before the backend exists. Without a
frozen contract the two halves drift and integration becomes a rewrite.

**Decision.** Phase F1 produces `packages/schemas`: Zod schemas and inferred types for
every endpoint in §10.3 and §10.4, the error envelope (§10.2), the money object and
cursor pagination. From the end of F1 the contract is **frozen**. The frontend runs
against an MSW mock backend (F4) that implements that contract and enforces the real
business rules. The backend (B5) is then written to satisfy the same contract, and its
contract tests consume **the same fixture files** the MSW handlers use.

**Consequences.**
- Mocks and the real API cannot silently diverge: one fixture set, two consumers.
- Any contract change after F1 needs a new ADR *and* an edit to the affected backend
  phase file. This is deliberate friction.
- The frontend can reach "complete" and be reviewed before any database exists.

---

## ADR-003 — Undo is a distinct endpoint: `POST /transactions/:id/restore`

**Status:** **Proposed** — needs the owner's confirmation before F1 closes
**Spec:** §7.4, SCR-13, §10.3 (`DELETE /transactions/:id`)

**Context.** The spec requires a 5-second Undo on a soft-deleted transaction and has
`DELETE /transactions/:id` return `{undo_until}` — but neither §10.3 nor §10.4
catalogues anything that restores the row. The contract cannot freeze with a
user-visible action that has no endpoint.

**Decision.** Add `POST /api/v1/transactions/:id/restore` to the frozen contract. It
clears `deleted_at`, returns the restored transaction, and returns `404 NOT_FOUND` if
the record was already purged or never belonged to the caller. It is naturally
idempotent (restoring a live row is a no-op success), which matters for the offline
outbox and for a double-tapped Undo button.

**Alternative rejected.** Overloading `PATCH /transactions/:id` with
`{deleted_at: null}`. That makes a lifecycle transition look like a field edit, and
`PATCH` already carries re-conversion semantics when amount, currency or date change.

**Consequences.** One endpoint added to §10.4's implementation list. Frontend F7 and
backend B5 both reference it. If the owner rejects it, F7's Undo becomes a client-side
delay-then-send (hold the delete for 5 s before issuing it) — which is worse offline and
loses the undo if the tab closes, so this ADR is the recommended path.

---

## ADR-004 — Required pace is computed at full precision and rounded exactly once

**Status:** **Proposed** — needs confirmation before F2 closes
**Spec:** §6.3 F-15/F-16/F-17, §6.5, §10.5

**Context.** F-16 reads "F-15 × 7" and F-17 "F-15 × 30.4375". Read literally — using the
*rounded* F-15 — the spec's own published example does not reproduce: with remaining
$600 over 105 days, rounded daily is 571 minor, and 571 × 7 = 3,997 ≠ the published
4,000; 571 × 30.4375 = 17,380 ≠ the published 17,393.

**Decision.** Compute `daily = remaining / max(days, 1)` at full decimal precision, then
derive weekly and monthly from that **unrounded** quotient, rounding each of the three
results to minor units exactly once, half away from zero. This reproduces $5.71 / $40.00
/ $173.93 and the `{daily: 571, weekly: 4000, monthly: 17393}` payload in §10.5.

**Consequences.** `packages/domain` exposes one internal full-precision pace calculation
with three rounded outputs, never chaining rounded values. T-06 and WAC-10 assert the
published figures.

---

## ADR-005 — A conversion that rounds below one minor unit is rejected, not stored as zero

**Status:** **Proposed** — needs confirmation before F1 closes
**Spec:** §6.1, §9.3 (`check (base_amount_minor > 0)`), §10.2

**Context.** The DDL requires `base_amount_minor > 0`, but F-23 rounds half away from
zero into the target currency's minor unit. A genuine tiny amount in a weak currency —
0.01 LRD into USD — rounds to 0 and violates the constraint, producing a raw database
error with no specified user-facing behaviour.

**Decision.** Validate before insert. If the converted base amount (or, for a
contribution, the converted goal amount) rounds to 0, reject with `422
VALIDATION_FAILED` and a field message on `amount`: *"This amount is too small to record
in USD. Enter a larger amount."* The domain package exposes this as a typed result, not
an exception, so the MSW mock, the client preview and the server all agree.

**Alternative rejected.** Relaxing the check to `>= 0`. A stored zero silently corrupts
every total, category percentage and savings rate it feeds into — exactly the class of
bug this spec's integer-money discipline exists to prevent.

**Consequences.** The `AmountInput` conversion preview surfaces the same message live,
before the user presses Save, so the rejection is never a surprise.

---

## ADR-006 — The contract freeze is split into two phases: schemas (F1), then domain (F2)

**Status:** Accepted
**Spec:** §6, §10

**Context.** The brief groups "contract freeze" as one concern covering both
`packages/schemas` and `packages/domain`. They have different shapes of risk: the schemas
are broad and shallow (every endpoint, quickly), the domain is narrow and deep (24
formulas, timezone and rounding edge cases, a 100% coverage gate, 16 mandated test
cases).

**Decision.** Split them. F1 delivers `packages/schemas` and freezes the wire contract.
F2 delivers `packages/domain` with T-01…T-16 and the coverage gate.

**Consequences.** The contract freezes about four days earlier, which unblocks F4's mock
handlers sooner. The domain work gets its own approval gate, which is where the money
bugs would otherwise hide. Phase numbering runs F0–F13 rather than the brief's 13 steps.

---

## ADR-007 — Component workbench: Storybook

**Status:** Accepted
**Spec:** §14.3, §19.1–19.2, §20

**Context.** Spec §14.3 defines 23 shared components, each with multiple variants and
the full state matrix from §19.2 (default, hover, focus, active, disabled, loading,
error, empty, offline). These must be reviewable without clicking through the app, and
`@axe-core` must run per component state.

**Decision.** Storybook, mounted in `apps/web`, sharing the MSW handlers from F4 via the
MSW Storybook addon.

**Why not the alternatives.**
- *A hand-rolled `/dev/components` route* — cheapest to start, but we would rebuild
  isolation, a11y hooks and interaction testing by hand, and it ships inside the app
  bundle unless carefully excluded.
- *Ladle* — faster and lighter, but the MSW and axe integrations are less mature, and we
  depend on both.
- *No workbench* — makes "every variant and state" unreviewable, which is a stated
  requirement of phase F3.

**Consequences.** One more dev-dependency tree and a CI job. The MSW handlers get reused
in three places (app, Storybook, tests), which further protects against drift.

---

## ADR-008 — Plans are Markdown only; no PDF export

**Status:** Accepted (owner's decision, 18 Sep 2026)
**Supersedes:** the planning brief's requirement for
`docs/plans/pdf/SpendTogether_Frontend_Plan.pdf` and `…_Backend_Plan.pdf`

**Context.** The environment has no Markdown-to-PDF converter (no pandoc, no weasyprint,
no LaTeX). Building one would mean a dev-only Chromium rendering script. The owner
decided the review value did not justify it.

**Decision.** The Markdown files under `docs/plans/` are the deliverable and the source
of truth. No `docs/plans/pdf/` directory exists.

**Consequences.** Plans stay diffable and reviewable in the pull request, which is where
review actually happens. If a PDF is ever needed for an outside reader, the exporter can
be added later under `docs/tools/` without touching plan content.

---

## ADR-009 — TypeScript 6.0.3, not 7.0.2, until typescript-eslint supports TS 7

**Status:** Accepted
**Date:** 19 September 2026 (phase F0, ticket F0-01)
**Supersedes:** the TypeScript row of `tooling-and-skills.md` §3, which pinned 7.0.2

**Context.** The plan pinned TypeScript 7.0.2, read from the npm registry at
planning time. F0-01's compatibility spike ran the full pinned stack together
before any product code depended on it — which is exactly what that ticket exists
for (risk R-01).

TypeScript 7 works on its own: 7.0.2 accepted `strict`,
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and both flags were
verified to fire on deliberate violations.

**The blocker is `typescript-eslint`.** Version 8.70.0 — the latest stable, and
the only one supporting ESLint 10 — declares `typescript@>=4.8.4 <6.1.0` and
*hard-refuses* to load against TS 7:

```
typescript-eslint does not support TS 7.0.
See https://github.com/typescript-eslint/typescript-eslint/issues/10940
for tracking typescript-eslint's support for TS >=7.1
```

This is a load-time throw, not a warning. It costs not just type-aware rules but
the ability to lint `.ts` files **at all**, because the parser comes from the same
package. The three custom lint rules are a core F0 deliverable and the mechanism
behind three of CLAUDE.md's non-negotiable rules, so shipping without them was
never an option.

**Options considered.**

1. **TypeScript 6.0.3** (chosen). Latest 6.x. Everything works: both strict flags
   fire, ESLint 10 + typescript-eslint 8.70.0 load cleanly, and all three custom
   rules were verified firing on fixtures.
2. *Side-by-side installs* — TS 7 for compilation, TS 6 for typescript-eslint's
   API, as the TypeScript 7 release notes suggest. Two compilers, two sets of
   diagnostics, and a real risk that lint and typecheck disagree about the same
   file. Disproportionate for the benefit.
3. *Drop TypeScript linting* — rejected outright. It would remove the money rule,
   the ambient-clock rule and the import-boundary rule.

**Decision.** Pin `typescript@6.0.3` across the workspace.

**Consequences.**
- No functional loss: TS 6.0.3 supports every compiler option this project uses.
- We forgo TS 7's compile-speed improvements. On a workspace this size that is
  not yet a cost worth a two-compiler setup.
- **Revisit when `typescript-eslint` ships TS ≥ 7.1 support** (issue #10940). The
  upgrade is then a version bump plus a full CI run, because nothing in our code
  depends on TS 6 semantics.
- Dependabot will keep proposing TypeScript 7; those PRs stay closed until #10940
  lands. This ADR is the reason to point at.

**Also verified in the same spike (no change needed):** Next 16.3.5, React 19.3.0,
Vitest 5.0.1, ESLint 10.10.0, Prettier 3.9.8, Turbo 2.10.13, and Tailwind 4.3.3 —
including that `@theme inline` emits `var(...)` references rather than inlined
values, which is precisely the indirection spec §18.1 assumes and phase F3 needs.

---

## ADR-010 — pnpm 10.33.0, not 12.4.2

**Status:** Accepted
**Date:** 19 September 2026 (phase F0, ticket F0-01)

**Context.** The plan pinned pnpm 12.4.2, the registry's latest at planning time.
The build environment ships pnpm 10.33.0, and the entire F0 verification — install,
lint, typecheck, test, build — was performed under it.

**Decision.** Pin `"packageManager": "pnpm@10.33.0"` and use the same version in CI.

**Rationale.** Pinning a version we have not run would reintroduce exactly the
unverified-claim problem the F0-01 spike exists to eliminate, and lockfile format
differs across pnpm majors. The version that is pinned is the version that was
proven.

**Consequences.** Upgrading to pnpm 12 is a deliberate, separately verified change:
bump `packageManager`, bump the CI `pnpm/action-setup` version, regenerate the
lockfile, and run CI. Not urgent — nothing in the plan depends on a pnpm 12 feature.
