# B10 — Deployment

## 1. Objective

Put the application into production properly: the full CI/CD pipeline from §24.3,
environments wired end to end, expand → migrate → contract migrations that never require
lockstep deploys, encrypted backups to R2, and a **completed restore drill** — because an
untested backup is not a backup, and this is a financial application.

## 2. Spec references

§24.1 (environments), §24.2 (hosting phases and cost), §24.3 (CI/CD pipeline, migrations,
rollback, secrets), §24.4 (backups, retention, quarterly restore drill), §27 item 8.
Open question **Q11** (Phase 1 hosting choice).

## 3. Prerequisites

B9 complete and approved. **Q11 answered** — Hetzner VPS or Vercel Pro for production
(§24.2). The VPS path adds roughly two days for Docker, Nginx, Certbot, PM2 and the
hardening checklist.

## 4. Deliverables

- The complete §24.3 pipeline, PR through production.
- Preview deployments per pull request against staging Supabase.
- Production environment per the Q11 decision.
- Expand → migrate → contract migration process, documented and exercised.
- Weekly encrypted `pg_dump` to Cloudflare R2, 8-week retention.
- A completed restore drill with a measured recovery time.
- A rollback runbook.

## 5. Task breakdown

**B10-01 · PR pipeline** — install → lint → typecheck → unit and component tests →
`supabase start` → migrations → pgTAP and API tests → build → preview deploy → Playwright,
axe and Lighthouse. *Files:* `.github/workflows/ci.yml`. *Acceptance:* §24.3 — the whole
sequence runs on a pull request and blocks merge on any failure.

**B10-02 · Staging deployment** — merge to `main` migrates staging then deploys it.
*Acceptance:* automatic, with migration failure halting the deploy rather than leaving a
mismatch.

**B10-03 · Production deployment with manual approval** — manual gate → migrate production
→ deploy → smoke tests. *Acceptance:* §24.3 — production cannot deploy without explicit
human approval; smoke tests run after and can trigger rollback.

**B10-04 · Expand → migrate → contract** — every migration is backward compatible with the
running application. *Files:* `docs/plans/00-shared/migrations.md` (from B1, exercised
here). *Acceptance:* a worked column rename is performed across three deploys with no
downtime and no lockstep requirement.

**B10-05 · Production hosting (Q11)** — either Vercel Pro, or Hetzner VPS with Docker,
Nginx, Certbot, PM2 or Node standalone output plus the hardening checklist and uptime
monitoring. *Acceptance:* §24.2 — TLS valid and auto-renewing; the app serves production
traffic; if VPS, the hardening checklist is complete.

**B10-06 · Supabase Pro** — production on Pro with daily backups and no pausing.
*Acceptance:* §24.2's warning is honoured — **no real users on Phase 1 infrastructure**;
daily backups confirmed present.

**B10-07 · Backups to R2** — weekly `pg_dump`, encrypted, to Cloudflare R2 with 8-week
retention. *Files:* `scripts/backup.sh`, schedule. *Acceptance:* §24.4 — a dump exists in
R2, is encrypted, and old dumps age out at 8 weeks.

**B10-08 · Restore drill** — restore a production backup into a scratch project, verify
data integrity, and **measure the recovery time**. *Files:*
`docs/plans/00-shared/restore-drill.md`. *Acceptance:* §24.4 and §27 item 8 — the drill is
completed and documented with a real RTO figure, not an estimate. Scheduled quarterly
thereafter.

**B10-09 · Rollback runbook** — redeploy the previous web build instantly; database fixes
are forward-only migrations (§24.3). *Files:*
`docs/plans/00-shared/rollback-runbook.md`. *Acceptance:* a rehearsed web rollback,
timed.

**B10-10 · Secrets in environments** — all secrets in GitHub Environments and the host
store; the service-role key never with a `NEXT_PUBLIC_` prefix. *Acceptance:* §24.3 — the
B0-04 CI check is active on every deploy path.

**B10-11 · Type-generation gate** — CI fails when generated DB types are stale (§24.3).
*Acceptance:* a migration without regenerated types turns CI red.

## 6. Tooling

GitHub Actions, Vercel and/or Hetzner per Q11, Cloudflare R2, Supabase Pro. No new npm
packages.

## 7. Testing

The pipeline tests itself: a deliberate failure at each stage must block. Smoke tests run
post-deploy in production. The restore drill is the phase's most important test, and its
output is a measured recovery time.

Supports **§27 item 8** (Phase 2 infrastructure live with backups, monitoring, alerting,
security headers and a completed restore drill).

## 8. Exit criteria

1. The full §24.3 pipeline runs, and each stage blocks on failure.
2. Preview deploys run per pull request against staging Supabase.
3. Production deploys require manual approval and run smoke tests afterwards.
4. Migrations are expand → migrate → contract, proven by a no-downtime rename.
5. Production runs on Phase 2 infrastructure — **not free tier** (§24.2's warning).
6. Supabase Pro daily backups plus weekly encrypted R2 dumps with 8-week retention.
7. **The restore drill is complete with a measured recovery time.**
8. The rollback runbook is written and rehearsed.
9. Secrets are in environment stores; the service-role check is active.
10. Stale generated types fail CI.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Q11 undecided at phase start | Flagged in open-questions since planning; both paths are costed (±2 days) so the decision is informed rather than urgent |
| A migration breaks the running app | Expand → migrate → contract, with a rehearsed rename proving it |
| Backups exist but cannot be restored | The restore drill is an exit criterion, not a recommendation — this is the single most important item in the phase |
| Free-tier pausing surprises a demo | §24.2's warning is honoured; production is Phase 2 from the start |
| Rollback needed at 2 a.m. by someone who has not done one | Written runbook, rehearsed and timed, with the web rollback path instant |

## 10. Estimate

**5 days**, or **7 if the VPS path is chosen** (Q11). Roughly: 1.5 days the pipeline, 1 day
staging and production deploys, 1 day hosting setup (+2 for VPS), 1 day backups and the
restore drill, 0.5 day runbook and secrets. Medium uncertainty, driven by Q11.

## 11. Approval gate

Owner reviews: a full pipeline run from PR to production; the no-downtime migration
rehearsal; the R2 backup; and **the restore drill document with its measured recovery
time**. Then B11 may start.
