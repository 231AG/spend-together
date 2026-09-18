# Traceability matrix

Every FR-, WAC- and T- identifier in the specification, mapped to the phase(s) that
implement it and the test(s) that prove it. **Updated as part of every ticket's definition
of done** — not reconstructed at the end.

Status: ☐ not started · ◐ in progress · ☑ evidenced by a passing test.

> **Verification:** T- and WAC- identifiers are tagged in their test names, so this matrix
> can be checked mechanically with `pnpm test -- --reporter=json | grep -o 'T-[0-9]*'`
> rather than by reading.

## Functional requirements (FR-01…FR-26)

| FR | Requirement (abbreviated) | Phase(s) | Test(s) | Status |
|---|---|---|---|---|
| FR-01 | Register; duplicates rejected non-revealingly | F6, B4 | `e2e/flows/7.1`, `auth.register.test.ts` (enumeration) | ☐ |
| FR-02 | Login; session persists across reloads | F6, B4 | `e2e/flows/7.2`, `auth.session.test.ts` | ☐ |
| FR-03 | Logout ends the session | F11, B4 | `auth.logout.test.ts`, `e2e/logout-clears-stores` | ☐ |
| FR-04 | Forgot/reset via email link or SMS code | F6, B4 | `e2e/flows/7.2`, `auth.reset.test.ts` | ☐ |
| FR-05 | First-run base currency + timezone | F6, B5 | `e2e/flows/7.1`, `me.patch.test.ts` | ☐ |
| FR-06 | Add income | F7, B5 | `e2e/flows/7.3`, `transactions.create.test.ts` | ☐ |
| FR-07 | Add expense; recent categories first | F7, B5 | `e2e/flows/7.3`, `categories.recent.test.ts` | ☐ |
| FR-08 | Edit/delete own transaction; summaries recalculate | F7, B5 | `e2e/flows/7.4`, `transactions.patch.test.ts` | ☐ |
| FR-09 | Activity grouped by date with filters and search | F7, B5 | `activity.filters.test.ts`, `e2e/activity` | ☐ |
| FR-10 | Home for today/week/month with six metrics | F8, B5 | `home.summary.test.ts`, `e2e/home-periods` | ☐ |
| FR-11 | Insights daily/weekly/monthly with comparison | F8, B5 | `insights.test.ts`, `e2e/insights-periods` | ☐ |
| FR-12 | Create individual goal | F9, B5 | `e2e/flows/7.5`, `goals.create.test.ts` | ☐ |
| FR-13 | Couple goal only with an active couple | F9, B5 | `e2e/flows/7.6`, `goals.couple-required.test.ts` | ☐ |
| FR-14 | Add contribution in any currency | F9, B5 | `e2e/flows/7.7`, `contributions.create.test.ts` | ☐ |
| FR-15 | Edit/delete own contributions | F9, B5 | `contributions.mutate.test.ts` | ☐ |
| FR-16 | Goal details: pace, status, projection, breakdown | F9, B5 | `goal-detail.test.ts`, `domain/goal.test.ts` | ☐ |
| FR-17 | Goal auto-completes at target | F9, B3 | `goal-completion.test.ts`, pgTAP `sync_goal_completion` | ☐ |
| FR-18 | Edit goal name/target/date; delete | F9, B5 | `goals.patch.test.ts` | ☐ |
| FR-19 | Invite partner; cancel and resend | F10, B5, B7 | `e2e/flows/7.8`, `couple.invite.test.ts` | ☐ |
| FR-20 | Couple screen: three states, no private data | F10, B2, B5 | `couple-privacy.test.ts`, pgTAP RLS suite | ☐ |
| FR-21 | End couple with consequences | F10, B3, B5 | `e2e/flows/7.9`, pgTAP `end_couple` | ☐ |
| FR-22 | Profile and settings | F11, B5 | `profile.test.ts`, `me.test.ts` | ☐ |
| FR-23 | Manage custom categories | F11, B5 | `categories.crud.test.ts` (archive-not-delete) | ☐ |
| FR-24 | Enter any currency; show converted value first | F7, B6 | `conversion-preview.test.ts` (preview == stored) | ☐ |
| FR-25 | Offline queue with sync indicator | F12 | `e2e/offline.spec.ts`, `offline-queue.test.ts` | ☐ |
| FR-26 | Email notifications with preferences | B7 | `notifications.test.ts` (send/suppress matrix) | ☐ |

## Web acceptance criteria (WAC-01…WAC-20)

| WAC | Criterion (abbreviated) | Phase(s) | Test(s) | Status |
|---|---|---|---|---|
| WAC-01 | Register → currency → Home < 90 s; no disclosure | F6, B4, B8 | `e2e/flows/7.1` (timed) | ☐ |
| WAC-02 | Sessions survive reload/restart; logout clears all | F6, F11, B4, B8 | `e2e/session-persistence` | ☐ |
| WAC-03 | Income CRUD updates all affected periods | F7, F8, B5 | `e2e/income-updates-totals` | ☐ |
| WAC-04 | Same for expenses incl. category totals and % | F7, F8, B5 | `e2e/expense-updates-totals` | ☐ |
| WAC-05 | Home matches F-01…F-06 for all three periods | F2, F8, B3, B5 | `domain/summary.test.ts`, `e2e/home-periods` | ☐ |
| WAC-06 | Zero income → "N/A", no errors anywhere | F2, F8, B5 | `domain/summary.test.ts` **T-02**, `e2e/zero-income` | ☐ |
| WAC-07 | Individual goals with inline validation | F9, B5 | `e2e/flows/7.5`, `goals.validation.test.ts` | ☐ |
| WAC-08 | Couple goals gated; 409 COUPLE_REQUIRED | F9, B5 | `goals.couple-required.test.ts` | ☐ |
| WAC-09 | Balance always equals sum of contributions | F2, B3, B5 | `domain/goal.test.ts`, pgTAP `goal_balances` | ☐ |
| WAC-10 | Progress/remaining/pace/status/projection match F-11…F-20 | F2, F9, B5 | `domain/goal.test.ts` **T-04…T-10** | ☐ |
| WAC-11 | Completion immediate and reversible | F9, B3 | `goal-completion.test.ts`, pgTAP trigger (both directions) | ☐ |
| WAC-12 | Couple contributions visible with names; nothing else | F10, B2, B8 | `couple-privacy.test.ts`, pgTAP four-role suite, `e2e/couple-two-user` | ☐ |
| WAC-13 | Insights correct across timezone and month boundaries | F2, F8, B3 | `domain/period.test.ts` **T-13, T-14**, pgTAP `spending_series` | ☐ |
| WAC-14 | Non-base entry stored with original; preview == saved | F7, B6 | `conversion-preview.test.ts`, `domain/fx.test.ts` **T-11** | ☐ |
| WAC-15 | Base-currency change re-expresses, preserves originals | F11, B6 | `e2e/flows/7.10`, `recalc.test.ts` | ☐ |
| WAC-16 | Core flows on 4 desktop browsers + mobile viewports | F13, B11 | Playwright project matrix | ☐ |
| WAC-17 | Offline expense syncs once, no duplicate | F12, B8 | `e2e/offline.spec.ts` | ☐ |
| WAC-18 | Loading/empty/error states on every primary screen | F3–F11, F13 | `e2e/a11y.spec.ts` state sweep | ☐ |
| WAC-19 | No serious/critical axe violations; manual SR pass | F3, F13 | `e2e/a11y.spec.ts`, `screen-reader-report.md` | ☐ |
| WAC-20 | LCP ≤ 2.5 s; JS ≤ 180 kB; API p95 ≤ 800 ms | F13 (client), B9 (API) | Lighthouse CI, `load/dashboard.k6.js` | ☐ |

## Domain test cases (T-01…T-16)

All sixteen are implemented in **F2** (`packages/domain`) under the 100% coverage gate, and
re-verified at the API layer where noted.

| T | Case | Phase | Test | Status |
|---|---|---|---|---|
| T-01 | Totals 1,200 / 570 / 300 → net 630, remaining 330, rate 25.0% | F2 | `domain/summary.test.ts` | ☐ |
| T-02 | Zero income → rate N/A, remaining −50, no exception | F2 | `domain/summary.test.ts` | ☐ |
| T-03 | Contribution leaves expenses unchanged, saved +100 | F2, B3 | `domain/summary.test.ts`, pgTAP `period_summary` | ☐ |
| T-04 | Target 1,200, balance 600 → 50%, remaining 600 | F2 | `domain/goal.test.ts` | ☐ |
| T-05 | Balance 1,300 on 1,200 → 100%, remaining 0, COMPLETED | F2 | `domain/goal.test.ts` | ☐ |
| T-06 | Target date today, remaining 60 → 60/day, no ÷0 | F2 | `domain/goal.test.ts` | ☐ |
| T-07 | Target date yesterday, incomplete → BEHIND, overdue | F2 | `domain/goal.test.ts` | ☐ |
| T-08 | Couple goal A 480 / B 320 on 2,000 → 60% / 40% | F2 | `domain/goal.test.ts` | ☐ |
| T-09 | Thresholds 0.95 / 0.9499 / 0.75 / 0.7499 | F2 | `domain/goal.test.ts` | ☐ |
| T-10 | New goal, zero contributions, day 0 → ON_TRACK | F2 | `domain/goal.test.ts` | ☐ |
| T-11 | 5,000 LRD @ 189.39 → $26.40 (half away from zero) | F2, B6 | `domain/fx.test.ts`, API integration | ☐ |
| T-12 | JPY exponent 0, KWD exponent 3 | F2, B1, B6 | `domain/money.test.ts`, seed test | ☐ |
| T-13 | 23:30 31 Aug: Monrovia vs Tokyo → correct local month | F2, B3 | `domain/period.test.ts`, pgTAP `spending_series` | ☐ |
| T-14 | Week boundaries → ISO Monday start | F2, B3 | `domain/period.test.ts`, pgTAP | ☐ |
| T-15 | Avg daily: day 17 of current vs full previous month | F2 | `domain/summary.test.ts` | ☐ |
| T-16 | Previous period = 0 → "New" | F2 | `domain/summary.test.ts` | ☐ |

## Business rules (BR-01…BR-18) — where each is enforced

Not required by the brief, but BR violations are the failure mode the spec cares most
about, so they are tracked too.

| BR | Rule | Enforced in |
|---|---|---|
| BR-01 | Transactions owned by exactly one user | B1 schema, B2 RLS |
| BR-02 | Contributions never appear in expense analytics | F2 `summary.ts`, B3 `category_breakdown` |
| BR-03 | Individual goal has no couple reference | B1 check constraint |
| BR-04 | Couple goal: either member contributes, contributor retained | B1 schema, B2 RLS |
| BR-05 | **Privacy rule** | B2 RLS (primary), F4 mock, F1 contract shape, B5 guard |
| BR-06 | One active or pending couple per user | B1 unique index; invitee half — see Q6 |
| BR-07 | All amounts positive; direction from type | B1 check, F1 schema, F3 AmountInput |
| BR-08 | Balances derived, never stored | B1 (no column), B3 `goal_balances` |
| BR-09 | Dates not in the future | F1 schema, F3 DatePicker, B5 validation |
| BR-10 | Goal target date ≥ today, amount > 0 | F1 schema, F9 validation, B1 check |
| BR-11 | Auto-complete and reverse | B3 trigger, F9 UI, F4 mock |
| BR-12 | One base currency per user | B1 schema, B6 recalculation |
| BR-13 | Original amount and currency preserved | B1 schema, B6 conversion |
| BR-14 | Rate locking at the record's date | F2 `fx.ts`, B6 conversion |
| BR-15 | Goal currency immutable | F1 schema (no field), B5 rejection, F9 no control |
| BR-16 | Periods in the user's IANA timezone | F2 `period.ts`, B3 `spending_series` |
| BR-17 | Default categories immutable; custom archived | B1 check, B2 RLS (no delete), F11 UI |
| BR-18 | Couple end: read-only, history preserved | B3 `end_couple`, B2 RLS, F10 UI |

## Unplaced identifiers

**None.** Every FR-, WAC-, T- and BR- identifier in the specification is mapped above to at
least one phase and one test. If a future session finds one that is not, add it here with
a note rather than quietly omitting it.
