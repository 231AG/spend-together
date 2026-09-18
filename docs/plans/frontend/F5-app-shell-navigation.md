# F5 — App shell and navigation

## 1. Objective

Build the frame every screen lives in: the complete route map from §12.1, the three
responsive navigation treatments (bottom tabs, icon rail, sidebar), the global Add sheet
reachable from everywhere, dialogs implemented as intercepted routes so the browser's
back and forward buttons work through every overlay, and the desktop keyboard shortcuts.
After this phase the app is navigable end to end with placeholder screens; F6–F11 fill
them in.

## 2. Spec references

§12.1 (sitemap and routes), §12.2 (navigation model and keyboard shortcuts), §14.1
(application tree), §21 (responsive shell behaviour), §8.5 (rendering strategy), §20
(landmarks, skip link, focus management), §18 (layout tokens: sidebar 240, rail 72,
tabbar 64 + safe area).

## 3. Prerequisites

F3 complete and approved (the shell is built from tokens and primitives). F4 complete
(navigation renders against mocked session and couple state).

## 4. Deliverables

- Every route in §12.1 existing and reachable, with placeholder content where the screen
  arrives in a later phase.
- Route groups `(public)`, `(auth)`, `(setup)`, `(app)` with their layouts.
- `<AppShell>` per §14.1: `SkipLink`, breakpoint-appropriate navigation, `AddButton` →
  `AddSheet`, `OfflineSyncIndicator` and `RecalculatingBanner` slots, `<main
  id="content">`, the `@modal` slot, and a single imperative `ConfirmationDialog`.
- Intercepted route `@modal/(.)add/[type]` rendering the Add form as a dialog on desktop
  and a full-height sheet on mobile, with the direct URL rendering a full page.
- Keyboard shortcut layer with the `?` help dialog and a Profile toggle to disable it.
- `/offline` fallback route.

## 5. Task breakdown

**F5-01 · Route map** — *Purpose:* every URL in §12.1 exists before any screen does, so
no later phase invents a path. Includes query-parameter contracts
(`/home?period=`, `/activity?type=&category=&from=&to=&q=`, `/insights?period=&date=`,
`/goals?tab=`, `/goals/new?type=`). *Files:* `apps/web/app/**/page.tsx`. *Acceptance:*
every route in §12.1 returns 200 with a placeholder; filters live in the URL and survive
a reload.

**F5-02 · Route groups and layouts** — public, auth (centred card with back link), setup,
and the authenticated shell. *Files:* `app/(public)/layout.tsx` and siblings.
*Acceptance:* an unauthenticated visit to an `(app)` route redirects to `/`; a visit to
`/login` with a session redirects to `/home`; `?next=` is honoured and **same-origin
only**.

**F5-03 · Responsive navigation** — bottom tab bar below 768 px (Home, Activity, Goals,
Insights, Profile — five destinations per correction #6), icon rail 72 px at 768–1023,
sidebar 240 px with user card at 1024+. *Files:* `components/features/navigation/`.
*Acceptance:* the correct treatment renders at 360 / 768 / 1024 / 1440; the current
destination is marked with `aria-current="page"`; safe-area insets are respected on
notched viewports.

**F5-04 · Global Add** — FAB bottom-right 16 px above the tab bar on mobile, "+" at the
top of the rail, primary "Add" button at the top of the sidebar. Opens the Add sheet with
its three rows (Income / Expense / Savings contribution), each with the one-line
explanation from SCR-09. *Files:* `components/features/add-sheet.tsx`. *Acceptance:*
reachable from every main destination; Esc, swipe-down and backdrop click close it; the
savings row opens a goal picker first.

**F5-05 · Intercepted routes for forms** — *Purpose:* §12.2's hard requirement that back
and forward work through dialogs. *Files:* `app/(app)/@modal/(.)add/[type]/page.tsx`,
`app/(app)/add/[type]/page.tsx`. *Acceptance:* opening Add pushes a history entry;
browser Back closes the dialog without leaving the page; deep-linking to `/add/expense`
renders a full page; refreshing with the dialog open renders the full page.

**F5-06 · Focus and landmark structure** — skip link, `header`/`nav`/`main` landmarks, one
`h1` per page, focus moved to the heading on client navigation, focus trapped in overlays
and returned to the trigger on close. *Files:* `components/layout/`. *Acceptance:* a
keyboard-only pass through every route reaches every destination; no keyboard trap; axe
reports no landmark or heading violations.

**F5-07 · Keyboard shortcuts** — `N` new transaction, `/` focus Activity search, `G` then
`H`/`A`/`G`/`I`/`P` to navigate; a `?` help dialog listing them; a Profile setting to
disable all shortcuts. *Files:* `components/features/shortcuts/`. *Acceptance:*
shortcuts do not fire while focus is in a text input; disabling in Profile stops all of
them; the help dialog is itself keyboard reachable.

**F5-08 · Shell slots** — `OfflineSyncIndicator` and `RecalculatingBanner` render from
context, wired to mocked state now and to real state in F12 and F11. *Files:*
`components/layout/app-shell.tsx`. *Acceptance:* the scenario switcher can turn each on;
neither shifts layout when it appears.

**F5-09 · `/offline` fallback** — the route the service worker will serve in F12. *Files:*
`app/offline/page.tsx`. *Acceptance:* renders without any network call.

## 6. Tooling

No new packages. Uses F3's primitives and F4's mocks. MCP Playwright may be enabled here
for interactive verification (`tooling-and-skills.md` §2).

## 7. Testing

Component tests for the navigation treatments at each breakpoint and for shortcut
handling. Playwright smoke tests for the history behaviour of intercepted routes —
open dialog, Back, Forward, refresh — which is the failure mode most likely to be missed
by unit tests. axe across the shell in all three navigation modes.

Covers the navigation half of **WAC-16** (responsive behaviour) and contributes to
**WAC-19**.

## 8. Exit criteria

1. Every route in §12.1 exists and is reachable; filter state lives in the URL and
   survives reload and Back.
2. The three navigation treatments render at their breakpoints with correct dimensions
   from the layout tokens.
3. The Add sheet is reachable from every main destination and offers all three options.
4. Back and Forward work through opening and closing every dialog and sheet; direct URLs
   render full pages.
5. A keyboard-only pass reaches every destination; skip link works; focus returns to the
   trigger after every overlay closes.
6. Shortcuts work, do not fire in inputs, and can be disabled.
7. axe clean across the shell in all three modes.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Intercepted routes are subtle and break on refresh or deep link | Playwright covers open/back/forward/refresh explicitly; the full-page fallback is built in the same ticket, not later |
| Next 16's App Router behaviour differs from the version §8.3 was written against | Verified in F0-01; parallel-route behaviour is the specific thing to confirm |
| Focus management regresses as screens are added in F6–F11 | The focus assertions live in shared test helpers reused by every later phase |
| Shortcut layer intercepts typing in the Activity search | Explicit guard plus a regression test |

## 10. Estimate

**4 days.** Roughly: 1 day routes and layouts, 1 day the three navigation treatments,
1 day Add sheet and intercepted routes, 1 day focus, shortcuts and the a11y pass. Medium
uncertainty, concentrated in the intercepted-route work.

## 11. Approval gate

Owner reviews: a walk through every route at three breakpoints; Back/Forward through the
Add dialog; a keyboard-only navigation pass; and the shortcut help dialog. Then F6 may
start.
