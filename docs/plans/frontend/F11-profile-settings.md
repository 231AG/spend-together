# F11 — Profile and settings

## 1. Objective

Build profile and preferences, including the two operations with real consequences:
managing custom categories (create, rename, re-icon, archive — never delete) and changing
base currency, which re-expresses every total the user has ever seen while preserving
their original amounts, behind a recalculation banner.

## 2. Spec references

SCR-21 (Profile & settings), SCR-22 (Categories); §7.10 (change base currency); FR-22,
FR-23, FR-26; §11.3 (base currency change), §11.4 (display rules); BR-12, BR-15, BR-17;
§12.1 (profile routes); §19.2; W-09 wireframe.

## 3. Prerequisites

F3, F4 (`/me` with the `recalculating: true` window; category handlers enforcing
archive-not-delete), F5, F8 (dashboards for the banner to appear over).

## 4. Deliverables

- `/profile` summary and preference rows.
- `/profile/categories` (SCR-22), `/profile/currency`, `/profile/notifications`,
  `/profile/security`.
- Base-currency change with impact dialog and `RecalculatingBanner`.
- Keyboard-shortcut toggle (from F5-07).

## 5. Task breakdown

**F11-01 · Profile summary (SCR-21)** — name, identifier, Edit profile; preference rows
for base currency, timezone, categories and notifications; couple row; security rows.
*Files:* `app/(app)/profile/page.tsx`. *Acceptance:* **FR-22** — reproduces W-09's
grouping and shows current values inline ("USD · US Dollar", "14 categories", "Email:
on"); rows stack label-over-value below 768 px (§21).

**F11-02 · Categories (SCR-22)** — Expense / Income tabs; default categories shown with a
locked icon and no edit affordance (BR-17); custom categories with icon, name, Edit and
Archive; Add category. *Files:* `app/(app)/profile/categories/page.tsx`. *Acceptance:*
**FR-23** — defaults cannot be edited or deleted; archiving hides a category from pickers
while **history keeps it**; a duplicate name within a type is rejected.

**F11-03 · Base-currency change (§11.3, §7.10)** — searchable picker; an impact dialog
explaining "All your totals will be shown in EUR. Past entries are converted at the rate
from their own dates. Your original amounts are kept."; confirm → `PATCH /me` → banner.
*Files:* `app/(app)/profile/currency/page.tsx`. *Acceptance:* **FR-22, WAC-15** — the
dialog states all three facts; goal currencies are explicitly **not** changed (BR-15).

**F11-04 · Recalculation banner** — while `recalculating: true`, dashboards show
"Updating your totals to EUR…" and **keep displaying the previous values** rather than
blanking or showing partial ones. *Files:* `components/layout/recalculating-banner.tsx`
(wired from F5-08). *Acceptance:* the banner appears across Home, Insights and Goals; no
layout shift when it appears or clears; previous values stay visible throughout.

**F11-05 · Post-recalculation verification** — once complete, all totals are re-expressed
and original amounts preserved. *Files:* across. *Acceptance:* **WAC-15** — a transaction
entered as 5,000 LRD still reads 5,000 LRD after the base changes from USD to EUR, with a
new `≈ €` line.

**F11-06 · Notifications** — toggles for invitation-accepted and couple-goal-completed;
the invitation email itself is not optional. *Files:*
`app/(app)/profile/notifications/page.tsx`. *Acceptance:* **FR-26** — exactly the two
toggles from `profiles.notify_email`, and no third.

**F11-07 · Security and account** — change password, log out. Logout clears cookies, the
query cache and offline stores; with pending outbox items it warns first ("2 entries
haven't synced. Log out anyway and lose them?" — the warning is wired here, the outbox
arrives in F12). *Files:* `app/(app)/profile/security/page.tsx`. *Acceptance:*
**FR-03, WAC-02** — logout clears all three stores.

**F11-08 · Timezone and shortcuts** — timezone change with detection, and the toggle that
disables keyboard shortcuts. *Files:* `app/(app)/profile/page.tsx`. *Acceptance:*
changing timezone changes period boundaries on Home (BR-16) — a visible, testable
consequence.

**F11-09 · Currency attribution** — the FX provider attribution link required by §11.1,
shown in Settings → Currency and the site footer. *Files:*
`app/(app)/profile/currency/page.tsx`, footer. *Acceptance:* the attribution is present
and links correctly — a licensing obligation, not a nicety.

## 6. Tooling

No new packages.

## 7. Testing

Component tests for archive-not-delete, default-category immutability, and the impact
dialog's content. Playwright covers **flow 7.10** (change base currency end to end,
including the banner and the preserved originals). A test that changing timezone shifts a
boundary-straddling transaction into a different period.

Covers **FR-22, FR-23, FR-26**; **WAC-15** (base-currency change) and part of **WAC-02**
(logout clears everything).

## 8. Exit criteria

1. Profile reproduces W-09 with live values, stacking correctly below 768 px.
2. Default categories are immutable; custom ones archive rather than delete, and history
   retains archived categories.
3. The base-currency impact dialog states all three consequences before confirmation.
4. During recalculation the banner shows and previous values remain visible.
5. After recalculation every total is re-expressed and every original amount preserved.
6. Notification toggles match `notify_email` exactly.
7. Logout clears cookies, query cache and offline stores.
8. FX attribution is present in both required places.
9. Playwright flow 7.10 passes; axe clean.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Recalculation banner blanks dashboards instead of keeping prior values | Specified in §11.3 step 3 and asserted directly; the mock provides a configurable window to test against |
| Archiving a category breaks historical rows that reference it | Archive only hides from pickers; history joins still resolve — tested with a transaction on an archived category |
| A user believes changing base currency rewrites their entries | The impact dialog says the opposite explicitly, and F11-05 proves it |
| Goal currency silently follows base currency | BR-15 asserted by test; no UI offers it |

## 10. Estimate

**4 days.** Roughly: 1 day profile and rows, 1 day categories, 1.5 days currency change
with dialog, banner and verification, 0.5 day notifications, security and attribution.
Low uncertainty.

## 11. Approval gate

Owner reviews: archiving a category and confirming history survives; changing base
currency from USD to EUR with the banner visible and originals preserved; the
notification toggles; and logout clearing state. Then F12 may start.
