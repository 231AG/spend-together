# B0 — Supabase foundation

## 1. Objective

Establish the Supabase environments and the local development loop before any schema
exists: the CLI running a local stack in Docker, staging and production projects created,
and a secrets policy that keeps the service-role key server-only. This phase also settles
the single biggest environmental unknown in the backend plan — whether Docker is
available here at all (risk R-13).

## 2. Spec references

§8.1 (Supabase in the stack), §24.1 (environments), §24.3 (secrets in GitHub Environments
and the host env store), §25.1 (secret scanning), §8.5 (the service-role rule).

## 3. Prerequisites

F13 approved — the frontend is complete and the contract has been stable through it.
Owner has created or authorised creation of the Supabase organisation.

## 4. Deliverables

- Supabase CLI pinned in the workspace; `supabase/` initialised.
- A local stack that starts, stops and resets reproducibly.
- Staging and production Supabase projects.
- `.env.example` extended; secrets documented and stored in GitHub Environments.
- `pnpm db:*` scripts wired into the workspace.
- A written decision on Docker availability and the fallback if it is absent.

## 5. Task breakdown

**B0-01 · Docker and CLI availability check** — *Purpose:* resolve R-13 before anything
depends on it. Verify Docker runs here and in CI; pin the Supabase CLI version. *Files:*
`docs/plans/00-shared/tooling-and-skills.md` updated. *Acceptance:* `supabase start`
brings up a local stack, or an ADR records the hosted-staging fallback and its cost.

**B0-02 · Initialise the Supabase workspace** — `supabase init`; directory layout per
§8.3 (`migrations/`, `functions/`, `tests/`, `seed.sql`). *Files:* `supabase/config.toml`.
*Acceptance:* the tree matches §8.3; `supabase start` and `supabase stop` are idempotent.

**B0-03 · Create staging and production projects** — two projects, region chosen for the
launch market, with connection details recorded as secrets rather than committed.
*Acceptance:* both reachable; production is not writable from a developer machine by
default.

**B0-04 · Secrets policy** — `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server-only), `FX_FALLBACK_KEY`, `SENTRY_DSN`, SMTP and SMS
credentials. Stored in GitHub Environments and the host env store. *Files:*
`.env.example`, `docs/plans/00-shared/secrets.md`. *Acceptance:* **a CI check fails any
build where a service-role key appears with a `NEXT_PUBLIC_` prefix** — enforced, not
documented.

**B0-05 · Workspace scripts** — `db:start`, `db:stop`, `db:reset`, `db:test`,
`db:types`, `db:push`. *Files:* root `package.json`. *Acceptance:* each runs from a clean
clone; `CLAUDE.md`'s Commands section updated.

**B0-06 · Type generation wiring** — generated DB types committed, with CI failing when
they are stale (§24.3). *Files:* `packages/config`, CI job. *Acceptance:* editing a
migration without regenerating types turns CI red.

**B0-07 · Enable the Supabase MCP server** — scoped to local and staging only. *Files:*
MCP config. *Acceptance:* connected; production is not reachable through it.

## 6. Tooling

Supabase CLI (version pinned here), Docker, Supabase MCP server. See
`tooling-and-skills.md` §2 and the backend CLI table.

## 7. Testing

No product tests. Verified by operation: the local stack starts and resets cleanly; the
type-generation staleness check fails when it should; the `NEXT_PUBLIC_` service-role
check fails when it should.

## 8. Exit criteria

1. `supabase start` produces a working local stack, reproducibly, including in CI.
2. Staging and production projects exist and are documented.
3. All secrets are stored outside the repository; secret scanning is on.
4. The service-role-key exposure check is wired into CI and demonstrably fails.
5. `pnpm db:*` scripts all work from a clean clone.
6. Type generation is wired with a staleness check.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-13 Docker unavailable | Resolved in B0-01, before anything depends on it; the fallback is a hosted staging project used for tests, at the cost of slower feedback — recorded as an ADR |
| Service-role key leaks to the client | Mechanical CI check (B0-04), plus the `security-review` skill on every backend PR |
| Free-tier staging pauses after 7 days of inactivity (§24.2) | Known and accepted for staging; a scheduled keep-alive ping or an accepted cold start, decided here |

## 10. Estimate

**3 days.** Roughly 1 day on the availability check and CLI setup, 1 day on projects and
secrets, 1 day on scripts, type generation and MCP wiring. Medium uncertainty,
concentrated in B0-01.

## 11. Approval gate

Owner reviews: a local stack running; both projects existing; the secrets policy; and the
CI check that fails a `NEXT_PUBLIC_` service-role key. Then B1 may start.
