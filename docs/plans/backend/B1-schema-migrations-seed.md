# B1 — Schema, migrations and seed

## 1. Objective

Create the database exactly as spec §9.3 defines it — every table, type, constraint and
index — as ordered migrations that are the single source of truth, plus the seed data the
product cannot start without: currencies, the default categories, and `app_config`
(including the goal-status thresholds F-19 reads).

## 2. Spec references

§9.1 (entity overview), §9.2 (ERD), §9.3 (the full DDL), §9.4 (objects created in B3),
§11.1 (currency seed and the availability check), §6.4 (`app_config` thresholds), §24.3
(expand → migrate → contract), BR-06, BR-11, BR-15, BR-17.
Open questions **Q4** (currency list) and **Q5** (default categories).

## 3. Prerequisites

B0 complete and approved. **Q4 and Q5 answered or the assumed lists accepted** — the seed
cannot be written without them, and F4's fixtures already encode the assumption.

## 4. Deliverables

- `supabase/migrations/0001_core.sql` — the §9.3 DDL in full.
- Follow-up migrations for `updated_at` triggers and any deferred constraints.
- `supabase/seed.sql` — currencies, 14 default categories, `app_config`.
- Generated TypeScript types committed.
- A migration style guide covering expand → migrate → contract.

## 5. Task breakdown

**B1-01 · Core migration** — `currencies`, `profiles`, `couples`, `couple_members`,
`couple_invitations`, `categories`, `transactions`, `savings_goals`,
`goal_contributions`, `exchange_rates`, `idempotency_keys`, `app_config`, plus every enum
(`couple_status`, `invitation_status`, `category_type`, `transaction_type`, `goal_type`).
*Files:* `migrations/0001_core.sql`. *Acceptance:* matches §9.3 **verbatim**, including
every `check` clause; `supabase db reset` applies it cleanly.

**B1-02 · Indexes and unique constraints** — `one_open_couple_per_user` (BR-06),
`one_pending_invite_per_couple`, `categories_unique_name`, `tx_user_date`,
`tx_user_type_date`, `tx_user_cat`, `contrib_goal_date`, `contrib_user_date`. *Files:*
`migrations/0001_core.sql`. *Acceptance:* each index exists; the BR-06 index rejects a
second open membership for a user.

**B1-03 · `updated_at` triggers** — the trigger §9.3 notes as omitted from the abridged
DDL. *Files:* `migrations/0002_triggers.sql`. *Acceptance:* every table with `updated_at`
maintains it automatically.

**B1-04 · Currency seed (Q4)** — the agreed list with correct ISO exponents. *Files:*
`seed.sql`. *Acceptance:* **JPY has exponent 0 and KWD has exponent 3** — T-12 depends on
them existing; LRD is present (§11.1).

**B1-05 · Default category seed (Q5)** — 14 system categories with `user_id = null`,
`is_default = true`, their Lucide icon keys and `cat-*` colour tokens. *Files:*
`seed.sql`. *Acceptance:* the check constraint `(is_default and user_id is null)` holds
for every row; names and colours match the UX spec's mapping table.

**B1-06 · `app_config` seed** — `goal_status_thresholds` (`ON_TRACK_MIN` 0.95,
`AT_RISK_MIN` 0.75), `fx_provider`, `invite_ttl_days` 7. *Files:* `seed.sql`.
*Acceptance:* F-19 reads thresholds from here, so changing them changes behaviour with no
deploy — verified by a test that alters the config and observes the status change.

**B1-07 · Constraint verification tests** — pgTAP over the constraints that encode
business rules: positive amounts (BR-07), note length, name lengths, goal type
exclusivity (individual XOR couple), date validity. *Files:*
`supabase/tests/constraints.test.sql`. *Acceptance:* each constraint has a test that
proves it rejects the invalid case.

**B1-08 · Type generation** — commit generated types; wire the staleness check. *Files:*
`packages/config/database.types.ts`. *Acceptance:* types compile against
`packages/schemas` without contradiction.

**B1-09 · Migration style guide** — expand → migrate → contract, naming, reversibility,
and the rule that a migration must be backward compatible with the running app (§24.3).
*Files:* `docs/plans/00-shared/migrations.md`. *Acceptance:* documented with a worked
example of a column rename done safely.

## 6. Tooling

Supabase CLI, pgTAP (both from B0). The `rls-policy-review` skill is created in B2, not
here.

## 7. Testing

pgTAP constraint tests (B1-07) and a seed-integrity test asserting 14 default categories,
the agreed currency list with correct exponents, and the three `app_config` keys. These
run in CI via `supabase test db` and block merge.

Supports **WAC-09** (derived balances — there is deliberately no balance column) and
every formula test that depends on correct exponents (**T-11, T-12**).

## 8. Exit criteria

1. `supabase db reset` applies all migrations and the seed cleanly, repeatedly.
2. The schema matches §9.3 exactly — table by table, constraint by constraint.
3. `savings_goals` has **no balance column** (BR-08); balances are derived in B3.
4. BR-06's one-open-membership index rejects a second open membership.
5. The seed produces the agreed currencies (with JPY 0 and KWD 3) and 14 default
   categories.
6. `app_config` carries the F-19 thresholds, and changing them changes status behaviour.
7. pgTAP constraint tests pass in CI.
8. Generated types are committed and current.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-11 seed guessed wrong (Q4/Q5) | Both isolated to `seed.sql`; nothing references a category by literal UUID (lint-enforced), so a change is a data edit plus fixture regeneration |
| Transcription error in the long DDL | Reviewed line by line against the digest; constraint tests prove the semantics, not just the syntax |
| `citext` or `pgcrypto` unavailable | Both are standard on Supabase; verified in B0's local stack |
| A currency in the seed has no FX rate | B6's pre-build check sets `is_active = false` rather than failing |

## 10. Estimate

**5 days.** Roughly 2 days the core migration and indexes, 1 day seeds, 1 day constraint
tests, 1 day types and the style guide. Low uncertainty — §9.3 is given verbatim.

## 11. Approval gate

Owner reviews: a schema diff against §9.3; the seeded currency and category lists (the
last chance to correct Q4/Q5 cheaply); and the passing constraint tests. Then B2 may
start.
