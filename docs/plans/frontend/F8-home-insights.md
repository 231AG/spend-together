# F8 — Home dashboard and Insights

## 1. Objective

Build the two screens that answer "where do I stand?" — the Home dashboard, which must
communicate the period's financial position **without requiring a chart**, and Insights,
which explains patterns by day, week and month through charts C-01…C-07, each with a
"View as table" equivalent. Every figure on both screens comes from `packages/domain` via
the frozen contract; none is computed in a component.

## 2. Spec references

SCR-08 (Home), SCR-14 (Insights); FR-10, FR-11; §6.2 F-01…F-10; §16.1 (chart catalogue
C-01…C-07), §16.2 (rules for every chart), §16.3 (insights contract), §16.4 (analytics
events); §19.2 (Home, Insights rows); §21 (Home 12-col grid; Insights metric grid); §11.4
(totals labelled with the currency code); W-01, W-02, W-05 wireframes; AC04, AC05, AC13.

## 3. Prerequisites

F3 (MetricCard, ChartContainer, ProgressBar, GoalCard compact). F4 (`/home/summary` and
`/insights/*` handlers reproducing §6.5 and §16.3). F7 (transaction shapes and the
Activity routes that chart elements link into). F9's `GoalCard` is used in compact form
— if F9 has not run, the compact card ships here and F9 extends it.

## 4. Deliverables

- `/home?period=today|week|month` with hero card, four metrics, net cash flow line,
  spending preview, goals preview, and desktop recent activity.
- `/insights?period=daily|weekly|monthly&date=` with four metric cards carrying
  previous-period deltas, and charts C-01, C-02, C-03, C-05, C-06.
- Every chart's "View as table" toggle rendering a real `<table>`.
- Analytics events `insights_viewed` and `session_start` (§16.4).

## 5. Task breakdown

**F8-01 · Home hero card (SCR-08)** — "Remaining this [period]" as the dominant figure —
**Remaining Cash Flow (F-04), not the boards' invented $850** — with Income, Expenses,
Saved and Savings rate beneath, and net cash flow as a secondary line. *Files:*
`components/features/home/summary-hero-card.tsx`. *Acceptance:* with the reference
dataset it reads $330.00 with "Net cash flow $630.00 · after $300.00 saved" and metrics
$1,200.00 / $570.00 / $300.00 / 25.0%, exactly as W-01. The currency code appears once in
the card header (§11.4).

**F8-02 · Period selector and data loading** — Today / This week / This month, default
month, state in the URL. *Files:* `app/(app)/home/page.tsx`. *Acceptance:* **FR-10** —
switching period refreshes every card consistently; the URL is shareable and
back-button safe.

**F8-03 · Spending preview** — top five categories with amount, percentage and bar, each
linking to Activity filtered by that category **and period**. *Files:*
`components/features/home/spending-preview.tsx`. *Acceptance:* percentages come from F-09
and match Bills 26.3 / Food 24.6 / Other 18.4 / Transport 15.8 / Shopping 14.9; a tap
lands on a correctly filtered Activity URL.

**F8-04 · Goals preview and recent activity** — up to three active goals as compact goal
cards; five recent rows at ≥ 1024 px only. *Files:* `components/features/home/`.
*Acceptance:* matches W-01's desktop composition and W-02's mobile stack.

**F8-05 · Zero-income and empty states** — savings rate renders "N/A" with a one-line
explanation, never `0%`, `NaN` or `Infinity`; the first-run empty state offers "Add your
first income or expense". *Files:* across Home. *Acceptance:* **FR-10, WAC-06, AC05** —
a zero-income period produces no error in UI, and no console or network error either.

**F8-06 · Insights shell (SCR-14)** — Daily / Weekly / Monthly control plus a date
stepper (`‹ September 2026 ›`), with all state in the URL. *Files:*
`app/(app)/insights/page.tsx`. *Acceptance:* **FR-11** — changing period refreshes every
card consistently; stepping backwards past available data shows the minimum-data message
rather than an empty axis.

**F8-07 · Metric cards with previous-period comparison (C-06)** — four cards with delta
chips carrying an arrow icon **and** signed text plus "vs Aug"; "New" when the previous
period is zero (F-10). *Files:* `components/features/insights/metric-card-row.tsx`.
*Acceptance:* reproduces W-05: +8.0% / −4.2% / +20.0% / +2.5 pts. Savings rate change is
expressed in **points**, not percent. No delta relies on colour alone.

**F8-08 · C-01 category breakdown** — donut at 60% inner radius with the total in the
centre and a legend listing amount and percentage, sorted descending, top six plus an
"Other" bucket. Home shows the **list only**, per §16.1. *Files:*
`components/features/charts/category-donut.tsx`. *Acceptance:* colours come from the
`cat-*` tokens and every slice carries a text label; no pie exceeds seven slices.

**F8-09 · C-02 spending trend** — line, 2 px, dots on hover and focus, dashed average line
(F-07), y-axis from zero; last 14 days / 8 weeks / 6 months by period. *Files:*
`components/features/charts/spending-trend-chart.tsx`. *Acceptance:* the average line is
labelled "avg $33.53/day" for the reference month; data points are focusable in order and
focus reveals the tooltip.

**F8-10 · C-03 income vs expenses** — grouped vertical bars, income left, expenses right,
value labels above bars at ≥ 768 px, last three buckets on mobile and six on desktop.
*Files:* `components/features/charts/income-expense-chart.tsx`. *Acceptance:* reproduces
Jul 1,100/640 · Aug 1,111/595 · Sep 1,200/570.

**F8-11 · "View as table" for every chart** — a real `<table>` with the same data; the SVG
takes `aria-hidden="true"` while the table is shown. *Files:*
`components/ui/chart-container.tsx` (extended). *Acceptance:* **§16.2** — every chart has
a visible title, a one-line description and a working toggle; screen readers reach the
table, not SVG internals.

**F8-12 · Chart rules compliance** — no 3D, no dual axes, no animated counters, entry
animation ≤ 300 ms and disabled under reduced motion; the minimum-data message ("Your
trends appear as you record more activity") when fewer than two buckets have data.
*Files:* across charts. *Acceptance:* each rule in §16.2 has a test.

**F8-13 · Analytics events** — `insights_viewed` with the period, and daily
`session_start`. **No amounts, notes, category names or partner identity** in any event
payload (§16.4). *Files:* `lib/analytics.ts`. *Acceptance:* a test asserts the event
payload shape contains no forbidden field.

## 6. Tooling

New: `recharts` 3.10.1. The **`dataviz` skill is loaded before writing any chart code**.
Reuses `ChartContainer` from F3.

## 7. Testing

Component tests for each chart's data-to-encoding mapping and for the table toggle.
Snapshot-free assertions on rendered values, so a formatting change is caught rather than
blessed. Playwright covers period switching across both screens and a month-boundary
case. axe per chart in both chart and table modes.

Covers **FR-10, FR-11**; **WAC-05** (Home matching F-01…F-06 for all three periods),
**WAC-06** (zero income → N/A, no errors), **WAC-13** (period correctness and
previous-period comparison).

## 8. Exit criteria

1. Home reproduces W-01 and W-02 exactly with the corrected reference dataset — hero
   $330.00, never $850.
2. Home communicates the period position with **no chart required** (§16 opening rule;
   design acceptance #3).
3. All three Home periods produce figures matching F-01…F-06.
4. Zero income shows "N/A" with no error anywhere in UI, console or network.
5. Insights reproduces W-05, including deltas and the points-vs-percent distinction.
6. C-01, C-02, C-03, C-05 and C-06 are implemented and obey every rule in §16.2.
7. Every chart has a working "View as table" rendering equivalent data.
8. Category percentages sum to 100.0% and match the corrected dataset.
9. axe clean in both chart and table modes; charts keyboard navigable.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Recharts 3.x accessibility defaults are poor | The table is the accessible path by design (§16.2); SVG is `aria-hidden` when the table shows |
| A chart recomputes a total instead of reading the contract | Charts receive already-computed values from `/insights`; an import-boundary rule forbids `packages/domain` arithmetic inside chart components |
| Board percentages leak into a legend | The fixture is the only data source and carries corrected values; a test asserts the five reference percentages |
| Bundle size from Recharts threatens WAC-20 | Measured in F13; charts are dynamically imported on Insights, and Home needs none |
| Delta chips convey meaning by colour | Arrow icon plus signed text is mandated in F3-10 and asserted here |

## 10. Estimate

**7 days.** Roughly: 2 days Home, 1 day Insights shell and metric cards, 2.5 days the
five charts, 1 day table toggles, chart-rule compliance and analytics, 0.5 day states.
Medium uncertainty — chart accessibility and the table equivalents are usually
underestimated.

## 11. Approval gate

Owner reviews: Home at all three periods against W-01/W-02; the zero-income N/A state;
Insights against W-05; every chart toggled to its table; and a keyboard pass through a
chart's data points. Then F9 may start.
