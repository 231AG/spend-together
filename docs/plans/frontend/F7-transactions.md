# F7 — Transactions

## 1. Objective

Deliver the product's most-used path: adding income and expenses in any currency with a
live conversion preview, finding them again in a filterable searchable Activity list, and
editing or deleting them with a working Undo. This is where "under 10 seconds for a
returning user" is won or lost, and where multi-currency first becomes visible.

## 2. Spec references

SCR-09 (Add sheet), SCR-10 (add income), SCR-11 (add expense), SCR-12 (Activity), SCR-13
(transaction details/edit/delete); §7.3 (add), §7.4 (edit/delete); FR-06, FR-07, FR-08,
FR-09, FR-24; §11.2 and §11.4 (conversion and display); §19.2 (Activity, Forms rows);
§21 (Activity split view); BR-07, BR-09, BR-13, BR-14, BR-17; W-03, W-04 wireframes.
ADR-003 (restore), ADR-005 (amount too small).

## 3. Prerequisites

F3 (AmountInput, pickers, TransactionRow, Toast, ConfirmationDialog), F4 (transaction
handlers with idempotency, conversion, restore), F5 (Add sheet, intercepted routes).

## 4. Deliverables

- Add income and Add expense forms, as dialog (desktop) and full-height sheet (mobile).
- Activity list with filters, search, date grouping and infinite scroll.
- Transaction details with edit and delete, as a split panel at ≥ 1024 px and a pushed
  page below.
- Undo via `POST /transactions/:id/restore`.
- Optimistic updates with rollback on failure.

## 5. Task breakdown

**F7-01 · Add expense form (SCR-11)** — amount dominant and autofocused, currency chip
defaulting to base, category picker with the last five used first, date defaulting to
today, optional 280-character note, Save. *Files:*
`components/features/transactions/transaction-form.tsx`. *Acceptance:* **FR-07** — Save
is disabled until amount > 0 and a category is chosen; recent categories appear first; no
celebratory motion (§13 SCR-11).

**F7-02 · Add income form (SCR-10)** — structurally identical for muscle memory. *Files:*
same component, `type` prop. *Acceptance:* **FR-06** — identical layout and control
order; toast reads "Income added".

**F7-03 · Conversion preview** — the live `≈ $X.XX in USD at today's rate` line whenever
the entry currency differs from base, using the **stored rate for the chosen date**
(BR-14), not today's, when the date is back-dated. *Files:* `amount-input.tsx`,
`use-conversion-preview.ts`. *Acceptance:* **FR-24, WAC-14** — the previewed value equals
the value returned by the mock on save; changing the date changes the preview; ADR-005's
too-small message appears before Save, not after.

**F7-04 · Optimistic create with rollback** — *Purpose:* §7.3's "optimistic updates
applied immediately and rolled back on failure". Idempotency key generated client-side;
affected `summary`, `insights` and `activity` query keys invalidated. *Files:*
`hooks/use-create-transaction.ts`. *Acceptance:* the row and totals appear instantly; a
forced server error rolls them back **and keeps the form open with values preserved plus
Retry** (§7.3).

**F7-05 · Activity list (SCR-12)** — date-grouped sections; rows showing category icon,
title, note and signed amount with type icon; non-base rows carrying the `≈ base` line;
infinite scroll at 50 per page. *Files:* `app/(app)/activity/page.tsx`. *Acceptance:*
**FR-09** — signed amounts use the correct prefix and the U+2212 minus for expenses
(§17.2); a screen reader announces the full row as one accessible name.

**F7-06 · Filters and search** — chips for All / Income / Expense / Savings contributions
/ Category / Date range, plus text search on note and category. All state in the URL.
*Files:* `components/features/activity/filters.tsx`. *Acceptance:* **FR-09** — filters
survive reload and Back; an empty filtered result offers Clear filters; `/` focuses
search (F5-07).

**F7-07 · Transaction details (SCR-13)** — type and amount with the original value, the
converted value, **the rate and the date used**, category, date, note, Edit, Delete.
Split panel at ≥ 1024 px, pushed page below. *Files:*
`app/(app)/activity/[id]/page.tsx`. *Acceptance:* matches W-04 — "L$ 5,000.00 LRD ≈
$26.40 USD (rate 1 USD = 189.39 LRD, 17 Sep)"; the `fx_estimated` info affordance appears
when applicable.

**F7-08 · Edit** — the Add form prefilled; re-conversion when amount, currency or date
change. *Files:* `app/(app)/activity/[id]/edit/page.tsx`. *Acceptance:* **FR-08** —
editing an amount updates every affected period's totals without a manual refresh.

**F7-09 · Delete with Undo** — confirmation dialog stating that totals and insights will
be recalculated; then a 5-second toast with a keyboard-reachable Undo calling
`POST /transactions/:id/restore`. *Files:* `hooks/use-delete-transaction.ts`.
*Acceptance:* **FR-08, §7.4** — Undo restores the row and the totals; the toast pauses on
hover and focus; Undo is reachable by keyboard within its lifetime; a double-tap on Undo
is harmless (idempotent).

**F7-10 · States** — Activity loading (8 skeleton rows), empty ("Nothing recorded yet" +
Add), filtered-empty ("No activity matches these filters" + Clear filters), error (Retry,
previous results kept), offline (cached list). Form states per §19.2. *Files:* across the
above. *Acceptance:* every §19.2 Activity and Forms state renders via the scenario
switcher.

## 6. Tooling

No new packages. `money-handling` skill applies to every ticket here.

## 7. Testing

Component tests: form validation, Save-disabled logic, conversion preview matching the
saved value, filter-to-URL round trips. Playwright covers **flow 7.3** (add income and
expense, including a foreign-currency entry) and **flow 7.4** (edit, delete, Undo). A
specific regression test that the previewed conversion equals the stored conversion —
the single most user-visible way multi-currency can betray trust.

Covers **FR-06, FR-07, FR-08, FR-09, FR-24**; **WAC-03** and **WAC-04** (create/edit/
delete updating all affected periods) and **WAC-14** (preview matches saved value).

## 8. Exit criteria

1. Add income and add expense work as dialog and sheet, with correct focus, Esc and
   back-button behaviour.
2. The conversion preview equals the saved converted value in every tested case,
   including a back-dated entry.
3. A too-small conversion is caught before Save with ADR-005's message.
4. Activity filters and search live in the URL and survive reload and Back.
5. Infinite scroll loads 50 at a time and is keyboard reachable.
6. Delete → Undo restores both the row and the totals, within 5 seconds, by keyboard.
7. A failed save preserves user input and offers Retry.
8. Playwright flows 7.3 and 7.4 pass; axe clean on all screens and states.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Preview and saved value diverge (rate date, rounding) | Both call `packages/domain`; an explicit equality test; the mock uses the record-date rate (BR-14) |
| Optimistic rollback leaves totals wrong | Rollback restores the prior cache snapshot rather than recomputing; tested with a forced failure |
| Undo lost if the toast is dismissed early or the tab closes | ADR-003's server-side restore means the window is server-tracked (`undo_until`), not purely client-side |
| Infinite scroll breaks keyboard and screen-reader flow | A "Load more" button is rendered for keyboard users alongside the scroll sentinel |
| Q1 rejected, removing the restore endpoint | Fallback documented in open-questions; costs ~0.5 d here |

## 10. Estimate

**7 days.** Roughly: 2 days the shared form plus income/expense variants, 1 day
conversion preview and optimistic mutation, 2 days Activity list with filters, search and
infinite scroll, 1 day details/edit/delete with Undo, 1 day states and the two E2E flows.
Medium uncertainty.

## 11. Approval gate

Owner reviews: adding an expense in LRD with a USD base and confirming preview equals
saved value; filtering and searching Activity with the URL visible; deleting and undoing;
and the transaction detail showing rate and date. Then F8 may start.
