# F13 — Hardening and frontend acceptance

## 1. Objective

Turn "built" into "accepted": a full accessibility pass to WCAG 2.2 AA across every
screen and state, responsive verification at all supported widths, the frontend half of
the performance budgets, the complete Playwright suite covering flows 7.1–7.10 plus
offline and the two-user couple scenario, visual snapshots, and a signed-off
`frontend-acceptance.md`. This phase **verifies**; it should not be discovering
fundamental problems, because accessibility and responsiveness have been checked per
ticket since F3.

## 2. Spec references

§20 (accessibility, all rows), §21 (responsive behaviour, all breakpoints), §22
(WAC-01…WAC-20, frontend portions), §23 (testing architecture, all layers), §23.1
(T-01…T-16 — verified, implemented in F2), §16.4 (analytics events), §19.2 (complete
state matrix), §27 (definition of done, items 1–7).

## 3. Prerequisites

F0–F12 complete and approved. Nothing may be in progress: this phase measures a finished
frontend.

## 4. Deliverables

- Playwright suite: flows 7.1–7.10, offline sync, the two-user couple scenario, across
  Chromium, WebKit and Firefox plus Pixel 7 and iPhone 14 emulation.
- axe-core checks on every screen **and every state**.
- Visual snapshots at 360 / 768 / 1280 (plus 320 and 1440 checks per Q10).
- Lighthouse CI configuration and a passing run against WAC-20's frontend budgets.
- Bundle analysis proving ≤ 180 kB gzip first-load JS on `/home`.
- Completed `frontend-acceptance.md` with every box ticked and evidence linked.
- Updated `traceability-matrix.md` with every frontend FR/WAC/T green.

## 5. Task breakdown

**F13-01 · Playwright suite for flows 7.1–7.10** — one spec per flow, against MSW with
the deterministic clock. *Files:* `apps/web/e2e/flows/*.spec.ts`. *Acceptance:* all ten
flows pass on Chromium, WebKit and Firefox.

**F13-02 · Two-user couple scenario** — two browser contexts: invite, accept, both
contribute to a shared goal, each verifies they cannot see the other's private data, then
one ends the couple. *Files:* `e2e/couple-two-user.spec.ts`. *Acceptance:* **WAC-12** —
contributions are mutually visible with contributor names; no other partner data is
reachable through the UI.

**F13-03 · Offline E2E** — add an expense offline, reconnect, assert exactly one
transaction. *Files:* `e2e/offline.spec.ts`. *Acceptance:* **WAC-17**.

**F13-04 · Mobile viewport coverage** — Pixel 7 and iPhone 14 emulation across the core
flows; viewports 360–430 px per WAC-16, **plus 320 px** per §20/§21 and Q10. *Files:*
`playwright.config.ts` projects. *Acceptance:* **WAC-16** — no horizontal scrolling at
any width down to 320 px.

**F13-05 · axe across every screen state** — not just default states: loading, empty,
error, offline, foreign currency, couple and non-couple, driven by the F4 scenario
switcher. *Files:* `e2e/a11y.spec.ts`. *Acceptance:* **WAC-19** — zero serious or
critical violations across all 22 screens × their states.

**F13-06 · Manual screen-reader pass** — NVDA + Firefox, VoiceOver + Safari (macOS and
iOS), TalkBack + Chrome, per §20. Particular attention to money phrasing ("minus twelve
dollars, expense, Food, 17 September"), status chips, toasts (`role="status"`), errors
(`role="alert"`) and chart data tables. *Files:*
`docs/plans/frontend/screen-reader-report.md`. *Acceptance:* **WAC-19 (manual)** — the
report records what was tested, on what, and what was fixed.

**F13-07 · Keyboard and focus audit** — every screen, dialog and sheet: tab order, focus
trap, focus return, skip link, no traps, shortcut behaviour. *Files:* audit section of
`ux-ui-specification.md`. *Acceptance:* every screen has a documented, verified keyboard
map.

**F13-08 · Text scaling and reflow** — 200% browser zoom and 320 px width without
clipping or horizontal scroll (§20, §17.4). *Files:* `e2e/reflow.spec.ts`. *Acceptance:*
money values wrap or step down rather than truncating with an ellipsis.

**F13-09 · Reduced motion** — every animation respects `prefers-reduced-motion`;
durations drop to 0 ms except opacity fades ≤ 100 ms; the goal celebration is skippable.
*Files:* `e2e/reduced-motion.spec.ts`. *Acceptance:* §18's reduced-motion rule holds
everywhere, including charts and skeletons.

**F13-10 · Performance budgets** — Lighthouse CI on the mobile profile: LCP ≤ 2.5 s on
`/home`; bundle analysis for ≤ 180 kB gzip first-load JS. Dynamic-import Recharts;
audit font and icon payloads. *Files:* `lighthouserc.json`, CI job. *Acceptance:*
**WAC-20 (frontend half)** — both budgets met and enforced in CI; the API p95 half waits
for B9.

**F13-11 · Visual snapshots** — key screens at 360 / 768 / 1280 (§23). *Files:*
`e2e/visual/`. *Acceptance:* baselines committed; diffs are reviewed, not auto-approved.

**F13-12 · Analytics verification** — every §16.4 event fires with the right properties
and **no amounts, notes, category names or partner identity**. *Files:*
`e2e/analytics.spec.ts`. *Acceptance:* a payload containing any forbidden field fails the
test.

**F13-13 · Traceability sweep** — walk `traceability-matrix.md` and confirm every
frontend FR, WAC and T maps to a passing test. *Files:*
`docs/plans/00-shared/traceability-matrix.md`. *Acceptance:* no frontend row is
unevidenced; anything genuinely deferred to the backend is marked as such with its phase.

**F13-14 · Frontend acceptance sign-off** — complete the checklist with links to
evidence. *Files:* `docs/plans/frontend/frontend-acceptance.md`. *Acceptance:* every item
ticked or explicitly deferred with a reason and an owning backend phase.

## 6. Tooling

New: `@lhci/cli`, Playwright projects for WebKit/Firefox and device emulation. Uses
`@axe-core/playwright` from F3. Chromium is preinstalled in this environment; do not run
`playwright install`.

## 7. Testing

This phase *is* testing. What it adds beyond earlier phases is breadth: cross-browser,
cross-viewport, every state rather than the default state, and the manual assistive-
technology pass that no automated tool replaces.

Verifies **WAC-01…WAC-20** to the extent each is frontend-observable, and confirms
**T-01…T-16** still pass at 100% domain coverage.

## 8. Exit criteria

1. Playwright flows 7.1–7.10 green on Chromium, WebKit and Firefox.
2. The two-user couple scenario green, including the privacy assertions.
3. Offline sync green with no duplicates.
4. Zero serious or critical axe violations across every screen **and state**.
5. Manual screen-reader pass completed and reported.
6. No horizontal scrolling from 320 px to 1440 px; 200% zoom reflows cleanly.
7. LCP ≤ 2.5 s on the Lighthouse mobile profile for `/home`; first-load JS ≤ 180 kB gzip.
8. `packages/domain` still at 100% coverage with all sixteen T- cases passing.
9. Visual baselines committed for the key screens at three widths.
10. Analytics events carry no forbidden data.
11. `traceability-matrix.md` has no unevidenced frontend row.
12. `frontend-acceptance.md` fully ticked.
13. The app builds and runs with `NEXT_PUBLIC_API_MODE=live` — proving the switch works,
    even with no server behind it.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-12 this phase becomes remediation rather than verification | Prevented upstream: axe from F3, responsive checks per ticket, keyboard paths in every acceptance check. If remediation is still needed, it is visible as tickets remaining rather than as an overrun discovered at the end |
| Cross-browser failures concentrated in WebKit (dialogs, dvh, service worker) | WebKit runs in CI from F5 onward for smoke tests, not first here |
| Performance budget missed by the chart bundle | Recharts dynamically imported; Home needs no chart at all (§16 opening rule), which is the budget's biggest lever |
| Visual snapshot churn makes diffs meaningless | Snapshots limited to key screens at three widths; masked regions for the clock-dependent parts, which the deterministic clock already minimises |
| Manual AT pass slips because it needs real devices and time | Scheduled as its own ticket with a written report, not folded into "a11y fixes" |

## 10. Estimate

**7 days** — flagged high-uncertainty (±30%). Roughly: 2 days the Playwright flow suite,
1 day cross-browser and viewport matrix, 1.5 days the axe sweep and fixes, 1 day the
manual AT pass and report, 1 day performance and bundle work, 0.5 day traceability and
sign-off.

## 11. Approval gate

Owner reviews: the full green test report across three browsers; the axe summary; the
screen-reader report; the Lighthouse result; and the completed
`frontend-acceptance.md`. **Approving this gate declares the frontend complete** and
opens the backend plan at B0.
