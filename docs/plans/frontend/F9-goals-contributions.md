# F9 — Goals and contributions

## 1. Objective

Build the goal lifecycle: creating individual and couple goals, funding them with
contributions in any currency, and making progress and required effort obvious — pace,
status, projection and, for couple goals, who contributed what. This is the screen set
where the domain package's harder formulas become visible to users, and where the
completion celebration lives.

## 2. Spec references

SCR-15 (Goals), SCR-16 (create/edit goal), SCR-17 (goal details), SCR-18 (add
contribution); §7.5, §7.6, §7.7 (flows); FR-12…FR-18; §6.3 F-11…F-21, §6.4 status;
§16.1 C-04 (goal progress) and C-07 (contributor breakdown); §19.2 (Goals, Goal details
rows); §21 (goal grids and sticky action bar); BR-03, BR-04, BR-08, BR-10, BR-11, BR-15,
BR-18; W-06 wireframe; AC06…AC10.

## 3. Prerequisites

F3 (GoalCard, ProgressBar, StatusChip, AmountInput). F4 (goal and contribution handlers
enforcing `409 COUPLE_REQUIRED`, `409 GOAL_ARCHIVED` and completion reversal). F2 (all
goal formulas). F5 (routes).

## 4. Deliverables

- `/goals?tab=mine|ours` with goal cards and a collapsed Completed section.
- `/goals/new?type=individual|couple` and `/goals/[id]/edit`.
- `/goals/[id]` with hero, pace, status, projection, contributor breakdown and history.
- `/goals/[id]/contribute` with the "After this" preview and the completion celebration.

## 5. Task breakdown

**F9-01 · Goals list (SCR-15)** — My goals / Our goals segment; cards showing icon, name,
saved-of-target, progress bar, percentage, target date and a status chip with icon **and**
text; Completed goals in a collapsed section. *Files:* `app/(app)/goals/page.tsx`.
*Acceptance:* reproduces W-06 — New Laptop 50% On track, Vacation 40% At risk, Emergency
fund 25% Behind; one-column at mobile, two at tablet, three at desktop (§21).

**F9-02 · Our Goals empty states** — no partner → empty state plus Connect partner;
partner but no goals → Create shared goal. *Files:* `components/features/goals/`.
*Acceptance:* **FR-13** — both states render and route correctly.

**F9-03 · Create goal (SCR-16)** — type (Individual default; Couple **disabled with an
explanation** when there is no active couple), name, icon picker, target amount with
currency, target date. *Files:* `app/(app)/goals/new/page.tsx`. *Acceptance:* **FR-12,
FR-13, WAC-07, WAC-08** — target > 0 and date ≥ today validated inline with Create
disabled (BR-10); the disabled couple option shows "Connect a partner to create shared
goals" with a Connect Partner link; attempting a couple goal via the API without a couple
yields `409 COUPLE_REQUIRED`.

**F9-04 · Edit and delete goal** — name, target amount, target date and icon are editable;
**currency is not** (BR-15). Delete confirms, explaining that contributions go with it.
*Files:* `app/(app)/goals/[id]/edit/page.tsx`. *Acceptance:* **FR-18** — no currency
control appears in edit; a couple goal's delete is offered only to its creator.

**F9-05 · Goal details hero (SCR-17)** — name, saved, target, progress bar and
percentage; remaining. *Files:* `app/(app)/goals/[id]/page.tsx`. *Acceptance:*
reproduces W-06: "$600.00 of $1,200", "50% · $600 to go · 105 days left".

**F9-06 · Pace, status and projection cards** — required pace per day/week/month (F-15…
F-17 via ADR-004), a status card in **plain language**, and the projection from F-20.
*Files:* `components/features/goals/pace-card.tsx`, `status-card.tsx`. *Acceptance:*
**FR-16, WAC-10** — renders "Save $40.00/week to finish by 31 Dec. At your pace: done ~5
Dec."; an overdue goal shows "Overdue" with no number (F-15); a goal with no recent
contributions shows "No recent contributions" rather than a projected date.

**F9-07 · Contributor breakdown (C-07)** — couple goals only: a stacked single bar plus
text "You $480 (60%) · Sam $320 (40%)" from F-21. *Files:*
`components/features/goals/contributor-breakdown.tsx`. *Acceptance:* **WAC-12** — both
partners' contributions are visible **with contributor names**, and nothing else about
the partner appears.

**F9-08 · Contribution history** — dated list in goal currency, showing the original
currency where it differs. *Files:* `components/features/goals/contribution-list.tsx`.
*Acceptance:* matches W-06's list; a foreign-currency contribution shows both amounts.

**F9-09 · Add contribution (SCR-18)** — goal context, amount with currency defaulting to
the **goal's** currency, conversion preview, date, note, and an "After this: $650 saved ·
54%" preview. *Files:* `app/(app)/goals/[id]/contribute/page.tsx`. *Acceptance:*
**FR-14** — the "After this" preview matches the post-save state exactly; a
foreign-currency contribution previews "≈ €X in goal currency".

**F9-10 · Edit and delete contributions** — FR-15's correction path, with balances and
status recomputed. *Files:* `hooks/use-contribution-mutations.ts`. *Acceptance:*
**FR-15, WAC-09, WAC-11** — the balance always equals the sum of contributions after any
create, edit or delete, and removing a contribution from a completed goal **returns it to
an active status**.

**F9-11 · Completion celebration** — restrained confetti ≤ 1.2 s using the
`dur-celebrate` token, fully disabled under `prefers-reduced-motion`, status switching to
Completed, haptic where supported. *Files:*
`components/features/goals/completion-celebration.tsx`. *Acceptance:* **FR-17, WAC-11** —
completion is automatic at balance ≥ target; the celebration can be skipped and never
blocks interaction.

**F9-12 · Archived (couple ended) state** — banner, no Add contribution button, history
still readable (BR-18). *Files:* across goal screens. *Acceptance:* a contribution
attempt against an archived goal surfaces `409 GOAL_ARCHIVED` as plain-language copy.

**F9-13 · States** — loading (3 skeleton cards; hero skeleton), zero-contribution goal
detail ($0 saved, remaining, required pace, Add contribution), error, offline. *Files:*
across. *Acceptance:* every §19.2 Goals and Goal-details state renders.

## 6. Tooling

No new packages. C-04 and C-07 use F3's `ProgressBar` and Recharts from F8. The
`dataviz` skill applies to C-07.

## 7. Testing

Component tests for pace and status rendering across all four statuses, the "After this"
preview equalling post-save state, and the currency-immutability of edit. Playwright
covers **flows 7.5, 7.6 and 7.7** (create individual goal, create couple goal, add
contribution to completion). A specific test that deleting a contribution un-completes a
goal — BR-11's reversal, which is easy to implement in one direction only.

Covers **FR-12…FR-18**; **WAC-07, WAC-08, WAC-09, WAC-10, WAC-11**, and the goal half of
**WAC-12**.

## 8. Exit criteria

1. Individual and couple goals can be created, edited and deleted with correct validation
   (BR-10) and currency immutability (BR-15).
2. Without an active couple the Couple option is disabled with an explanation, and the
   API returns `409 COUPLE_REQUIRED`.
3. Goal details reproduce W-06 including pace, status and projection.
4. All four statuses render with icon **and** text; none relies on colour.
5. Balance always equals the sum of contributions after any mutation, and completion
   reverses correctly.
6. The "After this" preview matches the post-save state.
7. The celebration respects reduced motion and can be skipped.
8. Archived couple goals are read-only with history intact.
9. Playwright flows 7.5–7.7 pass; axe clean across all states.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Completion reversal implemented one-way | Explicit test for un-completing; the mock enforces it too (F4-01) |
| Pace copy is confusing in edge cases (overdue, day-one, completed) | Plain-language status card with a string per status, reviewed as microcopy in `ux-ui-specification.md` |
| Celebration fires on a re-render or on a page revisit | Fires on the transition into completion, keyed by contribution id; tested with a revisit |
| Contributor breakdown leaks partner data beyond name and amount | The contract has no field for anything else (F1-06), and F4-07's privacy sweep asserts it |
| Goal currency accidentally editable | No control is rendered, and the PATCH schema rejects the field |

## 10. Estimate

**6 days.** Roughly: 1.5 days list and create/edit, 2 days goal details with pace, status,
projection and breakdown, 1.5 days contributions including edit/delete and the "After
this" preview, 0.5 day celebration, 0.5 day states and E2E. Low uncertainty — the
formulas are already proven in F2.

## 11. Approval gate

Owner reviews: creating a goal and contributing to completion; the celebration with
reduced motion on and off; deleting a contribution and watching the goal un-complete; the
disabled couple option; and an archived couple goal. Then F10 may start.
