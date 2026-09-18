# F3 — Design system

## 1. Objective

Turn spec §17–18 into a working, enforced design system: every colour, size, radius,
duration and z-index as a CSS custom property mapped into Tailwind; both typefaces
self-hosted through `next/font`; and the full shared component catalogue from §14.3 —
23 components — built on Radix primitives with every variant and every state from §19.2,
each reviewable in isolation in Storybook and each passing axe. From this phase onward no
screen hard-codes a visual value, and accessibility is checked per component rather than
per release.

## 2. Spec references

§17.1 (palette and contrast), §17.2 (financial meaning), §17.3 (categorical colours),
§17.4 (typography), §18 (all token groups), §18.1 (CSS variables and Tailwind mapping),
§18.2 (component rules), §14.3 (shared component catalogue), §19.1–19.2 (states), §20
(accessibility), §11.4 (money display rules), §21 (responsive breakpoints).
ADR-007 (Storybook).

## 3. Prerequisites

F0 complete. F2 complete — `format-money` and every money-rendering component call the
domain package rather than reimplementing formatting. (F1 is not strictly required, but
in practice runs first.)

## 4. Deliverables

- `packages/config/tailwind/tokens.css` — every token in §18 as a custom property.
- `apps/web/app/globals.css` — the `@theme inline` mapping from §18.1.
- `apps/web/app/fonts.ts` — Plus Jakarta Sans (600/700/800) and Inter (400/500/600/700)
  via `next/font`, with `font-feature-settings: "tnum" 1, "cv11" 1`.
- `apps/web/lib/format-money.ts` — §11.4 display rules, including the ISO-code suffix for
  non-base amounts and the `≈` conversion line.
- `apps/web/components/ui/` — the 23 components of §14.3.
- `.storybook/` configured with the a11y addon and the MSW addon.
- A contrast-verification test asserting §17.1's published ratios.
- `.claude/skills/component-checklist/SKILL.md`.

## 5. Task breakdown

**F3-01 · Token file** — *Purpose:* one source for every visual value. All groups from
§18: spacing, radius, elevation, motion duration and easing, reduced-motion override,
z-index, breakpoints, layout, focus ring, opacity; all colours from §17.1 and §17.3; the
semantic aliases from §18.1. *Files:* `packages/config/tailwind/tokens.css`.
*Acceptance:* every value in §18's table exists as a custom property with the spec's own
name; a diff against the spec table is part of review.

**F3-02 · Tailwind mapping** — *Purpose:* make tokens reachable from class names. *Files:*
`apps/web/app/globals.css`. *Acceptance:* the `@theme inline` block matches §18.1; a
component can express income colour as a utility without knowing a hex value.

**F3-03 · Contrast verification test** — *Purpose:* §17.1 publishes exact ratios and the
spec corrects the boards precisely because ratios were wrong. Prove ours. *Files:*
`packages/config/tailwind/contrast.test.ts`. *Acceptance:* computed ratios match the
published ones (primary-700 5.48:1, error-600 4.83:1, neutral-600 4.83:1, …); any token
used for text that falls below 4.5:1 fails the test.

**F3-04 · Typography** — *Purpose:* self-hosted, no layout shift, tabular numerals.
*Files:* `apps/web/app/fonts.ts`, type scale utilities. *Acceptance:* the nine type
tokens from §17.4 render at the specified size/line; digits align in a column of
amounts; no CLS from font loading.

**F3-05 · Money formatting** — *Purpose:* §11.4 is subtle and gets reused everywhere.
`Intl.NumberFormat` with locale and currency code; non-base amounts always show the ISO
code (because `$` is both USD and LRD); the `≈ base` secondary line; the `fx_estimated`
info affordance; never truncate with an ellipsis. *Files:*
`apps/web/lib/format-money.ts`, `components/ui/money-text.tsx`. *Acceptance:* `L$
5,000.00 LRD` renders with its `≈ $26.40` line; JPY renders with no decimals; KWD with
three; a long value wraps or steps down rather than truncating.

**F3-06 · Button, IconButton** — variants primary/secondary/tertiary/destructive/ghost ×
sizes sm/md/lg × states default/hover/focus/active/disabled/loading. Min height 44 px at
md; loading preserves width and sets `aria-busy`; `IconButton`'s `label` becomes both
`aria-label` and tooltip. *Files:* `components/ui/button.tsx`, `icon-button.tsx`.
*Acceptance:* every variant × state has a story; axe clean; keyboard activation by both
Enter and Space.

**F3-07 · Input, Textarea, AmountInput** — *Purpose:* `AmountInput` is the most important
component in the product. Locale-aware decimal entry respecting the currency exponent,
`inputmode="decimal"`, 16 px text to prevent iOS zoom, the live `≈` conversion line, and
ADR-005's too-small message shown before Save. *Files:* `components/ui/input.tsx`,
`textarea.tsx`, `amount-input.tsx`. *Acceptance:* labels always visible; errors linked by
`aria-describedby`; entering 0.01 LRD with a USD base shows the too-small message;
exponent-0 currencies reject decimal entry.

**F3-08 · Pickers: CurrencyPicker, CategoryPicker, DatePicker** — searchable currency
list with recent and base pinned; category sheet on mobile / popover on desktop with
recent-first; date input native on mobile, calendar popover on desktop, `max=today`
(BR-09), with Today/Yesterday shortcuts. *Files:* `components/ui/*-picker.tsx`.
*Acceptance:* each is fully keyboard operable; the date picker cannot select tomorrow.

**F3-09 · Selection and layout: SelectRow, PeriodSelector/SegmentedControl, FilterChip**
— `role="radiogroup"` with arrow-key navigation; `aria-pressed` on chips. *Files:*
`components/ui/`. *Acceptance:* arrow keys move selection, Tab leaves the group.

**F3-10 · Data display: SummaryMetric/MetricCard, TransactionRow, GoalCard, ProgressBar,
StatusChip** — tabular figures; delta chips carry an arrow icon *and* text, never colour
alone; a transaction row is one button with a complete accessible name;
`role="progressbar"` with `aria-valuenow` and `aria-valuetext`; status chips are icon +
text (✓ On track, ! At risk, ↓ Behind, ★ Completed). *Files:* `components/ui/`.
*Acceptance:* a screen reader announces "minus twelve dollars, expense, Food, 17
September" for a transaction row (§20); no component conveys state by hue alone.

**F3-11 · Overlays: BottomSheet/Dialog, ConfirmationDialog, Toast** — Radix Dialog with
focus trap, Esc, and focus returned to the trigger; confirmation dialogs put the
destructive action right with Cancel focused by default; toasts are `role="status"`, 5 s,
pause on hover/focus, with a keyboard-reachable action for Undo. *Files:*
`components/ui/`. *Acceptance:* focus returns to the trigger on close; the Undo action is
reachable by keyboard within the toast's lifetime.

**F3-12 · State components: EmptyState, LoadingSkeleton, ErrorState** — empty states
answer what is missing, why it matters and what to do next; skeletons match the final
layout and appear only after 150 ms; error states keep cached content visible with a
non-blocking banner. *Files:* `components/ui/`. *Acceptance:* skeleton shimmer is
disabled under `prefers-reduced-motion`; no full-screen spinner exists anywhere.

**F3-13 · ChartContainer and OfflineSyncIndicator** — `figure` + `figcaption`, a "View as
table" toggle, and `aria-hidden` on the SVG when the table is shown; the sync chip reads
"Sync pending (2)". *Files:* `components/ui/`. *Acceptance:* the table toggle renders a
real `<table>` with the same data.

**F3-14 · Storybook and the a11y gate** — *Purpose:* make "every variant and state" a
reviewable artefact and run axe per state. *Files:* `.storybook/*`. *Acceptance:*
every component has stories for all its variants and states; the axe job fails CI on a
serious or critical violation.

**F3-15 · Category icon and colour mapping** — *Purpose:* the nine `cat-*` tokens bound to
Lucide icons, per open-questions Q5. *Files:* `apps/web/lib/category-visuals.ts`.
*Acceptance:* every default category resolves to an icon and a token; category is never
rendered as icon alone (§18.2).

**F3-16 · Illustration set** — *Purpose:* §18.2's direction — flat, soft gradients, people
of African descent represented prominently. Sourced for Welcome, onboarding (3), and the
empty states. *Files:* `apps/web/public/illustrations/`. *Acceptance:* each is used via
`next/image` with responsive sizes and hides below 360 px where it would push content
below the fold (§21).

## 6. Tooling

New: `tailwindcss` 4.3.3, `@radix-ui/react-*`, `lucide-react` 1.47.0, `storybook` +
`@storybook/nextjs`, `msw-storybook-addon`, `@axe-core/playwright` 4.13.0,
`@testing-library/react` 16.3.3 and `user-event`. MCP: Unsplash for F3-16. The
`component-checklist` skill is **created here**.

## 7. Testing

Component tests for behaviour and accessibility: keyboard paths, focus management, ARIA
wiring, reduced-motion. Storybook interaction tests for the overlay components. The
contrast test (F3-03) is a unit test over the tokens themselves. axe runs per story from
this phase onward — the beginning of **WAC-19**, not the end.

Directly covers the component half of **WAC-18** (every screen has loading/empty/error
states — the components those states are built from) and starts **WAC-19**.

## 8. Exit criteria

1. Every token in §18 exists as a custom property under the spec's own name, mapped into
   Tailwind.
2. The contrast test passes against §17.1's published ratios, and no text token falls
   below 4.5:1.
3. All 23 components in §14.3 exist with every variant and every state from §19.2.
4. Every component has Storybook stories covering those variants and states.
5. axe reports no serious or critical violations across all stories; the gate is wired
   into CI.
6. Money formatting satisfies §11.4 for base, non-base, estimated-rate, exponent-0 and
   exponent-3 cases.
7. No component contains a hard-coded colour, size, radius, duration or z-index —
   verified by a lint rule, not by inspection.
8. Fonts are self-hosted with no layout shift, and numerals are tabular.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-12 this is the widest estimate in the plan | Split delivery: F3-01…F3-05 (tokens, type, money) land and are reviewed before the component work starts, giving an early signal on pace |
| R-10 accessibility found late | This phase is the mitigation — axe per story from here on |
| Tailwind 4.3 `@theme inline` behaves differently than §18.1 assumes | Proven in F0-01, two phases earlier |
| Radix version skew across the many `@radix-ui/react-*` packages | Pin exact versions; add a single `radix.ts` re-export so upgrades touch one file |
| Components drift from the spec catalogue during later feature phases | The `component-checklist` skill is loaded whenever a component is added or changed |

## 10. Estimate

**9 days** — the largest frontend phase and one of three flagged high-uncertainty (±30%).
Roughly: 2 days tokens, typography, money formatting and the contrast test; 5 days across
the 23 components; 1 day Storybook, the axe gate and the a11y sweep; 1 day icons and
illustrations.

## 11. Approval gate

Owner reviews the **Storybook build** rather than a code diff — that is the artefact that
shows every variant and state. Specifically: the palette rendered with measured contrast
ratios; `AmountInput` in base, foreign and too-small cases; the status chips proving
meaning without colour; the empty, loading and error components; and a green axe report.
Then F4 may start.
