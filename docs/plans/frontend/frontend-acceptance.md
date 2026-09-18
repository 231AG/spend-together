# Frontend acceptance checklist

The frontend is complete when every box below is ticked with linked evidence, or
explicitly deferred with a reason and an owning backend phase. Completed in F13 and
reviewed at that phase's approval gate.

Status key: ☐ not started · ◐ in progress · ☑ passed · ⊘ deferred (reason + owner phase).

## 1. Screens and states

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 1.1 | All 22 screens (SCR-01…SCR-22) implemented | Storybook + route walk | ☐ |
| 1.2 | Every §19.2 loading state renders, after the 150 ms delay, matching final layout | axe/visual run | ☐ |
| 1.3 | Every §19.2 empty state answers what's missing, why it matters, what to do next | Screenshot set | ☐ |
| 1.4 | Every §19.2 error state uses plain language, preserves input, offers Retry | Scenario switcher walk | ☐ |
| 1.5 | Every §19.2 offline state renders correctly | `e2e/offline.spec.ts` | ☐ |
| 1.6 | Foreign-currency state renders on every money-bearing screen | Fixture scenario | ☐ |
| 1.7 | Couple and non-couple states render everywhere they differ | Scenario switcher | ☐ |
| 1.8 | Partial-data state: a failed card shows its own error; others render | Insights per-card test | ☐ |
| 1.9 | Recalculating state shows the banner and keeps previous values | `flow 7.10` | ☐ |

## 2. Contract and data integrity

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 2.1 | Every endpoint in `api-contract.md` has an MSW handler; all responses parse | `mocks/contract.test.ts` | ☐ |
| 2.2 | No component or hook computes money — all arithmetic in `packages/domain` | Import-boundary lint | ☐ |
| 2.3 | `packages/domain` at **100% line and branch** coverage | Coverage report | ☐ |
| 2.4 | **T-01…T-16** all pass, individually tagged | Test report | ☐ |
| 2.5 | §6.5 worked example reproduces end to end | `reference-dataset.test.ts` | ☐ |
| 2.6 | §10.5 goal-detail payload reproduces exactly (ADR-004) | Schema fixture test | ☐ |
| 2.7 | §16.3 insights payload reproduces exactly | Schema fixture test | ☐ |
| 2.8 | No value anywhere traces to the design boards | Fixture review + grep for `850` | ☐ |

## 3. Functional requirements (frontend-observable)

| # | Criterion | FR | Status |
|---|---|---|---|
| 3.1 | Register with name, email or phone, password; duplicates rejected without disclosure | FR-01 | ☐ |
| 3.2 | Login; session persists across reload | FR-02 | ☐ |
| 3.3 | Logout clears cookies, query cache and offline stores | FR-03 | ☐ |
| 3.4 | Forgot/reset password with identical confirmation either way | FR-04 | ☐ |
| 3.5 | First-run currency and timezone setup, locale pre-selected | FR-05 | ☐ |
| 3.6 | Add income | FR-06 | ☐ |
| 3.7 | Add expense with recent categories first | FR-07 | ☐ |
| 3.8 | Edit and delete transactions; all affected summaries recalculate | FR-08 | ☐ |
| 3.9 | Activity grouped by date with all filters and text search | FR-09 | ☐ |
| 3.10 | Home for Today / This week / This month with all six metrics | FR-10 | ☐ |
| 3.11 | Insights daily / weekly / monthly with previous-period comparison | FR-11 | ☐ |
| 3.12 | Create individual goal | FR-12 | ☐ |
| 3.13 | Couple goal only with an active couple; otherwise disabled with explanation | FR-13 | ☐ |
| 3.14 | Add contribution in any currency | FR-14 | ☐ |
| 3.15 | Edit and delete own contributions | FR-15 | ☐ |
| 3.16 | Goal details: pace, status, projection, contributor breakdown, history | FR-16 | ☐ |
| 3.17 | Goal auto-completes at target and reverses on removal | FR-17 | ☐ |
| 3.18 | Edit goal name, target, date; delete with confirmation | FR-18 | ☐ |
| 3.19 | Invite partner; cancel and resend | FR-19 | ☐ |
| 3.20 | Couple screen shows all three states, never private data | FR-20 | ☐ |
| 3.21 | End couple with consequences and typed confirmation | FR-21 | ☐ |
| 3.22 | Profile and settings complete | FR-22 | ☐ |
| 3.23 | Custom categories: create, rename, re-icon, archive | FR-23 | ☐ |
| 3.24 | Enter in any currency; converted value shown before saving | FR-24 | ☐ |
| 3.25 | Offline queue with "Sync pending" indicator | FR-25 | ☐ |
| 3.26 | Notification preferences (the two optional emails) | FR-26 | ☐ |

## 4. Web acceptance criteria — frontend portions

| WAC | Criterion | Note | Status |
|---|---|---|---|
| WAC-01 | Register → verify → currency → Home in under 90 s; duplicates non-revealing | Timed E2E | ☐ |
| WAC-02 | Sessions survive reload; logout clears everything | Real sessions complete in B8 | ☐ |
| WAC-03 | Income create/edit/delete updates all affected periods, no manual refresh | | ☐ |
| WAC-04 | Same for expenses, including category totals and percentages | | ☐ |
| WAC-05 | Home matches F-01…F-06 for all three periods | | ☐ |
| WAC-06 | Zero income → "N/A", no errors in UI, API or console | | ☐ |
| WAC-07 | Individual goals created with inline validation | | ☐ |
| WAC-08 | Couple goals gated; API returns 409 COUPLE_REQUIRED | | ☐ |
| WAC-09 | Goal balance always equals the sum of contributions | | ☐ |
| WAC-10 | Progress, remaining, pace, status, projection match F-11…F-20 | | ☐ |
| WAC-11 | Completion is immediate and reverses on removal | | ☐ |
| WAC-12 | Both partners see couple contributions with names; nothing else | RLS half in B2 | ☐ |
| WAC-13 | Period correctness across timezone and month boundaries | | ☐ |
| WAC-14 | Non-base entry stored with original; preview matches saved value | | ☐ |
| WAC-15 | Base-currency change re-expresses totals, preserves originals | | ☐ |
| WAC-16 | Core flows pass on Chrome, Safari, Firefox, Edge + mobile viewports | | ☐ |
| WAC-17 | Offline expense syncs once online with no duplicate | | ☐ |
| WAC-18 | Every primary screen has loading, empty and error states per §19.2 | | ☐ |
| WAC-19 | No serious/critical axe violations; manual screen-reader pass done | | ☐ |
| WAC-20 | LCP ≤ 2.5 s mobile; first-load JS ≤ 180 kB gzip on `/home` | API p95 half in B9 | ☐ |

## 5. Accessibility (WCAG 2.2 AA)

| # | Criterion | Status |
|---|---|---|
| 5.1 | Zero serious/critical axe violations across every screen **and state** | ☐ |
| 5.2 | Manual pass: NVDA + Firefox, VoiceOver + Safari (macOS and iOS), TalkBack + Chrome | ☐ |
| 5.3 | Every screen fully keyboard operable; focus visible; no traps | ☐ |
| 5.4 | Focus trapped in overlays and returned to the trigger on close | ☐ |
| 5.5 | Money announced naturally per §8 of the UX spec | ☐ |
| 5.6 | Meaning never carried by colour alone — sign, icon and label everywhere | ☐ |
| 5.7 | Targets ≥ 44 × 44 px on touch, ≥ 24 × 24 px minimum | ☐ |
| 5.8 | 200% zoom and 320 px width without clipping or horizontal scroll | ☐ |
| 5.9 | Forms: visible labels, `aria-describedby`, submit summary, autocomplete | ☐ |
| 5.10 | `prefers-reduced-motion` respected everywhere; celebration skippable | ☐ |
| 5.11 | Charts expose data tables; SVG `aria-hidden` when the table is shown | ☐ |

## 6. Responsive

| # | Criterion | Status |
|---|---|---|
| 6.1 | 320 px: no horizontal scroll on any screen | ☐ |
| 6.2 | 360 / 768 / 1024 / 1440 layouts match §21 | ☐ |
| 6.3 | Continuous between breakpoints — no dead zones | ☐ |
| 6.4 | Safe-area insets respected for tab bar, FAB and sticky bars | ☐ |
| 6.5 | `100dvh` sheets keep Save visible with the keyboard open | ☐ |
| 6.6 | No hover-only affordances | ☐ |

## 7. Design system fidelity

| # | Criterion | Status |
|---|---|---|
| 7.1 | Every §18 token exists under the spec's own name | ☐ |
| 7.2 | No hard-coded colour, size, radius, duration or z-index — lint-verified | ☐ |
| 7.3 | Contrast ratios match §17.1's published values | ☐ |
| 7.4 | Plus Jakarta Sans headings, Inter body/UI/numbers, tabular figures, no CLS | ☐ |
| 7.5 | All 23 components of §14.3 exist with every variant and state | ☐ |
| 7.6 | Illustrations follow §18.2's direction | ☐ |

## 8. Flows (Playwright, against MSW)

| Flow | Description | Status |
|---|---|---|
| 7.1 | First launch, registration and setup | ☐ |
| 7.2 | Login and password reset | ☐ |
| 7.3 | Add income / add expense (incl. foreign currency) | ☐ |
| 7.4 | Edit or delete a transaction (incl. Undo) | ☐ |
| 7.5 | Create individual goal | ☐ |
| 7.6 | Create couple goal | ☐ |
| 7.7 | Add goal contribution (to completion) | ☐ |
| 7.8 | Invite and connect partner (two contexts) | ☐ |
| 7.9 | End couple | ☐ |
| 7.10 | Change base currency | ☐ |
| — | Offline sync, no duplicates | ☐ |
| — | Two-user couple privacy scenario | ☐ |

## 9. Handover to the backend

| # | Criterion | Status |
|---|---|---|
| 9.1 | Contract frozen; every change since F1 has an ADR | ☐ |
| 9.2 | Fixtures in `mocks/fixtures/` documented as the shared contract-test basis | ☐ |
| 9.3 | App builds and runs with `NEXT_PUBLIC_API_MODE=live` | ☐ |
| 9.4 | `traceability-matrix.md` has no unevidenced frontend row | ☐ |
| 9.5 | Open questions that block backend work are answered (Q4, Q5 especially) | ☐ |
| 9.6 | `docs/plans/README.md` status table updated | ☐ |

---

**Sign-off.** Owner: ____________ Date: ____________

Approving this checklist declares the frontend complete and opens the backend plan at B0.
