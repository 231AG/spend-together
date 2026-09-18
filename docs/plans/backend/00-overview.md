# Backend plan — overview

## Goal

Build the Supabase backend that satisfies the contract frozen in F1 — exactly, verifiably,
and with couple privacy enforced in the database rather than in the UI — then swap the
frontend from mocks to live, domain by domain, without redesigning a screen.

## Principles

**The contract is not negotiable.** The frontend has been built against it for months.
B5's contract tests consume the **same fixtures** the MSW handlers use (ADR-002), so the
two implementations cannot quietly diverge. If the backend genuinely needs a contract
change, it is a proposed ADR with a stated impact on the affected frontend phases — not a
quiet edit.

**Privacy lives in Postgres.** BR-05 is enforced by Row-Level Security, proven by pgTAP
across owner / partner / stranger / ex-partner for every table. The application guard is a
second line, not the only one. A foreign or missing resource returns **404, never 403**.

**One domain package, both sides.** The API imports `packages/domain` for every
calculation. There is no second implementation of a formula on the server, and heavy
aggregation happens in SQL functions rather than JavaScript loops.

**The service-role key is radioactive.** It appears only in the three server-side jobs
named in §8.5 — fx-sync, base-currency recalculation, invitation acceptance — never with
a `NEXT_PUBLIC_` prefix, never in a request path a user can reach.

**Migrations are the source of truth.** Types are generated from them in CI and committed;
CI fails if they are stale. Schema changes are expand → migrate → contract so a deploy is
never in lockstep with a migration.

## Phase map

```
B0  Supabase foundation
     │
     ├─→ B1  Schema, migrations, seed
     │        │
     │        ├─→ B2  RLS policies + pgTAP
     │        │        │
     │        └─→ B3  Views, functions, triggers
     │                 │
     │                 ├─→ B4  Auth (SSR cookies, email/SMS, rate limits)
     │                 │        │
     │                 │        └─→ B5  API layer + contract tests
     │                 │                 │
     │                 │                 ├─→ B6  Multi-currency (fx-sync, recalc)
     │                 │                 │        │
     │                 │                 │        └─→ B7  Jobs & notifications
     │                 │                 │                 │
     │                 │                 │                 └─→ B8  Integration
     │                 │                 │                          │
     │                 │                 │                          ├─→ B9  Security & observability
     │                 │                 │                          │        │
     │                 │                 │                          │        └─→ B10 Deployment
     │                 │                 │                          │                 │
     │                 │                 │                          │                 └─→ B11 Launch readiness
```

| Phase | Name | Est. (days) | Uncertainty |
|---|---|:-:|:-:|
| B0 | Supabase foundation | 3 | Medium — Docker availability (R-13) |
| B1 | Schema, migrations and seed | 5 | Low — DDL is given verbatim in §9.3 |
| B2 | RLS policies and pgTAP | 6 | **High** — the privacy guarantee |
| B3 | Views, functions and triggers | 5 | Medium |
| B4 | Auth | 5 | Medium — third-party lead time (R-14) |
| B5 | API layer and contract tests | 10 | Medium — largest surface |
| B6 | Multi-currency | 6 | **High** — external provider dependency |
| B7 | Jobs and notifications | 4 | Low |
| B8 | Integration — mocks to live | 7 | **High** — where drift surfaces |
| B9 | Security and observability | 5 | Medium |
| B10 | Deployment | 5 | Medium — Q11 undecided |
| B11 | Launch readiness | 4 | Low |
| | **Total** | **65 days** | ≈ 13 working weeks for one engineer |

Combined with the frontend's 76 days, the whole build is **141 working days** — roughly
28 working weeks, or a little under seven months, for one engineer at a sustainable pace.
Two engineers splitting frontend and backend cannot simply halve it: the backend cannot
start before F1 freezes the contract, though B0–B3 could run in parallel with F5 onward
once it has.

## Definition of done for the backend

`backend-acceptance.md` in full. In summary: every endpoint implements the frozen contract
and passes the shared-fixture contract tests; pgTAP proves RLS for all four actor roles on
every table; fx-sync runs on schedule with a working fallback; the base-currency
recalculation meets its < 5 s target for 10,000 records; all of WAC-01…WAC-20 pass against
the real stack; the §25.1 security checklist is complete; Phase 2 infrastructure is live
with backups, monitoring and a completed restore drill (§27 item 8).

## What changes for the frontend

Almost nothing, which is the point. B8 flips `NEXT_PUBLIC_API_MODE` per domain behind the
flag built in F0. MSW is **kept** afterwards for tests and Storybook — it does not get
deleted, it stops being the runtime.
