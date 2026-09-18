# B3 — SQL views, functions and triggers

## 1. Objective

Build the derived layer §9.4 specifies: the `goal_balances` view that makes balances
derived rather than stored (BR-08), the aggregate functions Home and Insights depend on,
the two `security definer` functions that own the couple lifecycle atomically, the trigger
that keeps goal completion correct in both directions (BR-11), and the recalculation
function that base-currency changes will call in B6.

## 2. Spec references

§9.4 (every object listed), BR-08 (derived balances), BR-11 (completion and reversal),
BR-16 (period boundaries), BR-18 (couple end), §6.2 (F-01…F-09 as aggregates), §11.3
(recalculation), §23.2 (`accept_invitation` rejections), §16.3 (the series the insights
payload needs).

## 3. Prerequisites

B1 and B2 complete and approved — policies exist before the functions that must respect
or deliberately bypass them.

## 4. Deliverables

- `goal_balances` view (`security_invoker`).
- `period_summary(p_start, p_end)`, `category_breakdown(p_start, p_end)`,
  `spending_series(p_start, p_end, p_bucket)` — all `security invoker`.
- `accept_invitation(p_token)` and `end_couple()` — `security definer`, reviewed line by
  line.
- `sync_goal_completion()` trigger on `goal_contributions`.
- `recalc_base_amounts(p_user)`.
- pgTAP coverage for all of the above.

## 5. Task breakdown

**B3-01 · `goal_balances` view** — `goal_id`, `balance_minor` = Σ `goal_amount_minor`,
`contribution_count`, `last_contribution_date`. `security_invoker` so RLS still applies.
*Files:* `migrations/0004_views.sql`. *Acceptance:* **BR-08** — no balance is ever stored;
the view returns zero rows for a goal the caller cannot see.

**B3-02 · `period_summary`** — income, expenses and recorded savings for `auth.uid()` in
base currency over a date range. Sums **already-converted** `base_amount_minor` values and
never re-converts (§6.1). *Files:* `migrations/0005_functions.sql`. *Acceptance:*
reproduces the §6.5 figures for September; recorded savings uses
`contributor_base_amount_minor` and **excludes the partner's contributions** (F-03).

**B3-03 · `category_breakdown`** — expense totals per category for a period, excluding
contributions (BR-02). *Acceptance:* returns the five reference categories with the
corrected amounts; a contribution never appears.

**B3-04 · `spending_series`** — bucketed income and expense series by day, week or month,
with buckets aligned to the **user's timezone** (BR-16) and ISO weeks starting Monday.
*Acceptance:* a transaction at 23:30 on 31 August falls in the correct month for both an
Africa/Monrovia and an Asia/Tokyo user (T-13 at the SQL layer); weeks start Monday (T-14).

**B3-05 · `sync_goal_completion()` trigger** — sets `completed_at` when the balance
reaches the target and **clears it** when a later edit or deletion drops below (BR-11).
Fires on insert, update and delete of `goal_contributions`. *Files:*
`migrations/0006_triggers.sql`. *Acceptance:* **WAC-11** — completion reverses; tested in
both directions, which is the half usually missed.

**B3-06 · `accept_invitation(p_token)`** — atomic and `security definer`: verify the token
hash, check expiry, confirm the invitee's identity matches, confirm the invitee has no
open couple, insert the membership, set the couple active, mark the invitation accepted —
**and resolve competing pending invitations per Q6** (assumed: mark them `declined` in
the same transaction). *Files:* `migrations/0005_functions.sql`. *Acceptance:* §23.2's
five rejections all fail closed; the whole thing is one transaction, so a partial accept
is impossible.

**B3-07 · `end_couple()`** — `security definer`: set the couple ended, set `left_at` for
both members, set `archived_at` on couple goals. *Acceptance:* **BR-18** — after ending,
both former partners can still read the goals and their history, and neither can
contribute.

**B3-08 · `recalc_base_amounts(p_user)`** — recompute `base_amount_minor` and
`contributor_base_amount_minor` for every record, **each at the rate of its own date**,
not today's (§11.2). Runs in one transaction. *Acceptance:* original `amount_minor` and
`currency` are untouched; a 10,000-record run completes within the § 11.3 target of 5
seconds (measured here, load-tested properly in B6).

**B3-09 · Function security review** — the two `security definer` functions get a line-by-
line review: no user input reaches dynamic SQL, `search_path` is pinned, and each does
exactly what its name says. *Files:* review notes in the PR. *Acceptance:* the
`security-review` skill run is clean.

**B3-10 · pgTAP for the derived layer** — every function and the trigger. *Files:*
`supabase/tests/functions/*.test.sql`. *Acceptance:* each object has happy-path, boundary
and denial tests.

## 6. Tooling

No new tooling. `security-review` and `rls-policy-review` skills both apply.

## 7. Testing

pgTAP across the whole derived layer, with particular weight on the completion trigger's
reversal, the timezone correctness of `spending_series`, and `accept_invitation`'s
rejections. These functions are what the API's performance and correctness rest on, so
they are tested at the SQL layer rather than only through the API.

Covers **WAC-09** (derived balance), **WAC-11** (completion and reversal), **WAC-13**
(period correctness) at the database level, and §23.2's invitation cases.

## 8. Exit criteria

1. Every object in §9.4 exists with the specified type and security mode.
2. `goal_balances` is a view; no balance column exists anywhere (BR-08).
3. `period_summary` reproduces the §6.5 reference figures, excluding a partner's
   contributions from the user's recorded savings.
4. `spending_series` buckets correctly in the user's timezone, with ISO Monday weeks.
5. `sync_goal_completion` both sets and clears `completed_at`.
6. `accept_invitation` is atomic and rejects all five §23.2 cases.
7. `end_couple` archives couple goals while preserving read access for both parties.
8. `recalc_base_amounts` re-converts at each record's own date and preserves originals.
9. Both `security definer` functions pass review with a pinned `search_path`.
10. pgTAP green.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A `security definer` function becomes a privilege-escalation path | Line-by-line review, pinned `search_path`, no dynamic SQL, only two such functions exist |
| Completion trigger implemented one-way | Explicit reversal test (B3-05); also proven end to end in F9 and B8 |
| Aggregate functions drift from `packages/domain` | The API computes presentation metrics with the domain package; SQL does summation only, and B5's contract tests compare both against the same fixtures |
| Timezone bucketing wrong at DST or month edges | T-13/T-14 replicated at the SQL layer, not only in TypeScript |
| Recalculation locks a user's rows for too long | One transaction per user, measured here and load-tested in B6; the UI keeps prior values behind a banner meanwhile |

## 10. Estimate

**5 days.** Roughly 1 day the view and simple aggregates, 1.5 days `spending_series` with
timezone bucketing, 1 day the two lifecycle functions, 0.5 day the trigger, 1 day pgTAP
and the security review. Medium uncertainty, concentrated in timezone-aware bucketing.

## 11. Approval gate

Owner reviews: `period_summary` reproducing §6.5; the completion trigger reversing; the
five invitation rejections; and the recalculation preserving originals. Then B4 may start.
