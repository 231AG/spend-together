# B2 — Row-Level Security policies

## 1. Objective

Implement the §9.5 policy matrix on every table and prove it with pgTAP across four actor
roles — owner, partner, stranger and ex-partner — so that BR-05, the product's core
promise, is a database guarantee rather than a UI convention. This is the highest-stakes
phase in the backend plan: a gap here is a privacy breach, and the frontend cannot detect
it.

## 2. Spec references

§9.5 (the RLS matrix), §23.2 (critical RLS tests), BR-03, BR-04, BR-05, BR-06, BR-17,
BR-18, §10.1 (404 not 403), WAC-12, AC11, AC12, §27 item 5.

## 3. Prerequisites

B1 complete and approved.

## 4. Deliverables

- RLS enabled on **every** table, with policies per §9.5.
- `is_couple_member(c uuid)` helper, returning true for open **and ended** memberships
  (BR-18 — ex-partners keep read access to history).
- `partner_profile` view exposing a partner's **name only**.
- `supabase/tests/rls/` — pgTAP suites, one per table, covering all four roles.
- `.claude/skills/rls-policy-review/SKILL.md`.

## 5. Task breakdown

**B2-01 · Enable RLS everywhere and deny by default** — *Purpose:* a table with RLS
enabled and no policy denies everything, which is the correct starting point. *Files:*
`migrations/0003_rls_enable.sql`. *Acceptance:* with no policies, every table returns zero
rows to an authenticated user.

**B2-02 · `is_couple_member` helper and `partner_profile` view** — *Files:*
`migrations/0003_rls_enable.sql`. *Acceptance:* returns true for an ended membership
(BR-18); the view exposes **name only** — no email, phone, base currency or timezone.

**B2-03 · `profiles` policies** — SELECT own row plus a partner's name via the view;
INSERT via the auth trigger; UPDATE own row; **DELETE not permitted from the client**.
*Acceptance:* a partner selecting the other's `profiles` row gets the name and nothing
financial.

**B2-04 · `transactions` policies** — all four verbs scoped to `user_id = auth.uid()`.
*Acceptance:* §23.2 — a partner cannot SELECT, UPDATE or DELETE the other's transactions
(zero rows or error). **This is the single most important test in the project.**

**B2-05 · `categories` policies** — SELECT where `user_id is null` OR own; INSERT own
non-default; UPDATE own custom; **DELETE denied** (archive instead, BR-17). *Acceptance:*
a delete attempt on any category fails; a default category cannot be updated.

**B2-06 · `savings_goals` policies** — SELECT own individual plus couple goals where
`is_couple_member`; INSERT own individual, couple goal only if the couple is active;
UPDATE individual by owner, couple by creator and only while active; DELETE as update.
*Acceptance:* a stranger reading a couple goal by id gets zero rows; an ex-partner can
still read archived couple goals but cannot update them.

**B2-07 · `goal_contributions` policies** — SELECT where the goal is visible; INSERT where
the goal is visible, the couple is active for couple goals, and `user_id = auth.uid()`;
UPDATE and DELETE own rows only, and only while the goal is not archived. *Acceptance:*
§23.2 — a user cannot insert a contribution carrying another user's `user_id`; an
ex-partner cannot insert at all.

**B2-08 · `couples` and `couple_members` policies** — SELECT own couple; INSERT and UPDATE
via functions only; DELETE via `end_couple()` only. *Acceptance:* direct client writes
fail; the functions (B3) are the only path.

**B2-09 · `couple_invitations` policies** — SELECT and UPDATE (cancel) by the inviter;
INSERT by the inviter via service; DELETE denied. *Acceptance:* an invitee cannot read the
invitation row directly — they reach it only through the token endpoint, which returns
the inviter's first name only.

**B2-10 · `exchange_rates` and `currencies` policies** — SELECT for all authenticated
users; write by service role only. *Acceptance:* a user cannot insert a rate.

**B2-11 · Four-role pgTAP suite** — for **every** table, assert what owner, partner,
stranger and ex-partner can and cannot do for each of the four verbs. *Files:*
`supabase/tests/rls/*.test.sql`. *Acceptance:* **WAC-12** — the suite is exhaustive by
construction: a table added later without a matching suite fails a coverage check.

**B2-12 · `accept_invitation` rejection cases** — *Purpose:* §23.2's list, tested before
the function is even finished in B3. Wrong token, expired, invitee already coupled,
invitee identity mismatch, reuse of an accepted token. *Files:*
`supabase/tests/rls/invitations.test.sql`. *Acceptance:* all five rejected.

**B2-13 · Create the `rls-policy-review` skill** — the matrix, the 404-not-403 rule, and
the pgTAP cases any new table owes. *Files:*
`.claude/skills/rls-policy-review/SKILL.md`. *Acceptance:* referenced by every later
backend PR that touches a policy.

## 6. Tooling

pgTAP via `supabase test db`. The `security-review` skill runs on every PR in this phase.

## 7. Testing

This phase is mostly tests. The four-role matrix across ten tables and four verbs is
roughly 160 assertions, plus §23.2's five invitation rejections and the ex-partner
history cases. All block merge.

Covers **WAC-12** at the database level and satisfies **§27 item 5** ("couple privacy
guaranteed by RLS and proven by automated tests").

## 8. Exit criteria

1. RLS is enabled on every table; no table is reachable without an explicit policy.
2. The §9.5 matrix is implemented exactly, verb by verb.
3. The four-role pgTAP suite passes for every table, and a table without a suite fails a
   coverage check.
4. **No policy anywhere permits a partner to read another user's transactions, individual
   goals or profile financial fields** (§9.5's closing rule).
5. Ex-partners can read archived couple goal history but cannot insert contributions.
6. A user cannot insert a contribution with another user's `user_id`.
7. All five `accept_invitation` rejection cases fail closed.
8. `partner_profile` exposes name only.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-04 privacy regression | The whole phase is the mitigation: deny-by-default, exhaustive four-role testing, and a coverage check that catches a new table with no suite |
| A policy is correct but a **view or function** bypasses it | Views use `security_invoker`; the only `security definer` functions are `accept_invitation` and `end_couple`, both reviewed line by line in B3 |
| Performance degrades under RLS on large tables | Policies use indexed columns (`user_id`, `couple_id`); query plans reviewed in B5 against seeded volume |
| Tests assert the happy path and miss the denial | Every assertion is written as "expect zero rows" or "expect error" first, then the positive case |

## 10. Estimate

**6 days** — flagged high-uncertainty. Roughly 2 days writing policies, 3 days the pgTAP
matrix, 1 day the helper, view and skill. The test volume is the cost, and it is the right
place to spend it.

## 11. Approval gate

Owner reviews: the passing four-role report table by table; a live demonstration that a
partner session cannot read the other's transactions; and the ex-partner read-only case.
**This gate is the privacy sign-off.** Then B3 may start.
