# UX/UI specification

This document goes deeper than spec §13–§21. Where the specification says *what* a screen
contains, this says how it is laid out at each breakpoint, in what order, from what data,
in every state, with what words, and what happens when you press Tab.

**Mockup rule — binding.** Every value shown anywhere in this document, in any fixture,
story, screenshot or test, uses the specification's **corrected reference dataset**
(§6.5). The design boards' numbers are wrong and are never used. In particular the Home
hero is **$330.00** (Remaining Cash Flow, F-04) — never $850 — and category percentages
are Bills 26.3% · Food 24.6% · Other 18.4% · Transport 15.8% · Shopping 14.9%, never the
boards' invented 30/25/20/15/10.

**Contents**

1. Global layout and breakpoints · 2. Screen inventory (SCR-01…SCR-22) ·
3. Component specifications · 4. Interaction and motion · 5. Microcopy deck ·
6. Form validation table · 7. Keyboard and focus map · 8. Accessibility annotations ·
9. Category icons and colours; illustrations · 10. Money formatting rules

---

## 1. Global layout and breakpoints

Supported width: **320 px minimum** (§20, §21). Designed at 360 / 768 / 1024 / 1440 and
continuous between them — no dead zones.

| Token | Value | Applies |
|---|---|---|
| `content-max` | 1200 px | Centred content column ≥ 1024 |
| `sidebar` | 240 px | ≥ 1024 |
| `rail` | 72 px | 768–1023 |
| `tabbar` | 64 px + safe area | < 768 |
| header | 56 px | < 768 |
| `touch-min` | 44 px | All interactive targets on touch |

**Shell by breakpoint**

- **< 768 px** — header 56 px; content; bottom tab bar (Home, Activity, Goals, Insights,
  Profile); FAB bottom-right, 16 px above the tab bar. Sheets use `100dvh` so the browser
  toolbar cannot hide the Save button.
- **768–1023 px** — left icon rail 72 px with tooltips and labels on focus; "+" at the top
  of the rail; forms as centred dialogs max 480 px.
- **≥ 1024 px** — left sidebar 240 px with labels and a user card at the bottom; primary
  Add button at the top; content max 1200 px centred; Activity as a split view.

Safe-area insets (`env(safe-area-inset-*)`) apply to the tab bar, FAB and any sticky
action bar. Hover-only affordances are forbidden — every hover effect has focus and touch
equivalents.

---

## 2. Screen inventory

Each screen lists: purpose, content order, layout per breakpoint, data dependencies, and
every state. States are drawn from §19.2 plus the cross-cutting ones this project needs
(partial data, foreign currency, couple/non-couple, recalculating).

### SCR-01 — Splash / session restore · any route

- **Content order:** centred brand mark → (after 400 ms) thin progress indicator.
- **Layout:** identical at all widths; vertically centred.
- **Data:** session probe only.
- **States:** *restoring* (≤ 400 ms shows nothing, avoiding a flash); *valid session* →
  `/home`, or `/setup/currency` when `onboarded_at` is null; *no session* → Welcome;
  *error* → "Can't reach SpendTogether" + Retry. **Never a dead end** — there is always a
  Retry.

### SCR-02 — Welcome · `/`

- **Content order:** brand → tagline → illustration → three-line promise → Create account
  (primary) → Log in (secondary).
- **Layout:** < 1024 single column, illustration above the promise, buttons pinned to the
  bottom third. ≥ 1024 split: copy left, illustration right.
- **Data:** none (static, SSG).
- **States:** default; *offline* renders fully from cache (it is static).
- Below 360 px the illustration is hidden so the buttons stay above the fold (§21).

### SCR-03 — Onboarding · `/onboarding`

- **Content order:** pager (3 pages) → illustration → headline → one sentence → dots →
  Skip / Next (final page: Get started).
- **Pages:** 1 Track income and expenses · 2 Understand daily/weekly/monthly patterns ·
  3 Save alone or together.
- **Layout:** single column at every width; ≥ 1024 constrained to 480 px centred.
- **Data:** none. Seen-once flag in `localStorage` (explicitly non-sensitive, §12.1).
- **States:** three pages; skipped. Swipe or arrow keys move between pages.

### SCR-04 — Register · `/register`

- **Content order:** back → title → Name → Email or phone → Password (show/hide, strength
  hint) → Confirm password → Create account → "Already have an account? Log in".
- **Layout:** centred card max 480 px at all widths; full-bleed below 480 px.
- **Data:** `POST /auth/register`.
- **States:** default; *validating* (on blur); *field errors*; *submitting* (button
  disabled, inline spinner); *duplicate* → generic conflict with Log in link;
  *rate limited*; *offline* → "You're offline. Connect to sign in."

### SCR-05 — Login · `/login`

- **Content order:** identifier → password (show/hide) → Forgot password → Log in → link
  to Register.
- **Layout:** as SCR-04.
- **Data:** `POST /auth/login`; honours `?next=` (same-origin only).
- **States:** default; *error* above the button, never naming a field; *locked out*
  ("Too many attempts. Try again in 15 minutes."); *submitting*; *offline*.

### SCR-06 — Forgot / reset password · `/forgot-password`, `/reset-password`

- **Content order:** step 1 identifier → Send instructions. Step 2 new password → confirm
  → Set password.
- **Layout:** as SCR-04.
- **Data:** `POST /auth/forgot-password`, `POST /auth/reset-password`.
- **States:** step 1 default / submitting / **always the same confirmation**; step 2
  default / mismatch / weak / expired token; success → "You're signed out everywhere else".

### SCR-07 — Currency setup · `/setup/currency`

- **Content order:** heading → explanation → search → currency list (code + name,
  pre-selected from locale) → detected timezone with Change → Continue.
- **Layout:** full height, list scrolls, Continue pinned at the bottom on mobile; centred
  480 px ≥ 768.
- **Data:** `GET /currencies`, browser locale and `Intl.DateTimeFormat().resolvedOptions()`;
  `PATCH /me` on continue.
- **States:** default with locale pre-selection; searching; *no match*; *timezone
  undetected* → UTC with Change prominent; submitting; error.

### SCR-08 — Home dashboard · `/home?period=today|week|month`

- **Content order:** greeting + date + base currency → period selector → hero card
  ("Remaining this [period]" + Income / Expenses / Saved / Savings rate) → net cash flow
  line → spending preview (top 5 categories) → goals preview (max 3) → recent activity
  (≥ 1024 only) → quick add.
- **Layout:**
  - < 768: single column, hero → categories → goals.
  - 768–1023: hero full width; categories | goals two columns.
  - ≥ 1024: 12-col grid — hero (8) + goals (4); categories (8) + recent activity (4).
- **Data:** `GET /home/summary?period=`.
- **States:** *loading* skeleton hero + 3 rows + 2 goal cards (after 150 ms); *data*;
  *empty* → hero $0.00 + "Add your first income or expense — it unlocks your totals and
  insights." + Add transaction; *zero income* → savings rate "N/A" with explanation;
  *error* → banner over cached data + Retry; *offline* → cached summary with queued items
  applied locally, marked "Sync pending"; *recalculating* → banner, previous values kept;
  *partial* → any card that failed shows its own error, others render.

### SCR-09 — Add sheet · overlay

- **Content order:** title "What would you like to add?" → Income ("Money you received") →
  Expense ("Money you spent") → Savings contribution ("Money you put toward a goal").
- **Layout:** bottom sheet < 768; centred dialog ≥ 768.
- **States:** default. Savings opens a goal picker first. Esc, swipe-down and backdrop
  click all close.

### SCR-10 / SCR-11 — Add income · Add expense · `/add/income`, `/add/expense`

- **Content order:** header with close → (expense only: Income/Expense toggle) → **Amount,
  dominant, autofocused** → currency chip → conversion preview if non-base → Category →
  Date (default today) → Note (optional, 280) → Save.
- **Layout:** full-height sheet < 768 with Save fixed above the keyboard; centred dialog
  480 px ≥ 768. Direct URL renders a full page.
- **Data:** `GET /categories` (recent first for expense), `GET /exchange-rates?date=`,
  `POST /transactions`.
- **States:** default (Save disabled); *valid*; *converting* (preview loading);
  *foreign currency* (≈ line visible); *amount too small* (ADR-005 message, Save
  disabled); *submitting*; *server error* → values preserved + Retry; *offline* → queued,
  toast "Saved offline — will sync".

### SCR-12 — Activity · `/activity`

- **Content order:** title → search → filter chips (All, Income, Expense, Savings
  contributions, Category, Date range) → date-grouped list → infinite loader.
- **Row:** category icon · title (category or goal name) · note · signed amount with type
  icon; non-base rows add "≈ base" beneath.
- **Layout:** < 1024 list only, details as a pushed page. ≥ 1024 split view, list 58% /
  details 42%.
- **Data:** `GET /activity` with cursor pagination, 50 per page.
- **States:** *loading* 8 skeleton rows; *data*; *empty* → "Nothing recorded yet" + Add;
  *filtered empty* → "No activity matches these filters" + Clear filters; *error* → Retry,
  previous results kept; *offline* → cached list with queued rows at top; *loading more*.

### SCR-13 — Transaction details / edit / delete · `/activity/[id]`

- **Content order:** type and amount (original) → converted amount **with the rate and its
  date** → category → date → note → Edit → Delete.
- **Layout:** side panel ≥ 1024; pushed page below.
- **Data:** `GET /transactions/:id`.
- **States:** loading; data; *foreign currency* (both amounts, rate line); *estimated rate*
  (info icon: "Converted using the closest available rate."); *deleting* (confirmation);
  *deleted* (toast with Undo, 5 s); *offline* (edit and delete disabled with explanation);
  not found → 404 state.

### SCR-14 — Insights · `/insights?period=&date=`

- **Content order:** period control (Daily / Weekly / Monthly) → date stepper → 4 metric
  cards with deltas → spending trend (C-02) → income vs expenses (C-03) → category
  breakdown (C-01) → savings rate (C-05) → average daily spending.
- **Layout:** < 768 stacked, charts full width, 2 × 2 metric grid, bars show last 3
  buckets. 768–1023 two-column cards. ≥ 1024 four metric cards in a row; trend (7) + bars
  (5); breakdown full width.
- **Data:** `GET /insights/{daily|weekly|monthly}?date=`.
- **States:** *loading* skeleton cards + chart frames; *data*; *empty* → "Insights improve
  as you record transactions" + available totals; *insufficient data* → "Your trends
  appear as you record more activity" instead of an empty axis; *per-card error* with its
  own Retry; *offline* → last cached period + banner; *previous period absent* → "New"
  instead of a percentage.

### SCR-15 — Goals · `/goals?tab=mine|ours`

- **Content order:** segment (My goals / Our goals) → goal cards → Completed (collapsed)
  → Create goal.
- **Card:** icon · name · saved of target · progress bar · % · target date · status chip
  (icon + text).
- **Layout:** one column < 768; two 768–1023; three ≥ 1024.
- **Data:** `GET /goals?scope=`.
- **States:** loading 3 skeleton cards; data; *My empty* → "You have no savings goals yet"
  + Create goal; *Ours, no partner* → explanation + Connect partner; *Ours, partner, no
  goals* → Create shared goal; error; offline (cached, create disabled).

### SCR-16 — Create / edit goal · `/goals/new`, `/goals/[id]/edit`

- **Content order:** goal type (Individual default; Couple **disabled with explanation**
  when there is no active couple) → name → icon picker → target amount + currency → target
  date → Create goal.
- **Edit differs:** no type control, **no currency control** (BR-15).
- **Layout:** sheet < 768, dialog ≥ 768.
- **Data:** `GET /couple` (to enable the couple option), `POST|PATCH /goals`.
- **States:** default (Create disabled); invalid target (≤ 0); invalid date (past);
  couple disabled + Connect Partner link; submitting; `409 COUPLE_REQUIRED`; offline
  (disabled).

### SCR-17 — Goal details · `/goals/[id]`

- **Content order:** hero (name, saved, target, progress bar, %) → remaining → required
  pace per day/week/month → status card in plain language → projected completion →
  contributor breakdown (couple only) → contribution history → Add contribution (sticky on
  mobile).
- **Layout:** < 768 single column with sticky action bar; 768–1023 two columns, hero |
  pace/status; ≥ 1024 two columns with history full width.
- **Data:** `GET /goals/:id`, `GET /goals/:id/contributions`.
- **States:** loading hero skeleton; data; *zero contributions* → $0 saved, remaining,
  required pace, Add contribution; *completed* → Completed chip, celebration on
  transition; *overdue* → "Overdue" with no pace number; *no recent contributions* →
  projection replaced by that phrase; *archived (couple ended)* → banner, no Add button;
  error; offline (Add queues, status recomputed locally).

### SCR-18 — Add contribution · `/goals/[id]/contribute`

- **Content order:** goal context (name, saved of target) → Amount + currency (defaults to
  **goal** currency) → conversion preview → Date → Note → "After this" preview → Add
  contribution.
- **Layout:** sheet < 768, dialog ≥ 768.
- **Data:** `GET /goals/:id`, `POST /goals/:id/contributions`.
- **States:** default; foreign currency (≈ in goal currency); *will complete* → "After
  this" shows 100%; *completed on save* → celebration ≤ 1.2 s; archived → blocked with
  `409 GOAL_ARCHIVED` copy; submitting; offline (queued).

### SCR-19 — Couple · `/couple`

- **Content order by state:**
  - *No partner:* heading "Saving together" → illustration → "Save for shared goals
    together" → **privacy explanation** → Invite partner.
  - *Pending:* status chip → destination → expiry → Resend / Cancel → "Shared goals appear
    here after {name} accepts."
  - *Connected:* "You & {name}" → connected-since → Our goals preview → Create shared goal
    → End connection.
- **Layout:** single column < 768; centred 640 px ≥ 768.
- **Data:** `GET /couple`.
- **States:** the three above, plus *ex-partner* (archived goals readable), loading, error,
  offline (read-only). **Never renders partner income, expenses, balances or individual
  goals in any state.**

### SCR-20 — Invitation landing · `/invite/[token]`

- **Content order:** "{FirstName} invited you to save together on SpendTogether." →
  privacy explanation → Accept / Decline (logged in) or Create account / Log in.
- **Layout:** centred card, public shell.
- **Data:** `GET /invitations/by-token/:token` — **inviter first name only**.
- **States:** valid; *invalid or expired* → explanation + "ask {name} to resend";
  *already in a couple* → cannot accept, with reason; *not logged in* → register/login
  then return to accept; accepted; declined.

### SCR-21 — Profile & settings · `/profile`

- **Content order:** profile summary (avatar, name, identifier, Edit profile) →
  PREFERENCES (base currency, timezone, categories, notifications) → COUPLE (partner) →
  SECURITY & ACCOUNT (change password, log out).
- **Layout:** rows stack label-over-value < 768; label left / value right ≥ 768; two
  columns ≥ 1024 (summary card left, settings right).
- **Data:** `GET /me`, `GET /couple`, category count.
- **States:** loading; data; *recalculating* (currency row shows progress); offline
  (management disabled); error.

### SCR-22 — Categories · `/profile/categories`

- **Content order:** tabs (Expense / Income) → default categories (locked icon, no edit) →
  custom categories (icon, name, Edit, Archive) → Add category.
- **Layout:** single column; ≥ 1024 constrained to 720 px.
- **Data:** `GET /categories`.
- **States:** loading; data; *no custom categories* → hint to add one; archiving
  confirmation; duplicate name error; offline (disabled).

---

## 3. Component specifications

Anatomy, props, variants, states and the tokens each uses. All 23 components of §14.3.

### Button

- **Anatomy:** `[iconLeft?] label [spinner?]`, with a focus ring outside the border box.
- **Props:** `variant: primary | secondary | tertiary | destructive | ghost`,
  `size: sm | md | lg`, `loading`, `iconLeft`, `disabled`, `type`.
- **States and tokens:**

| State | Primary | Destructive |
|---|---|---|
| default | bg `--action-primary-bg` (#047857), fg `#FFFFFF` (5.48:1) | bg `--action-danger-bg` (#DC2626), fg white (4.83:1) |
| hover | primary-800 | error-700 |
| active | primary-800 + `elev-0` | error-700 |
| focus | `focus-ring` 2 px primary-700, offset 2 px | same |
| disabled | opacity `.45`, no pointer events | same |
| loading | width preserved, spinner replaces label, `aria-busy="true"` | same |

- **Rules:** min height 44 px at `md`; one primary per view region; destructive never uses
  the primary style (§18.2).

### IconButton
`icon`, `label` (**required**). `label` becomes both `aria-label` and the tooltip. 44 × 44
minimum touch target even when the icon is 20 px.

### Input / Textarea
`label` (always visible, never a placeholder substitute), `hint`, `error`, `maxLength`.
Error linked by `aria-describedby` and announced with `role="alert"`. 16 px text prevents
iOS zoom. Border `--border-default`; focus uses the focus ring; error border error-600
**plus** the message — never colour alone.

### AmountInput
- **Anatomy:** label → large numeric field → currency chip → (conversion line) → (error).
- **Props:** `value` (minor units), `currency`, `onCurrencyChange`, `previewBase?`,
  `max?`.
- **Behaviour:** `inputmode="decimal"`; locale-aware separators; **respects the currency
  exponent** (JPY accepts no decimals, KWD accepts three); never accepts a negative
  (BR-07 — direction comes from type).
- **States:** empty · valid · foreign currency (shows "≈ $26.40 USD · rate of 17 Sep") ·
  rate loading · rate unavailable (`FX_UNAVAILABLE` → "We can't convert right now. You can
  still save in LRD.") · **too small** (ADR-005) · error · disabled.
- **Tokens:** `num-display` type token for the value; `caption` for the ≈ line; `fg-muted`.

### CurrencyPicker · CategoryPicker · DatePicker
Searchable list with recent and base pinned (currency); sheet on mobile / popover on
desktop with recent-first ordering (category); native date input on mobile, calendar
popover on desktop, `max=today` (BR-09), Today/Yesterday shortcuts (date). All fully
keyboard operable; all announce their selected value.

### SelectRow · PeriodSelector/SegmentedControl · FilterChip
Settings row with chevron; `role="radiogroup"` with arrow-key navigation and roving
tabindex; `aria-pressed` chips. Track uses `neutral-100`; selected uses `primary-50` with
`primary-800` text.

### SummaryMetric / MetricCard
`label`, `money | pct`, `delta?`. Numbers use the tabular-figure tokens. **The delta chip
carries an arrow icon and signed text — never colour alone** (§20). Savings-rate deltas
are expressed in **points**, not percent.

### TransactionRow
The whole row is one button with a complete accessible name: *"minus twelve dollars,
expense, Food, 17 September, Lunch"*. Income uses primary-700 and a `+` prefix; expense
error-700 and a U+2212 prefix; savings secondary-600 with a "saved" suffix (§17.2).
Non-base rows add the ≈ line in `caption`/`fg-muted`.

### GoalCard
`goal`, `compact?`. Name, saved of target, ProgressBar, %, target date, StatusChip.
Compact drops the date and shrinks to the goals preview on Home.

### ProgressBar
`role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`,
`aria-valuetext="50% — $600 of $1,200"`. Track `neutral-200`, fill `primary-600`, 8 px,
rounded.

### StatusChip
Icon **and** text, always: ✓ On track (primary-800 on primary-50) · ! At risk (accent-700
on accent-50) · ↓ Behind (error-700 on error-50) · ★ Completed (primary-800 on
primary-50).

### BottomSheet / Dialog · ConfirmationDialog · Toast
Radix Dialog: focus trap, Esc, focus returned to the trigger, scrim
`rgb(17 24 39 / .48)`, `elev-3`. Confirmation dialogs state consequences, put the
destructive action on the right, and focus **Cancel** by default. Toasts are
`role="status"`, 5 s, pause on hover and focus, and their action is keyboard reachable.

### EmptyState · LoadingSkeleton · ErrorState
Empty states answer what is missing, why it matters and what to do next, with one primary
CTA. Skeletons match the final layout, appear only after 150 ms, and lose their shimmer
under reduced motion. Error states use plain language, keep cached content visible, and
always offer Retry.

### ChartContainer · OfflineSyncIndicator
`figure` + `figcaption` with a visible title, a one-line description and a "View as
table" toggle; the SVG takes `aria-hidden="true"` while the table is shown. The sync chip
reads "Sync pending (2)" and opens the queue.

---

## 4. Interaction and motion

All durations and easings come from §18 tokens. Nothing animates a value — no counting
numbers (§16.2).

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Button hover / press | `dur-fast` 120 ms | `ease-standard` | Colour and elevation only |
| Sheet / dialog open | `dur-base` 200 ms | `ease-standard` | Sheet slides from bottom; dialog fades + scales from .98 |
| Sheet / dialog close | `dur-base` 200 ms | `ease-exit` | |
| Toast enter / exit | `dur-base` 200 ms | `ease-standard` / `ease-exit` | |
| Progress bar fill | `dur-slow` 320 ms | `ease-standard` | Animates on change, not on mount |
| Page / route transition | `dur-slow` 320 ms | `ease-standard` | Opacity only |
| Chart entry | ≤ 300 ms | `ease-standard` | §16.2 cap |
| Skeleton shimmer | 1200 ms loop | linear | Disabled under reduced motion |
| **Goal completion celebration** | `dur-celebrate` 1200 ms | — | See below |

**Reduced motion.** `@media (prefers-reduced-motion: reduce)` sets every duration to
0 ms except opacity fades, which are capped at 100 ms. The celebration does not play at
all; the Completed state simply appears. Skeletons lose their shimmer but keep their
shape. Nothing that conveys information is removed — only the movement is.

**Goal-completion celebration.** Fires **once**, on the transition from not-complete to
complete, keyed by the contribution that caused it, so revisiting a completed goal does
not replay it. Restrained confetti ≤ 1.2 s, never blocking interaction, always skippable
by any input. Haptic feedback where supported. Partner emailed for couple goals (backend).
Adding an expense never celebrates (§13 SCR-11) — spending is not an achievement.

**Optimistic updates.** Applied immediately, rolled back on failure with the prior cache
snapshot restored, and the form reopened with values preserved plus Retry (§7.3). The
rollback is silent apart from the error — no flashing of intermediate states.

---

## 5. Microcopy deck

Plain language, sentence case, no error codes, no jargon. Second person. Never blame the
user.

### Headings and titles

| Screen | Heading |
|---|---|
| Welcome | Know what you earn. / Know what you spend. / Know what you can save. |
| Register | Create your account |
| Login | Welcome back |
| Forgot password | Reset your password |
| Currency setup | Choose your currency |
| Home | Good morning, {name} / Good afternoon, {name} / Good evening, {name} |
| Home hero | Remaining this month · Remaining this week · Remaining today |
| Activity | Activity |
| Insights | Insights |
| Goals | Goals |
| Goal details | {goal name} |
| Add contribution | Add to {goal name} |
| Couple | Saving together |
| Profile | Profile & settings |
| Categories | Categories |

### Button labels

Save expense · Save income · Add contribution · Create goal · Create account · Log in ·
Log out · Continue · Invite partner · Create shared goal · End connection · Add
transaction · Clear filters · View as table · Retry · Undo · Resend · Cancel · Archive ·
Add category · Edit profile · Change password · Skip · Next · Get started

### Explanatory copy

| Context | Copy |
|---|---|
| Currency setup | Your totals and insights are shown in this currency. You can still enter amounts in any currency. |
| Add sheet — Income | Money you received |
| Add sheet — Expense | Money you spent |
| Add sheet — Savings | Money you put toward a goal |
| Couple privacy (no partner) | Your partner sees shared goals only. Your income, expenses and personal goals always stay private. |
| Invitation landing | {FirstName} invited you to save together on SpendTogether. You'll share savings goals — not your income, expenses or personal goals. |
| Base currency dialog | All your totals will be shown in {CODE}. Past entries are converted at the rate from their own dates. Your original amounts are kept. |
| Savings rate N/A | We can't work out a savings rate without any income this period. |
| Estimated rate | Converted using the closest available rate. |
| Goal status — on track | Save {weekly}/week to finish by {date}. At your pace: done ~{projection}. |
| Goal status — at risk | You're a little behind. Save {daily}/day to finish by {date}. |
| Goal status — behind | Saving {daily}/day from today still gets you there by {date}. |
| Goal status — overdue | This goal's date has passed. Update the date or keep saving — {remaining} to go. |
| Goal status — completed | Goal reached. You saved {target}. |
| No recent contributions | No recent contributions, so we can't project a finish date yet. |

### Empty states

| Screen | Title | Body | Action |
|---|---|---|---|
| Home | Add your first income or expense | Your totals and insights appear as soon as you record something. | Add transaction |
| Activity (no data) | Nothing recorded yet | Income, expenses and savings contributions all show up here. | Add transaction |
| Activity (filtered) | No activity matches these filters | Try a wider date range or a different category. | Clear filters |
| Insights | Insights improve as you record transactions | Here's what we have so far. | — |
| Goals (mine) | You have no savings goals yet | A goal turns "I should save" into a number and a date. | Create goal |
| Goals (ours, no partner) | Save for shared goals together | Connect a partner to create goals you both contribute to. | Connect partner |
| Goals (ours, no goals) | No shared goals yet | You and {name} can save toward something together. | Create shared goal |
| Goal details | No contributions yet | Add your first contribution to start tracking progress. | Add contribution |
| Categories | No custom categories | Add one if the defaults don't fit how you spend. | Add category |
| Charts (thin data) | — | Your trends appear as you record more activity. | — |

### Error messages

| Situation | Copy |
|---|---|
| Wrong credentials | Email/phone or password is incorrect. |
| Too many attempts | Too many attempts. Try again in 15 minutes. |
| Duplicate identifier | An account with these details already exists. Log in instead? |
| Forgot password (always) | If an account exists, we've sent instructions. |
| Generic server error | We couldn't save that. Try again. |
| Network unreachable | Can't reach SpendTogether. |
| Offline — blocked action | Connect to the internet to do this. |
| Offline — sign in | You're offline. Connect to sign in. |
| `FX_UNAVAILABLE` | We can't convert right now. You can still save in {CODE}. |
| `COUPLE_REQUIRED` | Connect a partner to create shared goals. |
| `GOAL_ARCHIVED` | This goal is read-only since you ended the connection. |
| Not found | We couldn't find that. It may have been deleted. |
| Amount too small (ADR-005) | This amount is too small to record in {CODE}. Enter a larger amount. |

### Toasts

Income added · Expense added · Contribution added · Transaction deleted **[Undo]** ·
Transaction restored · Saved offline — will sync · Goal created · Goal updated ·
Invitation sent · Invitation cancelled · Connection ended · Category archived ·
Totals updated to {CODE}

### Confirmation dialogs

| Action | Title | Consequences | Confirm |
|---|---|---|---|
| Delete transaction | Delete this expense? | Your totals and insights will be recalculated. | Delete |
| Delete goal | Delete "{name}"? | This also deletes its {n} contributions. This can't be undone. | Delete goal |
| Delete contribution | Remove this contribution? | The goal's balance and status will update. | Remove |
| Archive category | Archive "{name}"? | It disappears from pickers. Past entries keep it. | Archive |
| End connection | End your connection with {name}? | Shared goals become read-only for both of you. History stays visible. Your personal data was never shared. **Type {FirstName} to confirm.** | End connection |
| Cancel invitation | Cancel this invitation? | The link stops working immediately. | Cancel invitation |
| Logout with pending | {n} entries haven't synced. | Log out anyway and lose them? | Log out |

### Validation messages

See the table in §6 — every message is written there beside its rule.

---

## 6. Form validation table

Trigger is when the message first appears. All forms re-validate on submit, and errors are
summarised at the top of the form on submit (§20).

| Form | Field | Rule | Trigger | Message |
|---|---|---|---|---|
| Register | Name | Required, 1–80 chars | blur | Enter your name. |
| Register | Email or phone | Required; valid email or E.164 | blur | Enter a valid email address or phone number. |
| Register | Password | Required, min 10 | blur | Use at least 10 characters. |
| Register | Password | Not a known breached password | submit | This password has appeared in a data breach. Choose another. |
| Register | Confirm password | Must match | blur | Passwords don't match. |
| Register | (form) | Identifier not already used | submit | An account with these details already exists. Log in instead? |
| Login | Identifier | Required | submit | Enter your email or phone number. |
| Login | Password | Required | submit | Enter your password. |
| Login | (form) | Credentials valid | submit | Email/phone or password is incorrect. |
| Reset password | New password | min 10 | blur | Use at least 10 characters. |
| Reset password | Confirm | Must match | blur | Passwords don't match. |
| Currency setup | Currency | One selected | submit | Choose a currency to continue. |
| Add transaction | Amount | Required, > 0 (BR-07) | blur | Enter an amount greater than 0. |
| Add transaction | Amount | Respects currency exponent | keystroke (blocked) | *(input rejects the keystroke — no message)* |
| Add transaction | Amount | Converted value ≥ 1 minor unit (ADR-005) | blur | This amount is too small to record in {CODE}. Enter a larger amount. |
| Add transaction | Category | Required | submit | Choose a category. |
| Add transaction | Date | Not in the future (BR-09) | change | Pick today or an earlier date. |
| Add transaction | Note | ≤ 280 chars | keystroke | Counter shown; input stops at 280. |
| Create goal | Name | Required, 1–60 | blur | Give your goal a name. |
| Create goal | Target amount | > 0 (BR-10) | blur | Enter a target greater than 0. |
| Create goal | Target date | Today or later (BR-10) | change | Choose today or a future date. |
| Create goal | Type = couple | Active couple exists (FR-13) | on render | Connect a partner to create shared goals. |
| Add contribution | Amount | > 0 | blur | Enter an amount greater than 0. |
| Add contribution | Amount | Converted ≥ 1 minor unit | blur | This amount is too small to record in {CODE}. Enter a larger amount. |
| Add contribution | Date | Not in the future (BR-09) | change | Pick today or an earlier date. |
| Invite partner | Invitee | Valid email or E.164 | blur | Enter a valid email address or phone number. |
| Invite partner | Invitee | Not yourself | submit | You can't invite yourself. |
| Invite partner | (form) | Invitee free to accept | submit | This person can't accept right now. |
| Add category | Name | Required, 1–40 | blur | Name your category. |
| Add category | Name | Unique within type (BR-17) | submit | You already have a category with this name. |
| End connection | Confirm field | Matches partner's first name | keystroke | Type {FirstName} to confirm. |

---

## 7. Keyboard and focus map

**Global (desktop).** `N` new transaction · `/` focus Activity search · `G` then
`H`/`A`/`G`/`I`/`P` navigate · `?` shortcut help · all disableable in Profile. Shortcuts
never fire while focus is inside a text input.

**Every page.** Tab order: skip link → navigation → main content in visual order. `Esc`
closes the topmost overlay. Client navigation moves focus to the page `h1`.

| Surface | Focus on open | Tab cycle | Esc | Focus on close |
|---|---|---|---|---|
| Add sheet (SCR-09) | First row (Income) | Three rows → close | Closes | Trigger (FAB / Add) |
| Add form (SCR-10/11) | **Amount field** | Amount → currency → category → date → note → Save → close | Closes, discards with confirm if dirty | Trigger |
| Category picker | Search field | Search → list → close | Closes picker only | Category field |
| Currency picker | Search field | Search → list → close | Closes picker only | Currency chip |
| Date picker | Selected date | Grid (arrows move by day, PgUp/PgDn by month) | Closes | Date field |
| Transaction details (mobile) | Page `h1` | Content → Edit → Delete | Back | Activity row |
| Transaction details (desktop panel) | Panel heading | Panel content only | Returns focus to list | Activity row |
| Confirmation dialog | **Cancel** | Cancel ↔ Confirm | Cancels | Trigger |
| Toast with Undo | Not stolen — reachable via `F6`/Tab | Undo button | Dismisses | Prior focus retained |
| Goal picker (savings) | Search | List | Closes | Add sheet |
| Contribution form | Amount | Amount → currency → date → note → Add | Closes with confirm if dirty | Trigger |
| Chart | Chart container | Data points in series order; focus reveals tooltip; Tab exits to the table toggle | — | — |
| Filter chips | First chip | Arrow keys within group; Tab exits | — | — |
| Period selector | Selected option | Arrow keys; Tab exits | — | — |
| Sidebar / rail / tabs | — | In DOM order | — | — |

**Focus ring** is `focus-ring` (2 px solid primary-700, offset 2 px) everywhere and is
never removed — only restyled. Focus is visible on dark hero surfaces via an inner white
offset.

---

## 8. Accessibility annotations

**Landmarks.** `header` (app bar), `nav` (primary navigation, `aria-label="Main"`), `main
id="content"`, `footer` on public pages. One `h1` per page, matching the page title.
Heading levels never skip.

**Screen-reader phrasing for money.** Amounts are read naturally, with direction and
context, not as raw symbols:

| Visual | Announced |
|---|---|
| −$12.00 (Food, 17 Sep) | "minus twelve dollars, expense, Food, 17 September" |
| +$1,200.00 (Salary) | "plus one thousand two hundred dollars, income, Salary" |
| $50.00 saved (Laptop goal) | "fifty dollars saved, savings contribution, New Laptop" |
| L$ 5,000.00 LRD ≈ $26.40 | "five thousand Liberian dollars, about twenty-six dollars forty cents" |
| $600.00 of $1,200 · 50% | "six hundred dollars of one thousand two hundred dollars, fifty percent" |
| 25.0% savings rate, +2.5 pts | "twenty-five percent savings rate, up two and a half points versus August" |
| N/A savings rate | "savings rate not available, no income this period" |

Implemented with a visually-hidden text node alongside the visual figure, not by
`aria-label` on a container (which would lose the tabular formatting for sighted users).

**Roles.** Toasts `role="status"`; validation and server errors `role="alert"`; progress
bars `role="progressbar"` with `aria-valuetext`; filter chips `aria-pressed`; period
selectors `role="radiogroup"`; current nav item `aria-current="page"`; loading regions
`aria-busy`.

**Charts.** The `<table>` is the accessible representation. When it is shown, the SVG is
`aria-hidden="true"`. Data points are focusable in series order and focus reveals the
tooltip (§16.2).

**Colour.** Never the only carrier of meaning. Every financial colour is accompanied by a
sign, an icon and a label (§17.2). Every status is icon + text. Every delta is arrow +
signed text.

**Targets.** ≥ 44 × 44 px on touch; ≥ 24 × 24 px minimum anywhere, with spacing (WCAG
2.5.8).

**Forms.** Persistent visible labels; hints and errors linked by `aria-describedby`;
errors summarised at the top on submit; autocomplete attributes (`name`, `email`, `tel`,
`new-password`, `current-password`); no time limits; paste permitted in password fields;
password managers supported (WCAG 3.3.8).

**Reflow.** 200% zoom and 320 px width with no horizontal scrolling and no clipping.
Money never truncates with an ellipsis — it wraps or steps down one type size (§17.4).

---

## 9. Category icons and colours; illustrations

Mapping per open-questions **Q5** (assumed, pending confirmation). Category is **always
icon + label, never icon alone** (§18.2). Icons are Lucide, 20 px default, stroke 1.75.

| Type | Category | Colour token | Hex | Lucide icon |
|---|---|---|---|---|
| expense | Food | `cat-food` | #F59E0B | `utensils` |
| expense | Bills | `cat-bills` | #6366F1 | `receipt` |
| expense | Transport | `cat-transport` | #3B82F6 | `bus` |
| expense | Shopping | `cat-shopping` | #06B6D4 | `shopping-bag` |
| expense | Health | `cat-health` | #EC4899 | `heart-pulse` |
| expense | Education | `cat-education` | #8B5CF6 | `graduation-cap` |
| expense | Entertainment | `cat-entertainment` | #F97316 | `clapperboard` |
| expense | Family | `cat-family` | #14B8A6 | `users` |
| expense | Other | `cat-other` | #94A3B8 | `circle-dashed` |
| income | Salary | `cat-bills` | #6366F1 | `wallet` |
| income | Business | `cat-family` | #14B8A6 | `briefcase` |
| income | Gift | `cat-health` | #EC4899 | `gift` |
| income | Investment | `cat-transport` | #3B82F6 | `trending-up` |
| income | Other | `cat-other` | #94A3B8 | `circle-dashed` |

Income reuses expense tokens because §17.3 defines no income palette and income never
appears in the category donut (C-01 is expense-only per F-08/F-09). Custom categories pick
from the same nine tokens.

**Other UI icons.** Home `home` · Activity `list` · Goals `target` · Insights
`bar-chart-3` · Profile `user` · Add `plus` · Income `arrow-down-left` (in a circle) ·
Expense `arrow-up-right` (in a circle) · Savings `piggy-bank` · On track `check` · At risk
`alert-triangle` · Behind `arrow-down` · Overdue `clock` · Completed `star` · Offline
`cloud-off` · Sync pending `refresh-cw` · Estimated rate `info` · Locked default category
`lock`.

**Illustration list.** Flat, soft gradients, **people of African descent represented
prominently** (§18.2, and the launch market is Liberia). Hidden below 360 px where they
would push content below the fold (§21). Delivered via `next/image` with responsive sizes.

| ID | Where | Subject |
|---|---|---|
| `ill-welcome` | SCR-02 | Two people looking at a phone together, warm and unhurried |
| `ill-onboarding-1` | SCR-03 p1 | A person recording an expense on a phone |
| `ill-onboarding-2` | SCR-03 p2 | Simple chart shapes suggesting a weekly pattern |
| `ill-onboarding-3` | SCR-03 p3 | Two people beside a shared goal marker |
| `ill-empty-home` | SCR-08 empty | An open, uncluttered ledger |
| `ill-empty-activity` | SCR-12 empty | A calm empty list |
| `ill-empty-goals` | SCR-15 empty | A target with a single flag |
| `ill-couple-none` | SCR-19 no partner | Two figures, one extending an invitation |
| `ill-invite` | SCR-20 | A welcoming doorway |
| `ill-offline` | `/offline` | A disconnected but unbroken link |
| `ill-error` | Error boundaries | Something set down gently, not broken |

---

## 10. Money formatting rules

From §11.4 and §6.1. Implemented once in `lib/format-money.ts`; no component formats money
itself.

1. **Always `Intl.NumberFormat`** with the user's locale and the ISO currency code. Never
   hand-built string concatenation.
2. **Base currency amounts** show the symbol: `$1,200.00`. Totals are labelled with the
   code once per card header — "This month · USD" — not on every figure.
3. **Non-base amounts always show the ISO code**, because symbols are ambiguous (`$` is
   both USD and LRD): `L$ 5,000.00 LRD`.
4. **The conversion line** sits beneath the original in secondary text:
   `≈ $26.40` — and where the rate matters (transaction details), the full form:
   `≈ $26.40 USD (rate 1 USD = 189.39 LRD, 17 Sep)`.
5. **Exponents are respected**: JPY shows no decimal places, KWD shows three, USD and LRD
   two. Driven by `currencies.exponent`, never assumed to be 2.
6. **Estimated conversions** (`fx_estimated`) carry an info affordance: "Converted using
   the closest available rate."
7. **Sign and direction** come from the type, never from a negative stored amount (BR-07):
   `+` for income, U+2212 (−, true minus) for expense, "saved" suffix for contributions.
8. **Negative results** — remaining cash flow can legitimately be negative (F-04) and is
   shown as "Overspent" with a minus sign and an icon, not as red text alone.
9. **Percentages** are computed at full precision and rounded to one decimal for display:
   `25.0%`, `26.3%`. Savings-rate *changes* are in points: `+2.5 pts`.
10. **Zero income** renders savings rate as **"N/A"** with its explanation — never `0%`,
    `NaN`, `∞` or a blank.
11. **Money never truncates with an ellipsis.** Long values wrap or step down one type
    size (§17.4).
12. **Tabular figures everywhere** (`tnum`), so columns of amounts align.
