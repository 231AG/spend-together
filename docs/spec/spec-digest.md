# SpendTogether — Web App Specification v1.0 · Markdown digest

> **What this file is.** A faithful Markdown extraction of
> `docs/spec/SpendTogether_Web_App_Specification.pdf` (61 pages, Version 1.0,
> 17 September 2026, prepared for Corex Digital Solutions), organised by the
> specification's own section numbers.
>
> **How to use it.** Future sessions search *this* file instead of re-reading the
> PDF. Load only the sections a phase references. The PDF remains the legal
> source of truth; if the two ever disagree, the PDF wins and this file is fixed.
>
> **Fidelity.** Every ID (FR-, BR-, F-, SCR-, WAC-, T-, C-, W-), every formula,
> every table, the full SQL DDL, the API endpoint catalogue, the error codes and
> the design tokens are reproduced. Passages that could not be read clearly are
> marked `[UNREADABLE — check PDF p.X]` and are never filled in from assumption.
>
> Page references in this digest (`p.N`) are pages of the specification PDF.

---

## Document control — About this specification (p.2)

| Field | Value |
|---|---|
| Product | SpendTogether — Income, Expense & Savings web app (individuals and couples) |
| Document | Complete Web App Specification (PRD + architecture + design + delivery) |
| Version | 1.0 — 17 September 2026 |
| Platform | Responsive web app / installable PWA (desktop, tablet, mobile browsers) |
| Stack (confirmed) | Next.js (App Router, TypeScript, Node.js runtime) + Supabase (Postgres, Auth, Row-Level Security) |
| Currency model (confirmed) | Full multi-currency with conversion |
| Scope rule (confirmed) | Original PRD scope only. Multi-currency is the single approved scope exception. |
| Source documents | Income_Expense_Savings_App_Complete_PRD.pdf; Income_Expense_Savings_App_Mobile_Design_Specification.pdf; two SpendTogether design boards (PNG) |
| Owner | Corex Digital Solutions |

### How to read this document (p.2)

Written for the people who will build, design, test and ship the product. Every
requirement has an identifier so it can be traced into tickets and tests:

- **FR-** functional requirement
- **BR-** business rule
- **F-** formula
- **SCR-** screen
- **WAC-** web acceptance criterion
- **T-** test case

**Normative language:** MUST is mandatory for MVP; SHOULD is expected unless
there is a documented reason; MAY is optional. Anything not stated in the spec
is out of scope for the MVP.

### Scope interpretation rules (p.2)

The owner chose to stay strictly inside the original PRD. That was applied as
follows:

- **Added:** only multi-currency with conversion (explicitly approved).
- **Defined, not added:** the source documents reference behaviour without
  defining it (goal status thresholds, timezone and week boundaries, the Forgot
  Password screen, the `DELETE /couple` endpoint, category management). A spec
  with undefined behaviour cannot be built or tested, so this document gives
  each one the minimum definition needed. These are clarifications of existing
  scope, not new features.
- **Implementation endpoints:** a small number of API endpoints are required to
  implement screens the PRD already lists (profile/currency, categories,
  activity feed, exchange rates, password reset). They are listed separately in
  Section 10 and marked as such.
- **Excluded:** everything in the PRD non-goals, plus features the owner
  declined (goal withdrawals, recurring transactions, dark mode, budgeting).
  They are recorded in Section 26 as known limitations so nobody mistakes their
  absence for an oversight.

---

## READ FIRST — Source Corrections & Resolved Conflicts (p.6)

> The design boards are inspiration, not specification. They contain numerical
> and labelling errors. Where the boards conflict with the PRD or with
> arithmetic, **this document wins**. Every correction below is binding.

| # | Source issue | Why it is wrong | Resolution in this spec |
|---|---|---|---|
| 1 | Dashboard hero shows "Available this month $850" beside Income $1,200, Expenses $570, Saved $300, Remaining $330. | $850 is not produced by any PRD formula. Net cash flow is 1,200 − 570 = 630; remaining cash flow is 1,200 − 570 − 300 = 330. | The hero card shows **Remaining this month = Remaining Cash Flow (F-04)**. With the board data: **$330**. Net cash flow ($630) is shown as a secondary metric. |
| 2 | Donut legend: Food 30%, Bills 25%, Transport 20%, Shopping 15%, Other 10% of $570. | Dashboard shows Food $140, Transport $90, Bills $150. 140/570 = 24.6%, 90/570 = 15.8%, 150/570 = 26.3%. The legend is invented. | Category % always computed with F-11. Reference data used throughout this spec: Food $140 (24.6%), Bills $150 (26.3%), Transport $90 (15.8%), Shopping $85 (14.9%), Other $105 (18.4%). Total $570, sums to 100%. |
| 3 | Board 1 typography: Inter Bold headings. Board 2: Plus Jakarta Sans. | Two competing type systems. | **Plus Jakarta Sans** for headings; **Inter** for body, UI and all numbers (tabular figures). Section 17. |
| 4 | Board 2 palette: "Accent #F59E0B (Amber)" swatch is purple; "Secondary #6366F1" swatch is grey; several labels garbled. | Labels and swatches disagree. | Hex values win: Primary #10B981, Secondary #6366F1, Accent #F59E0B, Success #22C55E, Error #EF4444, Neutral #6B7280 / #111827. |
| 5 | Primary #10B981 used for white button text and green text; amber and #22C55E used as text colours. | WCAG contrast: #10B981 on white = 2.54:1, #22C55E = 2.28:1, #F59E0B = 2.15:1. All fail the 4.5:1 text minimum. | Brand hues are kept for fills and illustration only. Text and filled buttons use accessible shades (Primary-700 #047857 = 5.48:1). Section 17. |
| 6 | Mobile boards show 4 tabs + central "+" (no Profile tab). Design spec defines 5 tabs (incl. Profile) + global Add. | Navigation conflict. | Written design spec wins: 5 destinations (Home, Activity, Goals, Insights, Profile) + a global Add action. Section 12. |
| 7 | PRD required-pace formula: Required Daily = Remaining ÷ Days Remaining, with Days Remaining = max(Target − Today, 0). | Divides by zero on the target date itself. | F-17 uses max(Days Remaining, 1) while the target date is today or later; after the date passes, required pace is "Overdue" (no number). |
| 8 | Board status chip "At Risk" and goal statuses referenced without thresholds ("configurable thresholds"). | Untestable. | Concrete default thresholds defined in F-19 and stored in `app_config` so they remain configurable. |

> **Decision.** Mockup screens in this document use the corrected reference
> dataset. Developers **MUST NOT** copy numbers from the original boards into
> fixtures or tests.

> **Digest note on correction #7.** The correction text names "F-17" as the
> formula that applies `max(Days Remaining, 1)`. In §6.3 that behaviour is
> defined under **F-15 Required Daily** (F-17 is Required Monthly). This is an
> internal inconsistency in the source; it is logged in
> `docs/plans/00-shared/open-questions.md` and is *not* silently resolved here.

---

# PART A — PRODUCT

## 1. Product overview (p.7)

SpendTogether is a mobile-first, responsive web application for tracking income
and expenses and for reaching savings goals, alone or as a couple. It addresses
two problems: understanding where money comes from and where it goes, and
helping users consistently reach individual or shared savings goals.

- **Core promise:** Know what you earn. Know what you spend. Know what you can save.
- **Tagline:** Track. Save. Grow. Together.
- **MVP scope:** income tracking, expense tracking, daily/weekly/monthly
  insights, individual goals, couple goals, goal contributions, partner
  invitations, financial summaries, and multi-currency entry with conversion.

## 2. Goals and non-goals (p.7)

**Goals**

- Record income and expenses in any supported currency, with categories, dates and optional notes.
- Review financial performance by day, week and month in the user's base currency.
- Calculate net cash flow, recorded savings, remaining cash flow and savings rate.
- Create individual and couple goals, contribute to them, and see whether each goal is on track.
- Keep personal finances private by default, including from a connected partner.

**Explicit MVP non-goals (from PRD, unchanged)**

Bank integrations, automatic transaction imports, payment processing,
investments, debt/loan management, credit scoring, receipt scanning, AI advice,
shared wallets, expense settlements, complex accounting, tax tools and advanced
budgeting.

## 3. Users and product principles (p.7)

| Persona | Needs | Key screens |
|---|---|---|
| Individual | Simple visibility into income, spending, remaining money and personal goals. Often paid or spending in more than one currency. | Home, Add, Activity, Insights, Goals |
| Couple (two independent users) | Collaborate on shared savings without exposing personal transactions to each other. | Couple, Goals → Our Goals, Goal Details |

1. **Fast entry beats financial complexity.** Adding a transaction takes one screen and under 10 seconds for a returning user.
2. **Personal finances remain private by default.** Enforced in the database, not only in the UI.
3. **Savings contributions are distinct from expenses.** They never appear in expense analytics.
4. **The app explains numbers, not merely stores them.** Every metric has a label and, where useful, a one-line explanation.
5. **Mobile-first and usable in a few taps**, while making good use of larger screens.

## 4. Core concepts and business rules (p.8)

| ID | Rule |
|---|---|
| **BR-01** | **Income** is money received by a user. **Expense** is money spent by a user. Both are *transactions* owned by exactly one user. |
| **BR-02** | **Recorded savings** is money explicitly contributed to a savings goal. A contribution is a savings event, never an expense, and MUST NOT appear in expense totals, category breakdowns or average spending. |
| **BR-03** | An **individual goal** is owned and funded by one user and has no couple reference. |
| **BR-04** | A **couple goal** belongs to an active couple. Either member may contribute; every contribution retains its contributor. |
| **BR-05** | **Privacy rule:** connecting as a couple does not expose either partner's income, expenses, balances, individual goals or personal summaries. |
| **BR-06** | A user belongs to at most one active or pending couple at a time. A couple has exactly two members when active. |
| **BR-07** | All monetary amounts are positive. Direction comes from type (income / expense / contribution), never from the sign of the amount. |
| **BR-08** | Goal balances are derived from contribution records. No mutable balance column exists. |
| **BR-09** | Transaction and contribution dates may not be later than "today" in the user's timezone. |
| **BR-10** | A goal target date must be today or later at creation. A goal target amount must be > 0. |
| **BR-11** | A goal is **Completed** automatically when its balance ≥ its target, and returns to an active status if a later edit or deletion drops the balance below target. |
| **BR-12** | **Base currency:** each user has one base (default) currency. All of that user's summaries, insights and savings-rate figures are expressed in it. |
| **BR-13** | **Entry currency:** any transaction or contribution may be entered in any supported currency. The original amount and currency are always preserved. |
| **BR-14** | **Rate locking:** conversion uses the stored daily rate for the record's date. Once stored, converted values do not change when market rates move (see Section 11 for the base-currency-change exception). |
| **BR-15** | **Goal currency:** each goal has one currency, set at creation (default: creator's base currency) and immutable afterwards. Contributions are converted into it. |
| **BR-16** | **Periods** are calendar periods in the user's IANA timezone. Day = local calendar day. Week = ISO week, Monday to Sunday. Month = calendar month. |
| **BR-17** | **Categories:** default categories are system-owned and cannot be edited or deleted. Users may create custom categories. A custom category in use is archived (hidden from pickers) instead of deleted. |
| **BR-18** | **Couple end:** `DELETE /couple` (a PRD endpoint) ends the couple. Couple goals become read-only for both former partners; no new contributions; history remains visible to both. Nothing else is shared or moved. |

> **Note.** BR-16 and BR-18 are the minimum definitions required for PRD
> behaviour that the PRD references but never defines (period boundaries; the
> `DELETE /couple` endpoint). They are not new features.

## 5. Functional Requirements (p.9–10)

Grouped by capability. Each requirement maps to at least one acceptance
criterion in Section 22 and one test in Section 23.

| ID | Requirement | Priority | PRD ref |
|---|---|---|---|
| **FR-01** | Register with name, unique email *or* phone, password and confirm password. Duplicate identifiers are rejected with a non-revealing message. | MUST | AC01 |
| **FR-02** | Log in with identifier + password. Session persists across reloads via HTTP-only secure cookies. | MUST | AC01 |
| **FR-03** | Log out ends the session on the current device. | MUST | §10 |
| **FR-04** | Forgot / reset password via emailed link (email accounts) or SMS code (phone accounts). | MUST | Design §3, §7 |
| **FR-05** | First-run setup: choose base currency (pre-selected from browser locale) and confirm timezone (auto-detected). | MUST | §5 Auth flow |
| **FR-06** | Add income: amount, currency (default base), category, date (default today), optional note. | MUST | AC02 |
| **FR-07** | Add expense: same fields; recent categories listed first. | MUST | AC03 |
| **FR-08** | Edit and delete any own transaction; all affected summaries recalculate. | MUST | AC02, AC03 |
| **FR-09** | Activity list grouped by date, with filters (All, Income, Expense, Savings Contributions, category, date range) and text search on note/category. | MUST | §9 |
| **FR-10** | Home dashboard for Today / This Week / This Month: income, expenses, recorded savings, remaining cash flow, net cash flow, savings rate, category preview, active goals, quick add. | MUST | AC04 |
| **FR-11** | Insights for Daily / Weekly / Monthly: summary metrics, spending trend, income vs expenses, category breakdown, savings rate, previous-period comparison. | MUST | AC13 |
| **FR-12** | Create individual goal: name, target amount, goal currency, target date. | MUST | AC06 |
| **FR-13** | Create couple goal only when an active couple exists; otherwise the option is disabled with an explanation. | MUST | AC07 |
| **FR-14** | Add contribution to a goal: amount, currency (default goal currency), date, optional note. | MUST | AC08 |
| **FR-15** | Edit/delete own contributions (needed for AC08 derived balances to remain correct after mistakes). | MUST | AC08, AC10 |
| **FR-16** | Goal details: target, balance, remaining, progress, required pace, current pace, projected completion, status, contributor breakdown (couple), history. | MUST | AC09 |
| **FR-17** | Goal auto-completes when balance ≥ target (BR-11). | MUST | AC10 |
| **FR-18** | Edit goal name, target amount and target date; delete goal (with confirmation). | MUST | §10 PATCH/DELETE /goals |
| **FR-19** | Invite partner by email or phone; invitee registers or logs in, then accepts. Inviter can cancel or resend a pending invitation. | MUST | AC11 |
| **FR-20** | Couple screen shows state (none / pending / connected), partner identity and shared goals; never private data. | MUST | AC12 |
| **FR-21** | End couple (`DELETE /couple`) with a confirmation explaining consequences (BR-18). | MUST | §10 |
| **FR-22** | Profile & settings: name, email/phone, base currency, timezone, categories, notifications, couple controls, logout. | MUST | §9 |
| **FR-23** | Manage custom categories (create, rename, change icon, archive). | MUST | §9 Profile |
| **FR-24** | Enter amounts in any supported currency; show the converted base-currency value before saving. | MUST | Scope exception |
| **FR-25** | Offline: queue transaction and contribution creation locally and sync automatically, with a "Sync pending" indicator. | SHOULD | Design §21 |
| **FR-26** | Email notifications: partner invitation, invitation accepted, couple goal completed. User can switch off the last two. | SHOULD | §9 Notifications |

---

# DOMAIN LOGIC

## 6. Financial Formulas (p.11–13)

All formulas live in one pure TypeScript package (`@spendtogether/domain`) with
no framework, database or UI imports. The API, server components and offline
client all call the same functions. This is the PRD requirement that "financial
calculations live in reusable domain services" and are unit-tested independently
of the UI.

### 6.1 Money representation (p.11)

- Amounts are stored as **integers in minor units** (`bigint`), e.g. $12.50 = 1250 cents. Never floating point.
- Each currency carries its ISO 4217 exponent (USD 2, LRD 2, JPY 0, KWD 3). Minor units = major × 10^exponent.
- Exchange rates are stored as `numeric(24,10)` and multiplied using a decimal library (decimal.js) on the server.
- Conversion rounds **half away from zero** to the target currency's minor unit, once per record. Aggregates sum already-rounded converted values; they are never re-converted.
- Percentages are computed in full precision and rounded to one decimal place only for display.

### 6.2 Period calculations (base currency) (p.11)

All sums use each record's converted base amount (`base_amount_minor`) and
include only records whose date falls in the selected period (BR-16).

| ID | Name | Formula | Notes |
|---|---|---|---|
| **F-01** | Total Income | Σ base_amount of income transactions in period | |
| **F-02** | Total Expenses | Σ base_amount of expense transactions in period | Excludes contributions (BR-02). |
| **F-03** | Recorded Savings | Σ contributor_base_amount of the user's own contributions in period | Includes the user's contributions to couple goals, excludes the partner's. |
| **F-04** | Remaining Cash Flow | F-01 − F-02 − F-03 | May be negative; shown as "Overspent" with a minus sign and icon. |
| **F-05** | Net Cash Flow | F-01 − F-02 | May be negative. |
| **F-06** | Savings Rate | (F-03 ÷ F-01) × 100 | If F-01 = 0 → "N/A" (AC05). Can exceed 100% (saving from earlier income); displayed as computed. |
| **F-07** | Average Daily Spending | F-02 ÷ D | D = calendar days in the period. For the current, unfinished period, D = days elapsed including today. Always ≥ 1. |
| **F-08** | Category Total | Σ expense base_amount in category in period | |
| **F-09** | Category % | (F-08 ÷ F-02) × 100 | If F-02 = 0 → no breakdown shown (empty state). |
| **F-10** | Period Change | (Current − Previous) ÷ Previous × 100 | If Previous = 0 → show absolute change only, label "New". |

> **Rule.** F-07 clarification: dividing the current month's spending by 30 on
> the 3rd of the month would understate daily spending tenfold. For completed
> periods D is the full calendar length, exactly as the PRD states; for the
> current period D counts elapsed days only.

> **Digest note.** §6.2 F-09 defines Category %, while Source Correction #2
> attributes category percentages to "F-11" (which §6.3 defines as Goal
> Balance). Logged in `open-questions.md`; F-09 is the formula that computes
> category share of expenses.

### 6.3 Goal calculations (goal currency) (p.12)

| ID | Name | Formula |
|---|---|---|
| **F-11** | Goal Balance | Σ goal_amount_minor of all contributions to the goal |
| **F-12** | Remaining Amount | max(Target − F-11, 0) |
| **F-13** | Progress % | min((F-11 ÷ Target) × 100, 100) |
| **F-14** | Days Remaining | max(TargetDate − Today, 0) in whole days, user timezone |
| **F-15** | Required Daily | If TargetDate ≥ Today: F-12 ÷ max(F-14, 1). If TargetDate < Today and not completed: "Overdue" (no value). |
| **F-16** | Required Weekly | F-15 × 7 |
| **F-17** | Required Monthly | F-15 × 30.4375 |
| **F-18** | Current Pace (daily) | Σ contributions in the last 30 days ÷ min(30, goal age in days, ≥1) |
| **F-19** | Status | See 6.4 |
| **F-20** | Projected Completion | If F-18 > 0: Today + ceil(F-12 ÷ F-18) days. Else "No recent contributions". |
| **F-21** | Contributor Share (couple) | Σ contributor's goal_amount ÷ F-11 × 100 |

### 6.4 Goal status (F-19) (p.12)

The PRD asks to compare actual contribution pace with required pace using
configurable thresholds. The status uses the **expected-balance method**, which
compares actual progress against a straight-line plan from creation to target
date:

```
elapsed    = max(Today - CreatedDate, 0)        -- days
total      = max(TargetDate - CreatedDate, 1)   -- days
expected   = Target * min(elapsed / total, 1)
pace_ratio = expected == 0 ? 1 : Balance / expected

if Balance >= Target                            -> COMPLETED
else if Today > TargetDate                      -> BEHIND   (overdue)
else if pace_ratio >= ON_TRACK_MIN  (0.95)      -> ON_TRACK
else if pace_ratio >= AT_RISK_MIN   (0.75)      -> AT_RISK
else                                            -> BEHIND
```

- Thresholds `ON_TRACK_MIN` and `AT_RISK_MIN` live in the `app_config` table, so they are configurable without a deploy.
- A brand-new goal has expected = 0 and is On Track, so users are not told they are behind on day one.
- Status is always shown as text + icon, never colour alone.

### 6.5 Worked example (reference dataset) (p.12–13)

| Input / output | Value |
|---|---|
| Income (month) | $1,200.00 |
| Expenses (month) | $570.00 |
| Recorded savings (month) | $300.00 |
| Net cash flow (F-05) | $630.00 |
| Remaining cash flow (F-04) | **$330.00** |
| Savings rate (F-06) | 25.0% |
| Avg daily spending on 17 Sep (F-07) | $570 ÷ 17 = $33.53 |
| Goal "New Laptop": target $1,200, balance $600, created 1 Jul, due 31 Dec | Progress 50.0%; remaining $600; 105 days left → required $5.71/day, $40.00/week, $173.93/month |
| Status check | elapsed 78 of 183 days → expected $511.48 → ratio 1.17 → **On Track** |

### 6.6 Currency formulas (p.13)

| ID | Name | Formula |
|---|---|---|
| **F-22** | Cross rate A→B on date d | rate(USD→B, d) ÷ rate(USD→A, d); A = B → 1 |
| **F-23** | Converted amount | round_half_away(amount_minor_A ÷ 10^expA × rate(A→B) × 10^expB) |
| **F-24** | Rate for date d | Latest stored rate with rate_date ≤ d. If none exists (before launch), earliest stored rate, flagged `fx_estimated = true`. |

---

## 7. Complete User Flows (p.14–16)

Each flow lists the happy path as a diagram, followed by branches. "Toast" means
a non-blocking confirmation message. Optimistic updates are applied immediately
and rolled back on failure.

### 7.1 First launch, registration and setup (p.14)

`Open app → Session check → Welcome / landing → Onboarding (max 3, skippable) → Create account → Verify email or phone → Choose base currency + timezone → Home (empty state)`

- Valid session found → skip to Home.
- Duplicate identifier → field error: "An account with these details already exists. Log in instead?" (no disclosure beyond that).
- Verification link expired → resend link screen.

### 7.2 Login and password reset (p.14)

`Login → Enter identifier + password → Submit → Home (or return URL)`

- Wrong credentials → "Email/phone or password is incorrect." Rate limited after 5 failures per 15 min.
- Forgot password → enter identifier → email link or SMS code → set new password → all other sessions revoked → Login.

### 7.3 Add income / add expense (p.14)

`Tap + (any main screen) → Choose Income or Expense → Amount (autofocus) + currency → Category → Date (default today) → Optional note → Save → Toast + totals update`

- Currency ≠ base → live preview "≈ $X.XX in USD at today's rate".
- Offline → saved to queue, row shows "Sync pending".
- Server error → form stays open with values preserved + Retry.

### 7.4 Edit or delete a transaction (p.15)

`Activity → Tap row → Transaction details → Edit → same form prefilled → Save → Summaries recalculate`

- Delete → dialog "Delete this expense? Your totals and insights will be recalculated." → Confirm → return to Activity → Toast with Undo (5 s, soft-delete).

### 7.5 Create individual goal (p.15)

`Goals → Create Goal → Type = Individual (default) → Name → Target amount + goal currency → Target date → Create → Goal Details (empty contributions)`

- Target ≤ 0 or date in past → inline error; Create stays disabled.

### 7.6 Create couple goal (p.15)

`Goals → Our Goals → Create Shared Goal → Validate active couple → Name, target, currency, date → Create → Goal Details → Partner notified by email`

- No active couple → Couple option disabled with text "Connect a partner to create shared goals" + Connect Partner link.

### 7.7 Add goal contribution (p.15)

`Goal Details → Add Contribution → Amount + currency (default goal currency) → Date → Optional note → Save → Progress + status update`

- Balance reaches target → Completed state with restrained celebration; partner emailed for couple goals.
- Contribution in other currency → preview "≈ €X in goal currency".

### 7.8 Invite and connect partner (p.16)

`Profile or Couple → Invite partner → Email or phone → Send → Invitee opens link → Register / log in → Accept → Couple active`

- Invitee already in a couple → "This person can't accept right now." Inviter sees invitation expire.
- Invitation expires after 7 days → Resend available.
- Inviter cancels → token invalidated immediately.
- Invitee declines → inviter sees "Declined".

### 7.9 End couple (p.16)

`Couple → End connection → Consequences dialog → Type partner's first name to confirm → Couple ended → Shared goals read-only`

### 7.10 Change base currency (p.16)

`Profile → Currency → Select new currency → Impact dialog → Confirm → Recalculation job → Totals refresh`

- During recalculation, dashboards show a banner "Updating your totals to EUR…" and use the previous values.

---

# PART B — ARCHITECTURE

## 8. Product Architecture (p.17–19)

### 8.1 Stack decision (p.17)

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js App Router, TypeScript strict, Node.js runtime | One codebase for UI and API; server components keep financial queries on the server; matches team skills. |
| API | Route Handlers under `/api/v1` (REST) | Implements the PRD endpoint list exactly; reusable by a later React Native client. |
| UI mutations (web) | Server Actions calling the same application services | Fewer round trips for forms; one service layer for both paths. |
| Database | Supabase Postgres | Relational model required by PRD §7; RLS enforces privacy at the data layer. |
| Auth | Supabase Auth via `@supabase/ssr` (HTTP-only cookies) | Hashing, sessions, refresh, reset built in. Satisfies "tokens not in plain application storage". |
| Data access | Supabase client (typed with generated types) + SQL functions for aggregates | Types generated from the schema; heavy sums done in Postgres, not JavaScript loops. |
| Validation | Zod schemas shared by forms and API | One definition of "valid" on client and server; server validation is authoritative. |
| Client state | TanStack Query (cache, optimistic updates, persistence to IndexedDB) | Instant-feeling interactions and offline reads. |
| Styling | Tailwind CSS with design tokens as CSS variables; Radix UI primitives for dialogs, sheets, menus | Accessible primitives; tokens map 1:1 to Section 18. |
| Charts | Recharts | Composable React charts; accessible text tables added alongside (Section 16). |
| PWA/offline | Serwist service worker + IndexedDB (idb) | Offline queue and installability. |
| Testing | Vitest, pgTAP (`supabase test db`), Playwright, axe-core, Lighthouse CI | Section 23. |

### 8.2 System context (p.18)

```
Browser / installed PWA
  React Server Components + Client Components, TanStack Query cache
  Service worker (Serwist), IndexedDB offline queue, Recharts
        │                                   ┌─ Future React Native app
        │                                   │    Consumes the same /api/v1
        ▼                                   │    (boards: React Native + Expo)
Next.js application (Node.js runtime)
  Presentation: app/ routes, layouts, server components
  Application layer: /api/v1 Route Handlers + Server Actions
  Zod validation · auth guard · rate limit · error mapper
  Calls @spendtogether/domain for every calculation
        │                                   ┌─ @spendtogether/domain
        │                                   │    Pure TypeScript, zero dependencies
        │                                   │    except decimal.js + date-fns-tz
        │                                   │    Formulas F-01…F-24, status, FX math
        ▼                                   │    100% unit-test coverage target
Supabase
  Postgres 15+ with Row-Level Security
  Auth (email/phone + password, reset, sessions)
  pg_cron schedules · Edge Function: fx-sync
  SQL views/functions for aggregates
        │
        └─ External services
             FX provider (daily rates)
             Email: Supabase SMTP → Resend
             SMS: Twilio (phone auth/invites)
             Sentry · product analytics
```

> Layering (PRD §12): presentation → API/application → domain → data access →
> relational database. Dependencies only point downward.

### 8.3 Repository structure (p.18)

```
spendtogether/                    pnpm workspaces + Turborepo
├─ apps/web/                      Next.js app
│  ├─ app/
│  │  ├─ (public)/                landing, onboarding, legal
│  │  ├─ (auth)/                  login, register, forgot-password, reset-password, verify
│  │  ├─ (setup)/setup/currency
│  │  ├─ (app)/                   authenticated shell: sidebar / bottom tabs
│  │  │  ├─ home/ activity/ insights/ goals/ couple/ profile/
│  │  │  └─ @modal/(.)add/[type]/ intercepted route: Add form as dialog/sheet
│  │  ├─ invite/[token]/          public invitation landing
│  │  └─ api/v1/                  Route Handlers (Section 10)
│  ├─ components/                 ui/ (primitives)  features/ (domain widgets)
│  ├─ server/                     services/, repositories/, auth.ts, errors.ts, rate-limit.ts
│  ├─ lib/                        query-client, offline-queue, format-money, i18n
│  └─ sw.ts                       service worker (Serwist)
├─ packages/domain/               pure formulas + tests (no Next/Supabase imports)
├─ packages/schemas/              Zod schemas + inferred types shared web/API
├─ packages/config/               eslint, tsconfig, tailwind tokens
└─ supabase/
   ├─ migrations/                 ordered SQL migrations (source of truth)
   ├─ functions/fx-sync/          Edge Function: daily exchange rates
   ├─ tests/                      pgTAP RLS + function tests
   └─ seed.sql                    currencies, default categories, app_config
```

### 8.4 Request lifecycle (example: add expense) (p.18)

1. Client validates with the shared Zod schema and applies an optimistic row + totals via TanStack Query.
2. `POST /api/v1/transactions` with an `Idempotency-Key` header (client-generated UUID).
3. Route Handler: resolve session from cookie → rate limit → validate body → call `TransactionService.create()`.
4. Service loads the user's base currency and the FX rate for the date, calls `domain.convert()`, writes the row through the user-scoped Supabase client (RLS active).
5. Response returns the stored transaction; client invalidates `summary`, `insights`, `activity` query keys for affected periods.

### 8.5 Rendering strategy (p.19)

| Surface | Rendering | Caching |
|---|---|---|
| Landing, onboarding, legal | Static (SSG) | CDN |
| App shell (nav, header) | Server component, per-request | No shared cache (personal data) |
| Home, Insights, Goals | Server component for first paint with streamed Suspense sections; client hydration takes over with TanStack Query | Query staleTime 30 s; revalidated on focus and after mutations |
| Forms (add/edit) | Client components | n/a |
| Invitation landing | Server component; token verified server-side | No cache |

> **Rule.** The service-role Supabase key is used ONLY in server-side jobs
> (fx-sync, base-currency recalculation, invitation acceptance function). All
> user-initiated reads and writes go through the user-scoped client so RLS
> always applies.

---

## 9. Database & Schema (p.20–24)

Postgres on Supabase. Migrations in `supabase/migrations` are the single source
of truth; TypeScript types are generated from them in CI. The model follows PRD
§7 with three extensions: currency fields (approved scope exception), soft
delete for Undo (design spec §13), and supporting tables for FX rates,
idempotency and configuration.

### 9.1 Entity overview (p.20)

| Entity | PRD purpose | Key fields (this spec) |
|---|---|---|
| `profiles` | Account owner ("users") | id, name, email, phone, base_currency, timezone, timestamps |
| `couples` | Couple relationship | id, status (pending/active/ended), ended_at |
| `couple_members` | Connects two users | couple_id, user_id, joined_at, left_at |
| `couple_invitations` | Invitation lifecycle | couple_id, inviter_id, invitee, token_hash, status, expires_at |
| `categories` | Income/expense categories | user_id (nullable), name, type, icon, color, is_default, archived_at |
| `transactions` | Income and expenses | user_id, type, amount_minor, currency, fx_rate, base_amount_minor, category_id, transaction_date, note |
| `savings_goals` | Individual/couple targets | type, owner_user_id or couple_id, name, target_amount_minor, currency, target_date, completed_at |
| `goal_contributions` | Goal funding history | goal_id, user_id, amount_minor, currency, goal_amount_minor, contributor_base_amount_minor, contribution_date |
| `exchange_rates` | (multi-currency) | rate_date, quote, rate (USD base) |
| `currencies` | (multi-currency) | code, name, symbol, exponent |
| `idempotency_keys` / `app_config` | (infrastructure) | offline-safe retries; thresholds and settings |

### 9.2 Entity-relationship diagram (p.21)

```
categories                transactions              profiles
  id PK                     id PK                     id PK (= auth.users.id)
  user_id FK → profiles     user_id FK → profiles     name, email, phone
  type, name, icon          category_id FK            base_currency FK
  is_default, archived_at   amount_minor, currency    timezone
                            fx_rate, base_amount_minor
                            transaction_date, note

savings_goals             goal_contributions        couples
  id PK                     goal_id FK                id PK
  owner_user_id FK?         user_id FK → profiles     status, ended_at
  couple_id FK?             goal_amount_minor
  currency, target_amount   contributor_base_amount  couple_members
  target_date, completed_at                            couple_id FK
                                                       user_id FK → profiles
currencies                exchange_rates               joined_at, left_at
  code PK                   rate_date + quote PK
  exponent, symbol          rate (USD base)          couple_invitations
                                                       couple_id FK
                                                       inviter_id FK
                                                       token_hash, status
                                                       expires_at
```

> Dots mark relationship ends. All currency columns (profiles, transactions,
> goals, contributions) reference `currencies.code`; lines omitted for clarity.

### 9.3 DDL (p.21–23)

```sql
-- 0001_core.sql  (abridged: comments, triggers for updated_at omitted)
create extension if not exists pgcrypto;

create table currencies (
  code       char(3) primary key,            -- ISO 4217
  name       text not null,
  symbol     text not null,
  exponent   smallint not null check (exponent between 0 and 4),
  is_active  boolean not null default true
);

create table profiles (                      -- 1:1 with auth.users (PRD "users")
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  email         citext unique,
  phone         text unique,                 -- E.164
  base_currency char(3) not null references currencies(code),
  timezone      text not null default 'UTC',    -- IANA
  notify_email  jsonb not null default '{"invite_accepted":true,"goal_completed":true}',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (email is not null or phone is not null)
);  -- password_hash lives in auth.users (Supabase Auth, bcrypt)

create type couple_status as enum ('pending','active','ended');
create table couples (
  id         uuid primary key default gen_random_uuid(),
  status     couple_status not null default 'pending',
  created_at timestamptz not null default now(),
  ended_at   timestamptz,
  updated_at timestamptz not null default now()
);

create table couple_members (
  id        uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at   timestamptz,
  unique (couple_id, user_id)
);
-- BR-06: at most one open membership per user
create unique index one_open_couple_per_user on couple_members(user_id) where left_at is null;

create type invitation_status as enum ('pending','accepted','declined','cancelled','expired');
create table couple_invitations (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade,
  inviter_id   uuid not null references profiles(id) on delete cascade,
  invitee      text not null,                -- normalised email or E.164 phone
  invitee_kind text not null check (invitee_kind in ('email','phone')),
  token_hash   text not null unique,         -- sha256 of token; raw token only in the link
  status       invitation_status not null default 'pending',
  expires_at   timestamptz not null default now() + interval '7 days',
  responded_at timestamptz,
  created_at   timestamptz not null default now()
);
create unique index one_pending_invite_per_couple on couple_invitations(couple_id) where status = 'pending';

create type category_type as enum ('income','expense');
create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,  -- null = default/system
  name        text not null check (char_length(name) between 1 and 40),
  type        category_type not null,
  icon        text not null,                 -- lucide icon key
  color       text not null,                 -- chart token key, e.g. 'cat-food'
  is_default  boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  check ((is_default and user_id is null) or (not is_default and user_id is not null))
);
create unique index categories_unique_name on categories(coalesce(user_id,'00000000-0000-0000-0000-000000000000'), type, lower(name));

create type transaction_type as enum ('income','expense');
create table transactions (
  id                uuid primary key default gen_random_uuid(),  -- client may supply (offline)
  user_id           uuid not null references profiles(id) on delete cascade,
  type              transaction_type not null,
  amount_minor      bigint not null check (amount_minor > 0),
  currency          char(3) not null references currencies(code),
  fx_rate           numeric(24,10) not null check (fx_rate > 0),  -- currency -> base
  fx_rate_date      date not null,
  fx_estimated      boolean not null default false,
  base_currency     char(3) not null references currencies(code),
  base_amount_minor bigint not null check (base_amount_minor > 0),
  category_id       uuid not null references categories(id),
  transaction_date  date not null,
  note              text check (char_length(note) <= 280),
  deleted_at        timestamptz,                                 -- soft delete for Undo
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index tx_user_date      on transactions(user_id, transaction_date desc) where deleted_at is null;
create index tx_user_type_date on transactions(user_id, type, transaction_date) where deleted_at is null;
create index tx_user_cat       on transactions(user_id, category_id) where deleted_at is null;

create type goal_type as enum ('individual','couple');
create table savings_goals (
  id                  uuid primary key default gen_random_uuid(),
  type                goal_type not null,
  owner_user_id       uuid references profiles(id) on delete cascade,
  couple_id           uuid references couples(id) on delete cascade,
  created_by          uuid not null references profiles(id),
  name                text not null check (char_length(name) between 1 and 60),
  icon                text not null default 'target',
  target_amount_minor bigint not null check (target_amount_minor > 0),
  currency            char(3) not null references currencies(code),   -- BR-15, immutable
  target_date         date not null,
  completed_at        timestamptz,
  archived_at         timestamptz,                                    -- set when couple ends
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check ((type='individual' and owner_user_id is not null and couple_id is null)
      or (type='couple'     and couple_id     is not null and owner_user_id is null))
);

create table goal_contributions (
  id                            uuid primary key default gen_random_uuid(),
  goal_id                       uuid not null references savings_goals(id) on delete cascade,
  user_id                       uuid not null references profiles(id),   -- contributor
  amount_minor                  bigint not null check (amount_minor > 0),
  currency                      char(3) not null references currencies(code),
  goal_fx_rate                  numeric(24,10) not null,
  goal_amount_minor             bigint not null check (goal_amount_minor > 0),
  contributor_base_currency     char(3) not null references currencies(code),
  contributor_fx_rate           numeric(24,10) not null,
  contributor_base_amount_minor bigint not null check (contributor_base_amount_minor > 0),
  fx_rate_date                  date not null,
  fx_estimated                  boolean not null default false,
  contribution_date             date not null,
  note                          text check (char_length(note) <= 280),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);
create index contrib_goal_date on goal_contributions(goal_id, contribution_date desc);
create index contrib_user_date on goal_contributions(user_id, contribution_date);

create table exchange_rates (                 -- USD-based daily snapshot
  rate_date  date not null,
  quote      char(3) not null references currencies(code),
  rate       numeric(24,10) not null check (rate > 0),   -- 1 USD = rate QUOTE
  source     text not null,
  fetched_at timestamptz not null default now(),
  primary key (rate_date, quote)
);

create table idempotency_keys (
  key        uuid not null,
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null,
  response   jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);  -- purged after 48 h by pg_cron

create table app_config (
  key   text primary key,
  value jsonb not null
);  -- goal_status_thresholds, fx_provider, invite_ttl_days ...
```

### 9.4 Derived views and functions (p.23–24)

| Object | Type | Purpose |
|---|---|---|
| `goal_balances` | view (security_invoker) | goal_id, balance_minor = Σ goal_amount_minor, contribution_count, last_contribution_date. Never stored (BR-08). |
| `period_summary(p_start, p_end)` | SQL function, security invoker | Returns income, expenses, recorded savings for `auth.uid()` in base currency. Used by Home and Insights. |
| `category_breakdown(p_start, p_end)` | SQL function | Expense totals per category for the period. |
| `spending_series(p_start, p_end, p_bucket)` | SQL function | Bucketed income/expense series for charts (day/week/month). |
| `accept_invitation(p_token)` | SQL function, security definer | Atomic: verify token hash, expiry, invitee identity match, no open couple for invitee; insert member; set couple active; mark invitation accepted. |
| `end_couple()` | SQL function, security definer | Set couple ended, left_at for both members, archived_at on couple goals. |
| `sync_goal_completion()` | trigger on `goal_contributions` | Sets/clears `savings_goals.completed_at` when balance crosses target (BR-11). |
| `recalc_base_amounts(p_user)` | SQL function (job) | Recomputes `base_amount_minor` and `contributor_base_amount_minor` after base-currency change. |

### 9.5 Row-Level Security policy matrix (p.24)

RLS is enabled on every table. Helper: `is_couple_member(c uuid)` returns true
when `auth.uid()` has an open or ended membership in couple `c` (ended members
keep read access to history, BR-18).

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | own row; partner's *name only* via view `partner_profile` | via auth trigger | own row | not permitted from client |
| `transactions` | user_id = auth.uid() | user_id = auth.uid() | own rows | own rows |
| `categories` | user_id is null OR own | own (is_default = false) | own custom | denied (archive instead) |
| `savings_goals` | own individual; couple goals where `is_couple_member` | own individual; couple goal only if couple active | individual: owner; couple: creator, and couple active | same as update |
| `goal_contributions` | goal visible to user | goal visible, couple active (if couple goal), user_id = auth.uid() | own rows, goal not archived | own rows, goal not archived |
| `couples` / `couple_members` | own couple | via functions only | via functions only | via `end_couple()` only |
| `couple_invitations` | inviter = auth.uid() | inviter, via service | inviter (cancel) | denied |
| `exchange_rates`, `currencies` | all authenticated | service role | service role | service role |

> **Rule.** AC12 is enforced here: there is no policy anywhere that lets a
> partner read another user's transactions, individual goals or profile
> financial fields. pgTAP tests in Section 23 assert this for every table.

---

## 10. API Architecture (p.25–27)

### 10.1 Conventions (p.25)

| Aspect | Rule |
|---|---|
| Base path | `/api/v1` — versioned; breaking changes create `/api/v2`. |
| Format | JSON, UTF-8. Field names snake_case. Dates ISO 8601 (date: `YYYY-MM-DD`; timestamps UTC with `Z`). |
| Money | Objects: `{"amount_minor": 1250, "currency": "USD", "formatted": "$12.50"}`. Clients never parse `formatted`. |
| Auth | Web: Supabase session cookie (HTTP-only, Secure, SameSite=Lax). Native clients: `Authorization: Bearer <access_token>`. Both resolved by one `getSession()` guard. |
| CSRF | Mutating routes require same-origin (Origin header check) for cookie sessions. |
| Idempotency | POST creating transactions/contributions accepts `Idempotency-Key` (UUID). Replays within 48 h return the original response. |
| Pagination | Cursor-based: `?limit=50&cursor=<opaque>`. Response: `{data:[], next_cursor}`. |
| Rate limits | Auth routes: 5 attempts / 15 min / identifier + 20 / 15 min / IP. Other writes: 60 / min / user. 429 with `Retry-After`. |
| Errors | Consistent envelope (10.2). No stack traces or SQL in responses. |
| Authorization | Enforced twice: application guard + RLS. A missing or foreign resource returns **404** (not 403) to avoid existence leaks. |

### 10.2 Error envelope (p.25)

```json
HTTP 422
{
  "error": {
    "code": "VALIDATION_FAILED",              // stable, machine-readable
    "message": "Some fields need attention.",
    "fields": { "amount": "Enter an amount greater than 0." },
    "request_id": "req_01J9..."
  }
}
```

**Codes:**
`VALIDATION_FAILED` 422 | `UNAUTHENTICATED` 401 | `NOT_FOUND` 404 | `CONFLICT` 409 |
`COUPLE_REQUIRED` 409 | `GOAL_ARCHIVED` 409 | `RATE_LIMITED` 429 | `FX_UNAVAILABLE` 503 | `INTERNAL` 500

### 10.3 Endpoint catalogue — PRD §10 (p.25–26)

| Method & path | Purpose | Notes |
|---|---|---|
| `POST /auth/register` | Create account | `{name, email\|phone, password}`. 409 CONFLICT on duplicate (generic message). |
| `POST /auth/login` | Start session | Sets cookies (web) or returns tokens (native). |
| `POST /auth/logout` | End session | Current device. |
| `POST /auth/refresh` | Refresh tokens | Native clients; web refresh handled by middleware. |
| `GET /transactions` | List own transactions | Filters: type, category_id, from, to, q, currency; cursor pagination. |
| `POST /transactions` | Create | `{type, amount_minor, currency, category_id, transaction_date, note?, id?}`. Server converts. |
| `GET /transactions/:id` | Detail | |
| `PATCH /transactions/:id` | Edit | Re-converts if amount, currency or date change. |
| `DELETE /transactions/:id` | Soft delete | Returns 200 `{undo_until}`. Purged after 30 days. |
| `GET /insights/daily \| weekly \| monthly` | Period insights | `?date=YYYY-MM-DD` anchors the period (default today). Includes previous-period block. |
| `GET /goals` | List | `?scope=mine\|ours\|all&include=completed` |
| `POST /goals` | Create | `{type, name, target_amount_minor, currency, target_date, icon?}`. 409 COUPLE_REQUIRED. |
| `GET /goals/:id` | Detail + computed metrics | balance, remaining, progress, required pace, current pace, projection, status, contributor breakdown. |
| `PATCH /goals/:id` | Edit name, target, date, icon | Currency immutable (BR-15). |
| `DELETE /goals/:id` | Delete goal and its contributions | Couple goal: creator only. |
| `POST /goals/:id/contributions` | Add contribution | Idempotent. 409 GOAL_ARCHIVED after couple ended. |
| `GET /goals/:id/contributions` | History | Contributor name + amounts in original and goal currency. |
| `GET /couple` | Couple state | `{status, partner:{name}, invitation?, shared_goal_count}` |
| `POST /couple/invite` | Invite | `{invitee: email\|phone}`. Creates pending couple if none. |
| `POST /couple/invitations/:id/accept` | Accept | Body `{token}`. Calls `accept_invitation()`. |
| `DELETE /couple` | End couple | BR-18. |

### 10.4 Implementation endpoints (required by screens listed in the PRD) (p.26)

| Method & path | Required by |
|---|---|
| `GET / PATCH /me` | Profile screen; "set default currency" step of the auth flow; timezone. |
| `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify` | Forgot Password screen (design spec §3, §7). |
| `GET / POST /categories`, `PATCH /categories/:id` | Profile → Categories (PRD §9) and category pickers. |
| `GET /activity` | Activity screen "Savings Contributions" filter: merged feed of own transactions + own contributions. |
| `GET /home/summary?period=today\|week\|month` | Home dashboard in one round trip (performance target). |
| `GET /currencies`, `GET /exchange-rates?date=` | Currency pickers; client-side conversion preview and offline estimates. |
| `PATCH /goals/:id/contributions/:cid`, `DELETE …/:cid` | FR-15 (correcting mistaken contributions). |
| `POST /couple/invitations/:id/cancel \| resend \| decline` | Couple screen invitation states (design spec §19). |
| `GET /invitations/by-token/:token` | Public invitation landing page (inviter first name only). |

### 10.5 Example: goal detail response (p.27)

```json
GET /api/v1/goals/6b1e…
{
  "id": "6b1e…", "type": "individual", "name": "New Laptop", "icon": "laptop",
  "currency": "USD",
  "target":    { "amount_minor": 120000, "currency": "USD", "formatted": "$1,200.00" },
  "balance":   { "amount_minor": 60000,  "currency": "USD", "formatted": "$600.00" },
  "remaining": { "amount_minor": 60000,  "currency": "USD", "formatted": "$600.00" },
  "progress_pct": 50.0,
  "target_date": "2026-12-31", "days_remaining": 105,
  "required_pace": { "daily": 571, "weekly": 4000, "monthly": 17393, "overdue": false },
  "current_pace_daily": 769,
  "projected_completion_date": "2026-12-05",
  "status": "on_track",
  "contributors": null,
  "completed_at": null, "archived_at": null
}
```

---

## 11. Multi-Currency Architecture (p.28–29)

Approved scope exception. Design goal: users enter money in whatever currency
they actually received or spent, and every total they see is in one currency
they chose, with numbers that never silently change.

### 11.1 Rate source and sync (p.28)

| Item | Specification |
|---|---|
| Primary provider | ExchangeRate-API Open Access endpoint (daily, no key, attribution required). Attribution link shown in Settings → Currency and in the site footer. |
| Fallback provider | fxfeed.io free tier (API key). Used automatically if the primary fails or omits a currency. |
| Pre-build check | Before launch, confirm every currency in the seed list (including LRD) is returned by the chosen provider. Any currency without a rate is set `is_active = false`. |
| Schedule | pg_cron at 01:00 UTC daily invokes Edge Function `fx-sync`: fetch USD-based rates → upsert `exchange_rates` for today. Retries at 01:30 and 03:00 on failure. |
| Provider abstraction | `interface FxProvider { latest(): Promise<Record<Code, Decimal>> }` — swapping providers is a config change in `app_config.fx_provider`. |
| Staleness | If no rate stored in 72 h, admin alert (Sentry). Users see "Rates last updated …" in the currency preview. |

### 11.2 Conversion rules (p.28)

| Event | What is converted | Rate used |
|---|---|---|
| Create/edit transaction | amount → user base currency (`base_amount_minor`) | Rate for `transaction_date` (F-24) |
| Create/edit contribution | amount → goal currency (`goal_amount_minor`) and → contributor's base (`contributor_base_amount_minor`) | Rate for `contribution_date` |
| Display partner contributions | Nothing: shown in goal currency and original currency | Stored values |
| Base currency change | All of the user's `base_amount_minor` and `contributor_base_amount_minor` | Each record re-converted from its original amount at the rate of its own date (not today's) |
| Offline entry | Client shows estimate from cached rates; server performs authoritative conversion on sync | Rate for record date |

### 11.3 Base currency change (p.28)

1. User selects a new currency; dialog explains: "All your totals will be shown in EUR. Past entries are converted at the rate from their own dates. Your original amounts are kept."
2. `PATCH /me` sets `base_currency` and enqueues `recalc_base_amounts(user)` (runs in one transaction; target < 5 s for 10,000 records).
3. While running, API responses carry `recalculating: true`; UI shows a banner and keeps prior values.
4. Goal currencies are not changed (BR-15).

### 11.4 Display rules (p.28–29)

- Amounts are formatted with `Intl.NumberFormat` using the user's locale and the currency code; symbols alone are ambiguous ($ is USD and LRD), so non-base amounts always show the ISO code: **L$ 5,000.00 LRD / $26.40**.
- Rows entered in a non-base currency show the original amount on the first line and "≈ base amount" underneath in secondary text.
- `fx_estimated` records show an info icon: "Converted using the closest available rate."
- Totals are always in base currency and labelled with the code once per card header (e.g. "This month · USD").

---

# PART C — EXPERIENCE

## 12. Web Information Architecture (p.30–31)

### 12.1 Sitemap and routes (p.30)

| Route | Screen | Access | Notes |
|---|---|---|---|
| `/` | Welcome / landing | Public | Redirects to `/home` when a valid session exists. |
| `/onboarding` | Onboarding (3 pages) | Public | Shown once per device (flag in localStorage — not sensitive). Skippable. |
| `/register` · `/login` | Register · Login | Guest only | `?next=` return URL (same-origin only). |
| `/forgot-password` · `/reset-password` · `/verify` | Password reset · verification | Guest | Tokens from email/SMS. |
| `/setup/currency` | Base currency + timezone | Auth, not onboarded | Required once before `/home`. |
| `/home?period=today\|week\|month` | Home dashboard | Auth | Default period: month. |
| `/add/income` · `/add/expense` | Add forms | Auth | Rendered as dialog (desktop) / full sheet (mobile) via intercepted route; direct URL renders full page. |
| `/activity?type=&category=&from=&to=&q=` | Activity | Auth | Filters live in the URL (shareable, back-button safe). |
| `/activity/[id]` · `/activity/[id]/edit` | Transaction details · edit | Auth | Desktop: side panel; mobile: pushed page. |
| `/insights?period=daily\|weekly\|monthly&date=` | Insights | Auth | |
| `/goals?tab=mine\|ours` | Goals | Auth | |
| `/goals/new?type=individual\|couple` | Create goal | Auth | |
| `/goals/[id]` · `/goals/[id]/edit` · `/goals/[id]/contribute` | Goal details · edit · add contribution | Auth / couple member | |
| `/couple` | Couple | Auth | |
| `/invite/[token]` | Invitation landing | Public | Shows inviter first name; routes to register/login, then accept. |
| `/profile` · `/profile/categories` · `/profile/currency` · `/profile/notifications` · `/profile/security` | Profile & settings | Auth | |
| `/offline` | Offline fallback | Public | Served by service worker when an uncached route is requested offline. |

### 12.2 Navigation model (p.30–31)

| Viewport | Primary navigation | Global Add | Detail views |
|---|---|---|---|
| < 768 px (mobile) | Bottom tab bar: Home, Activity, Goals, Insights, Profile | Floating action button bottom-right, 16 px above tab bar → bottom sheet with Income / Expense / Savings contribution | Pushed pages with back button; forms as full-height sheets |
| 768–1023 px (tablet) | Left icon rail (72 px) with tooltips + labels on focus | "+" button at top of rail | Pushed pages; forms as centred dialogs (max 480 px) |
| ≥ 1024 px (desktop) | Left sidebar (240 px) with labels, user card at bottom | Primary "Add" button at top of sidebar; keyboard shortcut `N` | Activity uses list + details split view; forms as dialogs |

- The Add sheet offers **Add income**, **Add expense**, **Add savings contribution** (the last opens a goal picker, then the contribution form). Reachable from every main tab (design spec §9).
- Browser back/forward MUST work for every navigation, including opening and closing dialogs (intercepted routes handle this).
- Keyboard shortcuts (desktop): `N` = new transaction, `/` = focus search on Activity, `G` then `H`/`A`/`G`/`I`/`P` = go to section. Listed in a "?" help dialog; all shortcuts can be disabled in Profile.

---

## 13. Screen Specifications (p.32–35)

Every screen below also inherits the global loading, empty, error and offline
rules in Section 19 and the accessibility rules in Section 20. Wireframes for the
key screens follow in Section 15.

### SCR-01 Splash / session restore (any)

| | |
|---|---|
| Purpose | Restore session before rendering app routes. |
| Content (top → bottom) | Brand mark centred; thin progress indicator after 400 ms. |
| Interactions & states | Valid session → `/home` (or setup if not onboarded). No session → Welcome. Network failure → "Can't reach SpendTogether" + Retry; never a dead end. |

### SCR-02 Welcome `/`

| | |
|---|---|
| Purpose | Communicate the value proposition and route to account creation. |
| Content (top → bottom) | Brand, tagline, illustration, three-line promise, Create account (primary), Log in (secondary). Desktop: split layout, illustration right. |
| Interactions & states | Create account → `/register`; Log in → `/login`. |

### SCR-03 Onboarding `/onboarding`

| | |
|---|---|
| Purpose | Explain the three core ideas in ≤ 3 pages. |
| Content (top → bottom) | Pager: 1) Track income and expenses 2) Understand daily/weekly/monthly patterns 3) Save alone or together. Illustration, headline, one sentence, dots, Skip, Next / Get started. |
| Interactions & states | Swipe or arrow keys between pages. Skip → `/register`. |

### SCR-04 Register `/register`

| | |
|---|---|
| Purpose | Create an account. |
| Content (top → bottom) | Back, title, Name, Email or phone (auto-detects format), Password (show/hide, strength hint: min 10 chars), Confirm password, Create account, link to Log in. |
| Interactions & states | Validation after blur. Submit disabled + inline spinner while pending. Duplicate → generic conflict message with Log in link. |

### SCR-05 Login `/login`

| | |
|---|---|
| Purpose | Authenticate. |
| Content (top → bottom) | Identifier, Password (show/hide), Forgot password link, Log in, link to Register. |
| Interactions & states | Auth error shown above the button; does not reveal which field was wrong. After 5 failures: "Too many attempts. Try again in 15 minutes." |

### SCR-06 Forgot / reset password `/forgot-password`, `/reset-password`

| | |
|---|---|
| Purpose | Recover access. |
| Content (top → bottom) | Step 1: identifier → "If an account exists, we've sent instructions." Step 2: new password + confirm. |
| Interactions & states | Always the same confirmation message (no account enumeration). On success all other sessions are revoked. |

### SCR-07 Currency setup `/setup/currency`

| | |
|---|---|
| Purpose | Choose base currency and confirm timezone. |
| Content (top → bottom) | Explanation, searchable currency list (code, name), pre-selected from locale, detected timezone with Change link, Continue. |
| Interactions & states | Continue → `PATCH /me` → `/home` (empty state). |

### SCR-08 Home dashboard `/home`

| | |
|---|---|
| Purpose | Show the current period's financial position without requiring a chart. |
| Content (top → bottom) | Greeting + date + base currency; period selector (Today / This week / This month); hero card "Remaining this [period]" with Income, Expenses, Saved, Savings rate; net cash flow line; spending preview (top 5 categories with amount, %, bar); active goals preview (max 3); recent activity (desktop, 5 rows); quick add. |
| Interactions & states | Tap category → `/activity` filtered by category and period. Tap goal → goal details. Tap metric → `/insights` for that period. |

### SCR-09 Add sheet (overlay)

| | |
|---|---|
| Purpose | Choose what to add. |
| Content (top → bottom) | Three rows, each icon + title + one-line explanation: Income ("Money you received"), Expense ("Money you spent"), Savings contribution ("Money you put toward a goal"). |
| Interactions & states | Selecting opens the matching form. Esc / swipe down / backdrop click closes. |

### SCR-10 Add income `/add/income`

| | |
|---|---|
| Purpose | Record income fast. |
| Content (top → bottom) | Header, Amount (dominant, numeric keypad, autofocus), currency chip (default base), conversion preview if non-base, Category (bottom sheet picker, searchable), Date (default today), Note (optional, 280 chars), Save income. |
| Interactions & states | Save disabled until amount > 0 and category chosen. Success: close, toast "Income added", optimistic totals. Failure: values kept, error + Retry. |

### SCR-11 Add expense `/add/expense`

| | |
|---|---|
| Purpose | Record an expense fast. |
| Content (top → bottom) | Identical structure to SCR-10 for muscle memory; recent categories (last 5 used) at the top of the picker. |
| Interactions & states | Same as SCR-10. No celebratory motion (design spec §22). |

### SCR-12 Activity `/activity`

| | |
|---|---|
| Purpose | Find, open, edit and delete records. |
| Content (top → bottom) | Title, search, filter chips (All, Income, Expense, Savings contributions, Category, Date range), date-grouped list. Row: category icon, title (category or goal name), note, signed amount with +/− and type icon; non-base rows show "≈ base". |
| Interactions & states | Row → details (split panel on desktop). Infinite scroll (50 per page). Clear filters in empty result. |

### SCR-13 Transaction details / edit / delete `/activity/[id]`

| | |
|---|---|
| Purpose | Inspect and change one record. |
| Content (top → bottom) | Type and amount (original + converted with rate and date), category, date, note, Edit, Delete. Edit reuses the Add form. |
| Interactions & states | Delete → confirmation dialog stating summaries will be recalculated → toast with Undo (5 s). |

### SCR-14 Insights `/insights`

| | |
|---|---|
| Purpose | Explain patterns by day, week and month. |
| Content (top → bottom) | Period control (Daily / Weekly / Monthly) + date stepper (‹ September 2026 ›); 4 metric cards with previous-period change; spending trend; income vs expenses; category breakdown; savings rate; average daily spending. |
| Interactions & states | Changing period refreshes every card consistently. Category → filtered Activity. Each chart has "View as table". |

### SCR-15 Goals `/goals`

| | |
|---|---|
| Purpose | Show progress on all goals. |
| Content (top → bottom) | Segment My goals / Our goals; goal cards (icon, name, saved of target, progress bar, %, target date, status chip with icon + text); Completed goals collapsed section; Create goal. |
| Interactions & states | Our goals with no partner → empty state + Connect partner. Partner but no goals → Create shared goal. |

### SCR-16 Create / edit goal `/goals/new`

| | |
|---|---|
| Purpose | Define a target. |
| Content (top → bottom) | Goal type (Individual default / Couple — disabled with explanation if no active couple), name, icon picker, target amount + currency, target date, Create goal. |
| Interactions & states | Target > 0, date ≥ today. Success → goal details with empty contribution state (no forced contribution). |

### SCR-17 Goal details `/goals/[id]`

| | |
|---|---|
| Purpose | Make progress and required effort obvious. |
| Content (top → bottom) | Hero: name, saved, target, progress bar, %; remaining; required pace (per day/week/month); status card with plain-language sentence; projected completion; contributor breakdown (couple); contribution history; persistent Add contribution button (sticky on mobile). |
| Interactions & states | Zero contributions: $0 saved, remaining, required pace, Add contribution. Archived (couple ended): banner, no add button. |

### SCR-18 Add contribution `/goals/[id]/contribute`

| | |
|---|---|
| Purpose | Fund a goal. |
| Content (top → bottom) | Goal context (name, saved of target), Amount + currency (default goal currency), conversion preview, Date, Note, "After this" preview, Add contribution. |
| Interactions & states | Target reached → completion state: restrained confetti (≤ 1.2 s, off with reduced motion), status Completed, haptic on supported devices. |

### SCR-19 Couple `/couple`

| | |
|---|---|
| Purpose | Manage the partner connection. |
| Content (top → bottom) | States: No partner (explanation + Invite partner); Pending (destination, expiry, Resend, Cancel); Connected (partner name, since date, shared goals preview, Create shared goal, End connection). |
| Interactions & states | Never displays partner income, expenses, balances or individual goals. |

### SCR-20 Invitation landing `/invite/[token]`

| | |
|---|---|
| Purpose | Let the invitee join. |
| Content (top → bottom) | "Alex invited you to save together on SpendTogether." Privacy explanation. Accept / Decline (if logged in) or Create account / Log in. |
| Interactions & states | Invalid/expired token → explanation + ask inviter to resend. Invitee already in a couple → cannot accept, with reason. |

### SCR-21 Profile & settings `/profile`

| | |
|---|---|
| Purpose | Manage account and preferences. |
| Content (top → bottom) | Profile summary; Preferences: base currency, timezone, categories, notifications; Couple settings; Security: change password; Log out. |
| Interactions & states | Base currency change → impact dialog (Section 11.3). Destructive actions confirmed with consequences. |

### SCR-22 Categories `/profile/categories`

| | |
|---|---|
| Purpose | Manage custom categories. |
| Content (top → bottom) | Tabs Expense / Income; default categories (locked icon); custom categories with icon, name, Edit, Archive; Add category. |
| Interactions & states | Archiving hides from pickers; history keeps the category. |

---

## 14. UI Component Hierarchy (p.36–37)

### 14.1 Application tree (p.36)

```
<RootLayout>                          html lang, fonts, theme tokens, <Toaster/>
 ├─ <Providers>                       QueryClientProvider · SessionProvider · OfflineProvider
 │   ├─ (public) <PublicLayout>       Welcome · Onboarding · Invite landing
 │   ├─ (auth)   <AuthLayout>         centred card, back link
 │   └─ (app)    <AppShell>
 │       ├─ <SkipLink/>
 │       ├─ <Sidebar/> | <IconRail/> | <BottomTabBar/>     (by breakpoint)
 │       ├─ <AddButton/> → <AddSheet/>                     global add
 │       ├─ <OfflineSyncIndicator/>                        header chip
 │       ├─ <RecalculatingBanner/>                         base-currency change
 │       ├─ <main id="content"> {page} </main>
 │       ├─ {@modal slot}  <Dialog|Sheet> <TransactionForm/> | <ContributionForm/>
 │       └─ <ConfirmationDialog/>                          imperative, one instance
```

### 14.2 Screen compositions (p.36)

```
HomePage
 ├─ <PageHeader greeting date currency> <PeriodSelector/>
 ├─ <SummaryHeroCard> <SummaryMetric/> ×4  <NetCashFlowLine/>
 ├─ <SpendingPreview> <CategoryRow/> ×≤5  <ViewAllLink/>
 ├─ <GoalsPreview> <GoalCard compact/> ×≤3
 └─ <RecentActivity> <TransactionRow/> ×5            (≥1024 px only)

ActivityPage
 ├─ <PageHeader/> <SearchInput/> <FilterChipGroup/> <DateRangePicker/>
 ├─ <SectionList> <DateSectionHeader/> <TransactionRow/>…  <InfiniteLoader/>
 └─ <DetailPanel> <TransactionDetails/>              (≥1024 px split view)

InsightsPage
 ├─ <PeriodControl/> <DateStepper/>
 ├─ <MetricCard/> ×4 (value + <DeltaChip/>)
 ├─ <ChartContainer title> <SpendingTrendChart/> <DataTableToggle/>
 ├─ <ChartContainer> <IncomeExpenseChart/>
 ├─ <ChartContainer> <CategoryDonut/> <CategoryLegendList/>
 └─ <MetricCard savings-rate/> <MetricCard avg-daily/>

GoalDetailsPage
 ├─ <GoalHero> <ProgressBar/> <MoneyText/>
 ├─ <PaceCard/> <StatusCard/> <ProjectionText/>
 ├─ <ContributorBreakdown/>                          couple only
 ├─ <ContributionList> <ContributionRow/>…
 └─ <StickyActionBar> <PrimaryButton>Add contribution</PrimaryButton>
```

### 14.3 Shared component catalogue (p.36–37)

| Component | Key props | Behaviour / rules |
|---|---|---|
| `Button` | variant: primary \| secondary \| tertiary \| destructive \| ghost; size: sm \| md \| lg; loading; iconLeft | Min height 44 px (md). Loading keeps width, shows spinner, sets `aria-busy`. |
| `IconButton` | icon, label (required) | label becomes `aria-label` and tooltip. |
| `Input` / `Textarea` | label, hint, error, maxLength | Label always visible; error linked via `aria-describedby`; 16 px text (prevents iOS zoom). |
| `AmountInput` | value (minor), currency, onCurrencyChange, previewBase? | Locale-aware decimal entry, currency exponent respected, `inputmode="decimal"`, shows ≈ conversion line. |
| `CurrencyPicker` | value, recent[] | Searchable list; recent + base pinned on top. |
| `CategoryPicker` | type, value, recent[] | Sheet on mobile, popover on desktop; icon + name; search. |
| `DatePicker` | value, max=today | Native date input on mobile; calendar popover on desktop; "Today"/"Yesterday" shortcuts. |
| `SelectRow` | label, value, onPress | Settings rows with chevron. |
| `PeriodSelector` / `SegmentedControl` | options, value | `role="radiogroup"`; arrow-key navigation. |
| `SummaryMetric` / `MetricCard` | label, money \| pct, delta? | Numbers use tabular figures; delta chip shows arrow icon + text, not colour alone. |
| `TransactionRow` | transaction, onPress | Icon, title, note, signed amount with type icon; whole row is one button with full accessible name. |
| `GoalCard` | goal, compact? | Name, saved of target, ProgressBar, %, date, StatusChip. |
| `ProgressBar` | value 0–100, label | `role="progressbar"` with `aria-valuenow`/`-text`. |
| `StatusChip` | status | Icon + text: ✓ On track, ! At risk, ↓ Behind, ★ Completed. |
| `BottomSheet` / `Dialog` | open, title, onClose | Radix Dialog; focus trap; Esc; returns focus to trigger. |
| `ConfirmationDialog` | title, consequences, confirmLabel, destructive | Destructive button right; Cancel is default focus. |
| `Toast` | message, action? | `role="status"`; 5 s; action (Undo) keyboard reachable; pauses on hover/focus. |
| `EmptyState` | illustration, title, body, action | Answers: what is missing, why it matters, what to do next. |
| `LoadingSkeleton` | shape | Matches final layout; shimmer disabled with reduced motion. |
| `ErrorState` | message, onRetry | Plain language + Retry; keeps cached content visible when possible. |
| `ChartContainer` | title, description, data table | `figure` + `figcaption`; "View as table" toggle. |
| `FilterChip` | label, selected | `aria-pressed`. |
| `OfflineSyncIndicator` | pendingCount | "Sync pending (2)" chip; tap shows queue details. |

---

## 15. Wireframe Sketches (p.38–42)

Low-fidelity layouts that fix structure, hierarchy and content. They use the
corrected reference dataset and the accessible colour shades. Visual polish
follows the tokens in Sections 17–18.

| ID | Wireframe | Content summary |
|---|---|---|
| **W-01** | Home dashboard — desktop (≥1024 px) | Sidebar (SpendTogether, + Add, Home, Activity, Goals, Insights, Profile, Alex Johnson user card); "Good morning, Alex / Wednesday 17 September · USD"; period selector Today / This week / **This month**; hero "Remaining this month **$330.00**", "Net cash flow $630.00 · after $300.00 saved", metrics Income $1,200.00 · Expenses $570.00 · Saved $300.00 · Savings rate 25.0%; Active goals (New Laptop $600 / $1,200 On track; Vacation $800 / $2,000 At risk) + View all; "Where your money went" donut ($570 expenses) with Bills $150.00 · 26.3%, Food $140.00 · 24.6%, Other $105.00 · 18.4%, Transport $90.00 · 15.8%, Shopping $85.00 · 14.9%; Recent activity (Salary +$1,200.00; Food · Lunch −$12.00; Transport −$5.00; Laptop goal $50.00 saved; Bills · Power −$45.00). |
| **W-02** | Home dashboard — mobile (<768 px) | Three states side by side: **data** (hero $330.00; Income $1,200 / Expenses $570 / Saved $300 / Rate 25%; Top spending Bills $150, Food $140, Other $105; Savings goals New Laptop 50%, Vacation 40%; FAB; 5 bottom tabs); **loading (skeleton)**; **empty** (hero $0.00, "Add your first income or expense — Your totals and insights appear as soon as you record something.", Add transaction). |
| **W-03** | Add expense — desktop dialog and mobile full-height sheet | Desktop: Amount `12.00 USD`, hint "≈ shown here when currency differs from USD", Category Food, Date "Today, 17 Sep 2026", Note (optional) "Lunch", Save expense. Mobile with non-base currency: Income/Expense toggle, `L$ 5,000.00` `LRD`, "≈ $26.40 USD · rate of 17 Sep", Category Transport, Date Today, Note "Taxi to work", Save expense. *Rate shown is illustrative.* |
| **W-04** | Activity — desktop split view | Search "Search notes and categories"; filter chips All / Income / Expense / Savings / Category / Date; date-grouped list (WEDNESDAY, 17 SEPTEMBER: Food · Lunch −$12.00; Transport · Taxi −L$ 5,000 LRD ≈ −$26.40; Laptop goal $50.00 saved. TUESDAY, 16 SEPTEMBER: Salary +$1,200.00; Bills · Electricity −$45.00; Shopping −$35.00); details panel: "Expense · Transport", "L$ 5,000.00 LRD", "≈ $26.40 USD (rate 1 USD = 189.39 LRD, 17 Sep)", Category Transport, Date 17 Sep 2026, Note "Taxi to work", Edit / Delete. |
| **W-05** | Insights — monthly view | Metric cards Income $1,200.00 (+8.0% vs Aug), Expenses $570.00 (−4.2% vs Aug), Saved $300.00 (+20.0% vs Aug), Savings rate 25.0% (+2.5 pts); "Spending trend · last 6 months" (Apr–Sep); "Income vs expenses" (Jul, Aug, Sep); "Category breakdown · September" with the five reference categories and percentages. |
| **W-06** | Goals list, goal details and add contribution — mobile | Goals: My goals / Our goals; New Laptop $600 of $1,200, 31 Dec, ● On track; Vacation $800 of $2,000, 31 Dec, ● At risk; Emergency fund $250 of $1,000, 31 Dec, ● Behind; Create goal. Goal details: "‹ New Laptop", Saved $600.00 of $1,200, "50% · $600 to go · 105 days left", ● On track, "Save $40.00/week to finish by 31 Dec. At your pace: done ~5 Dec."; Contributions 15 Sep $50.00, 1 Sep $200.00, 15 Aug $150.00; + Add contribution. Add contribution: "× Add to New Laptop", "$600 of $1,200 saved", `$50.00` `USD`, Date Today, Note (optional) "September top-up", "After this: $650 saved · 54%", Add contribution. |
| **W-07** | Couple screen — the three required states | **No partner:** "Saving together", "Save for shared goals together", "Your partner sees shared goals only. Your income, expenses and personal goals always stay private.", Invite partner. **Invitation pending:** ● Invitation pending, "Sent to sam@example.com", "Expires 24 Sep 2026", Resend / Cancel, "Shared goals appear here after Sam accepts." **Connected:** "You & Sam", ● Connected since 2 Sep, Our goals (Apartment deposit — You 60% · Sam 40%; Vacation — You 60% · Sam 40%), Create shared goal, End connection. *No private data appears in any state.* |
| **W-08** | Welcome, Register (inline validation), base-currency setup — mobile | Welcome: SpendTogether, "Know what you earn. / Know what you spend. / Know what you can save.", Create account, Log in. Register: Name "Alex Johnson", Email or phone "alex@example.com", Password, Confirm password with inline error "Passwords don't match.", Create account, "Already have an account? Log in". Currency setup: "Choose your currency", "Your totals and insights are shown in this currency. You can still enter amounts in any currency.", search, list USD ✓ / LRD / EUR / GBP / NGN, "Timezone: Africa/Monrovia (detected)", Continue. |
| **W-09** | Profile & settings — desktop | Alex Johnson, alex@example.com, Edit profile; PREFERENCES: Base currency "USD · US Dollar", Timezone "Africa/Monrovia", Categories "14 categories", Notifications "Email: on"; COUPLE: Partner "Sam · connected"; SECURITY & ACCOUNT: Change password, Log out. |

---

## 16. Charts & Analytics Specifications (p.43–44)

Charts support understanding; they never replace numbers. The Home screen
communicates the period position without any chart (design acceptance #3). All
charts are built with Recharts inside a shared `ChartContainer`.

**Chart specimens (p.43) use the corrected reference dataset:**

- **C-01 Category breakdown (donut + legend):** $570 expenses — Bills $150.00 26.3%, Food $140.00 24.6%, Other $105.00 18.4%, Transport $90.00 15.8%, Shopping $85.00 14.9%.
- **C-02 Spending trend (line, daily buckets):** y-axis $20/$40/$60/$80, dashed "avg $33.53/day".
- **C-03 Income vs expenses (grouped bars):** Jul 1,100 / 640 · Aug 1,111 / 595 · Sep 1,200 / 570.
- **C-04 Goal progress (bars, text values):** New Laptop 50% · ✓ On track; Vacation 40% · ! At risk; Emergency fund 25% · ↓ Behind.

### 16.1 Chart catalogue (p.43)

| ID | Chart | Where | Data | Encoding |
|---|---|---|---|---|
| **C-01** | Category breakdown | Home (list only), Insights | F-08, F-09 for the period; top 6 categories + "Other" bucket | Donut (inner radius 60%) + legend list with amount and %; total in centre. Sorted by amount desc. |
| **C-02** | Spending trend | Insights | Expense totals per bucket: Daily view → last 14 days; Weekly → last 8 weeks; Monthly → last 6 months | Line, 2 px, dots on hover/focus; dashed average line (F-07); y-axis starts at 0. |
| **C-03** | Income vs expenses | Insights | F-01, F-02 per bucket (same buckets as C-02, last 3 shown on mobile, 6 on desktop) | Grouped vertical bars; income left, expenses right; value labels above bars ≥ 768 px. |
| **C-04** | Goal progress | Goals, Goal details, Home | F-11…F-13 | Horizontal bar, 8 px, rounded; % and status text beside. |
| **C-05** | Savings rate | Home, Insights | F-06 current + previous | Metric card with delta chip; "N/A" with explanation when income = 0. |
| **C-06** | Previous-period comparison | Insights | F-10 for income, expenses, saved, savings rate | Delta chips: arrow icon + signed % + "vs Aug"; "New" when previous = 0. |
| **C-07** | Contributor breakdown | Couple goal details | F-21 | Stacked single bar (two segments, secondary + accent) + text "You $480 (60%) · Sam $320 (40%)". |

### 16.2 Rules for every chart (p.44)

- Every chart has a visible title, a one-line description, and a **View as table** toggle rendering an HTML `<table>` with the same data.
- Values are in base currency with the code in the subtitle ("USD"). Tooltips show formatted money and date range.
- Category colours come from the categorical tokens (Section 18) and are always paired with a text label; hue alone never carries meaning.
- Minimum data: with fewer than 2 buckets containing data, C-02/C-03 show the available totals and the message "Your trends appear as you record more activity" instead of an empty axis.
- No 3D, no dual axes, no pie charts with > 7 slices, no animated counters. Entry animation ≤ 300 ms, disabled with reduced motion.
- Keyboard: data points are focusable in order; focus shows the tooltip. Screen readers get the table, not SVG internals (SVG has `aria-hidden="true"` when the table is present).

### 16.3 Insights API contract (per period) (p.44)

```json
GET /api/v1/insights/monthly?date=2026-09-17
{ "period": {"type":"monthly","start":"2026-09-01","end":"2026-09-30","days_elapsed":17},
  "currency": "USD",
  "totals":   {"income":120000,"expenses":57000,"saved":30000,"net":63000,"remaining":33000,
               "savings_rate_pct":25.0,"avg_daily_spending":3353},
  "previous": {"income":111111,"expenses":59500,"saved":25000,"savings_rate_pct":22.5},
  "change_pct": {"income":8.0,"expenses":-4.2,"saved":20.0,"savings_rate_pts":2.5},
  "categories": [{"id":"…","name":"Bills","amount":15000,"pct":26.3}, …],
  "series": {"bucket":"month","points":[{"start":"2026-04-01","income":…,"expenses":…}, …]} }
```

### 16.4 Product analytics events (p.44)

Instrument the PRD success metrics (§13) with a privacy-respecting analytics
tool. Events never contain amounts, notes, category names or partner identity.

| Event | Properties | Metric |
|---|---|---|
| `account_created` | method (email/phone) | Activation |
| `base_currency_set` | currency | Activation |
| `transaction_created` | type, is_foreign_currency, offline_queued | Activation (first), engagement / week |
| `goal_created` | type | Activation |
| `contribution_added` | goal_type | Engagement / month |
| `partner_invited` · `invitation_accepted` | channel | Partner connection |
| `insights_viewed` | period | Insight views |
| `session_start` (daily) | — | Retention D7 / D30 |

---

# PART D — VISUAL DESIGN

## 17. Colour Palette & Typography (p.45–47)

Derived from the SpendTogether boards: calm teal-green primary, indigo
secondary, amber accent, neutral grey foundation. Personality: calm, modern,
trustworthy, optimistic, non-judgmental.

### 17.1 Brand and semantic palette (p.45)

| Token | Hex | On white | Allowed use |
|---|---|---|---|
| `primary-500` | #10B981 | 2.54:1 · decorative | Brand fills, illustrations, large icons, progress track accents. **Never text.** |
| `primary-600` | #059669 | 3.77:1 · AA large / UI | Progress fills, chart income series, focus-visible outlines (3:1 non-text). |
| `primary-700` | #047857 | 5.48:1 · AA text | Primary button background (white text 5.48:1), links, income amounts. |
| `primary-800` | #065F46 | 7.68:1 · AA text | Text on primary-50 tints, success chip text. |
| `primary-50` | #ECFDF5 | 1.05:1 · decorative | Tinted backgrounds (selected rows, success chips). |
| `secondary-500` | #6366F1 | 4.47:1 · AA large / UI | Couple/shared accents, savings contribution icons, large text only. |
| `secondary-600` | #4F46E5 | 6.29:1 · AA text | Savings amounts text, couple chart series. |
| `accent-500` | #F59E0B | 2.15:1 · decorative | Highlights, "At risk" chip fill with dark text (8.26:1). **Never text on white.** |
| `accent-700` | #B45309 | 5.02:1 · AA text | Warning text, "At risk" text. |
| `success-500` | #22C55E | 2.28:1 · decorative | Decorative success only (confetti, illustration). |
| `error-500` | #EF4444 | 3.76:1 · AA large / UI | Expense chart series, icons. |
| `error-600` | #DC2626 | 4.83:1 · AA text | Destructive button background (white 4.83:1). |
| `error-700` | #B91C1C | 6.47:1 · AA text | Expense amounts text, error messages. |
| `neutral-900` | #111827 | 17.74:1 · AA text | Headings, primary text, dark header band. |
| `neutral-700` | #374151 | 10.31:1 · AA text | Body text. |
| `neutral-600` | #6B7280 | 4.83:1 · AA text | Secondary text, captions (4.83:1). |
| `neutral-400` | #9CA3AF | 2.54:1 · decorative | Placeholder icons, disabled — not for meaningful text. |
| `neutral-300` | #D1D5DB | 1.47:1 · decorative | Input borders. |
| `neutral-200` | #E5E7EB | 1.24:1 · decorative | Dividers, card borders, progress tracks. |
| `neutral-100` | #F3F4F6 | 1.10:1 · decorative | Skeletons, segmented control track. |
| `neutral-50` | #F9FAFB | 1.05:1 · decorative | App background. |

> **Correction to source material.** The boards place white text on #10B981 and
> use #22C55E / #F59E0B as text. Those combinations measure 2.54:1, 2.28:1 and
> 2.15:1 against white and fail WCAG AA. The brand hues stay; text and filled
> controls use the -700 shades listed above.

### 17.2 Financial meaning (p.46)

| Meaning | Text colour | Icon | Sign / label |
|---|---|---|---|
| Income | primary-700 | arrow-down-left in circle | + prefix, "Income" |
| Expense | error-700 | arrow-up-right in circle | − prefix (U+2212), "Expense" |
| Savings contribution | secondary-600 | piggy-bank | "saved" suffix, "Savings" |
| On track / Completed | primary-800 on primary-50 | check / star | text label |
| At risk | accent-700 on accent-50 | alert-triangle | text label |
| Behind / Overdue / Overspent | error-700 on error-50 | arrow-down / clock | text label |

### 17.3 Chart categorical colours (p.46)

| Token | Hex | Default category |
|---|---|---|
| `cat-food` | #F59E0B | Food |
| `cat-bills` | #6366F1 | Bills |
| `cat-transport` | #3B82F6 | Transport |
| `cat-shopping` | #06B6D4 | Shopping |
| `cat-health` | #EC4899 | Health |
| `cat-education` | #8B5CF6 | Education |
| `cat-entertainment` | #F97316 | Entertainment |
| `cat-family` | #14B8A6 | Family |
| `cat-other` | #94A3B8 | Other |

### 17.4 Typography (p.46–47)

**Plus Jakarta Sans** (600, 700, 800) for headings and brand. **Inter** (400,
500, 600, 700) for body, UI and every number, with
`font-feature-settings: "tnum" 1, "cv11" 1` so digits align in lists and totals.
Both are served with `next/font` (self-hosted, no layout shift, `display: swap`).
Fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

| Token | Family / weight | Size / line (px) | Use |
|---|---|---|---|
| `display` | Jakarta 800 | 40 / 48 · 32 / 40 mobile | Hero amount label (numbers use num-display) |
| `num-display` | Inter 700 tnum | 40 / 44 · 32 / 36 mobile | Hero money value |
| `h1` | Jakarta 700 | 30 / 38 | Page titles |
| `h2` | Jakarta 700 | 22 / 30 | Section titles, card headings |
| `h3` | Jakarta 600 | 18 / 26 | Sub-sections |
| `body-lg` | Inter 400 | 16 / 24 | Default body, inputs |
| `body-sm` | Inter 400 | 14 / 20 | Secondary text, rows |
| `label` | Inter 600 | 14 / 20 | Buttons, labels, metric values |
| `caption` | Inter 500 | 12 / 16 | Captions, chart axes (minimum size) |

- Text sizes are defined in rem; layout MUST survive 200% browser zoom and OS text scaling without clipping or horizontal scrolling.
- Line length for prose ≤ 72 characters. Money is never truncated with an ellipsis; long values wrap or scale down one step.
- Sentence case everywhere; no all-caps except small overline labels (letter-spacing 0.06em).

---

## 18. Design Tokens (p.48–49)

Tokens are the only source of visual values. Components reference tokens;
screens never hard-code colours, sizes or durations. Defined once as CSS custom
properties and exposed to Tailwind.

| Group | Tokens |
|---|---|
| Spacing (4-pt) | `space-0` 0 · `0.5` 2 · `1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64 (px) |
| Radius | `radius-sm` 6 · `md` 10 · `lg` 14 · `xl` 20 · `full` 9999 |
| Elevation | `elev-0` none · `elev-1` 0 1px 2px rgb(17 24 39/.06) · `elev-2` 0 4px 12px rgb(17 24 39/.08) · `elev-3` 0 12px 32px rgb(17 24 39/.16) (dialogs, sheets) |
| Motion duration | `dur-fast` 120 ms (hover, press) · `dur-base` 200 ms (sheets, dialogs) · `dur-slow` 320 ms (progress, page) · `dur-celebrate` 1200 ms (goal completed) |
| Motion easing | `ease-standard` cubic-bezier(.2,0,0,1) · `ease-exit` cubic-bezier(.4,0,1,1) |
| Reduced motion | `@media (prefers-reduced-motion: reduce)`: all durations → 0 ms except opacity fades ≤ 100 ms |
| Z-index | base 0 · sticky 10 · nav 20 · fab 30 · overlay 40 · modal 50 · toast 60 |
| Breakpoints | sm 480 · md 768 · lg 1024 · xl 1280 · 2xl 1536 (min-width) |
| Layout | `content-max` 1200 · `sidebar` 240 · `rail` 72 · `tabbar` 64 + safe-area · `touch-min` 44 |
| Focus | `focus-ring` 2px solid primary-700, offset 2px (outline, never removed) |
| Opacity | disabled .45 · scrim rgb(17 24 39 /.48) |

### 18.1 CSS variables and Tailwind mapping (p.48)

```css
:root {
  /* colour — brand */
  --color-primary-50:#ECFDF5;  --color-primary-500:#10B981;  --color-primary-600:#059669;
  --color-primary-700:#047857; --color-primary-800:#065F46;
  --color-secondary-50:#EEF2FF; --color-secondary-500:#6366F1; --color-secondary-600:#4F46E5;
  --color-accent-50:#FFFBEB;   --color-accent-500:#F59E0B;   --color-accent-700:#B45309;
  --color-error-50:#FEF2F2;    --color-error-500:#EF4444;    --color-error-600:#DC2626; --color-error-700:#B91C1C;
  --color-neutral-50:#F9FAFB;  --color-neutral-100:#F3F4F6;  --color-neutral-200:#E5E7EB;
  --color-neutral-300:#D1D5DB; --color-neutral-600:#6B7280;  --color-neutral-700:#374151; --color-neutral-900:#111827;
  /* colour — semantic aliases (components use these) */
  --fg-default: var(--color-neutral-900);   --fg-muted: var(--color-neutral-600);
  --bg-app: var(--color-neutral-50);        --bg-card: #FFFFFF;
  --border-default: var(--color-neutral-200);
  --action-primary-bg: var(--color-primary-700); --action-primary-fg: #FFFFFF;
  --action-danger-bg: var(--color-error-600);
  --money-income: var(--color-primary-700); --money-expense: var(--color-error-700);
  --money-saving: var(--color-secondary-600);
  --status-ontrack-fg: var(--color-primary-800);  --status-ontrack-bg: var(--color-primary-50);
  --status-atrisk-fg: var(--color-accent-700);    --status-atrisk-bg: var(--color-accent-50);
  --status-behind-fg: var(--color-error-700);     --status-behind-bg: var(--color-error-50);
  /* type */
  --font-heading: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  /* shape, motion */
  --radius-md: 10px; --radius-lg: 14px; --dur-base: 200ms; --ease-standard: cubic-bezier(.2,0,0,1);
}

/* Tailwind v4 (app/globals.css) */
@import "tailwindcss";
@theme inline {
  --color-primary-700: var(--color-primary-700);
  --color-income: var(--money-income);
  --color-expense: var(--money-expense);
  --color-saving: var(--money-saving);
  --font-heading: var(--font-heading);
  --font-sans: var(--font-body);
  --radius-card: var(--radius-lg);
}
```

### 18.2 Component rules (p.49)

- Cards exist only to group related information; no card nested in a card unless the inner item is itself a list item (goal card inside goals list).
- One primary button per view region. Destructive actions never use the primary style.
- Icons: Lucide (rounded outline), 20 px default, 24 px in navigation, stroke 1.75. Category = icon + label, never icon alone.
- Illustrations: flat, soft gradients, people of African descent represented prominently — consistent with the boards and the launch market.

---

## 19. Loading, Empty, Error & Offline States (p.50–51)

### 19.1 Global rules (p.50)

| State | Rule |
|---|---|
| Loading | Skeletons matching final layout for screen content; inline spinners for local actions; never a full-screen spinner once the shell has loaded. Background refresh is silent. Skeleton appears only after 150 ms to avoid flashes. |
| Empty | Must answer: what is missing, why it matters, what to do next. One primary CTA where appropriate. |
| Error | Plain language, no codes. Preserve user input. Retry. Validation and auth errors next to the affected field or action. Cached content stays visible with a non-blocking error banner. |
| Offline | Subtle "Offline" chip in header; creation of transactions and contributions queued; edits/deletes of synced records and goal/couple management disabled with explanation "Connect to the internet to do this." |

### 19.2 State matrix by screen (p.50)

| Screen | Loading | Empty | Error | Offline |
|---|---|---|---|---|
| Home | Skeleton hero + 3 rows + 2 goal cards | "Add your first income or expense — it unlocks your totals and insights." + Add transaction | Banner over cached data + Retry | Cached summary + queued items applied locally, marked "Sync pending" |
| Activity | 8 skeleton rows | No data: "Nothing recorded yet" + Add. Filtered: "No activity matches these filters" + Clear filters | Retry; keep previous results | Cached list; queued rows at top |
| Insights | Skeleton cards + chart frames | "Insights improve as you record transactions" + available totals shown | Per-card error with Retry | Last cached period; banner |
| Goals | 3 skeleton cards | My: "You have no savings goals yet" + Create goal. Ours: no partner → Connect partner; partner, no goals → Create shared goal | Retry | Cached list; create disabled |
| Goal details | Hero skeleton | Zero contributions: $0 saved, remaining, required pace, Add contribution | Retry | Add contribution queued; status recomputed locally |
| Couple | Status card skeleton | No partner state (design) | Retry | Read-only |
| Forms | Submit inline spinner, fields disabled | — | Field errors; top error for server issues; values kept | Save → queued (create only) with toast "Saved offline — will sync" |
| Auth | Button spinner | — | Generic credential error; lockout message | "You're offline. Connect to sign in." |

### 19.3 Offline architecture (PWA) (p.50–51)

1. **Service worker** (Serwist): precache app shell, fonts, icons; runtime cache `GET /api/v1` responses with network-first (3 s timeout) then cache.
2. **Read cache:** TanStack Query persisted to IndexedDB (encrypted-at-rest by the OS only; cleared on logout).
3. **Write queue:** IndexedDB store `outbox` with `{id (UUID), endpoint, body, idempotency_key, created_at, attempts}`. Client-generated UUID becomes the record id so later edits reference it.
4. **Sync:** triggered on `online` event, app focus, and every 60 s while items remain (Background Sync API where supported; Safari falls back to these triggers). FIFO, exponential backoff, max 8 attempts.
5. **Conflicts:** creates are idempotent, so retries cannot duplicate. A permanently rejected item (e.g. goal archived meanwhile) moves to a "Needs attention" list with the reason and Edit / Discard actions. Data is never silently dropped.
6. **Logout** with pending items warns: "2 entries haven't synced. Log out anyway and lose them?"

---

## 20. Accessibility (p.52)

Target: **WCAG 2.2 Level AA** for every screen. Accessibility is part of the
Definition of Done, not a later pass.

| Area | Requirement |
|---|---|
| Semantics | Landmarks (header, nav, main); one h1 per page; lists as lists; tables as tables; buttons are `<button>`, links are `<a>`. |
| Keyboard | Everything operable by keyboard; visible focus ring (token); logical tab order; skip link; focus trapped in dialogs/sheets and returned on close; no keyboard traps. |
| Screen readers | Money read naturally ("minus twelve dollars, expense, Food, 17 September"). Status chips announce text. Toasts use `role="status"`; errors `role="alert"`. Charts expose data tables. |
| Colour & contrast | Text ≥ 4.5:1 (≥ 3:1 for ≥ 24 px or 18.66 px bold); UI components and focus ≥ 3:1. Meaning never by colour alone: sign, icon and label accompany every financial colour. |
| Target size | Interactive targets ≥ 44 × 44 px on touch, ≥ 24 × 24 px minimum anywhere (WCAG 2.5.8) with spacing. |
| Text scaling | Works at 200% zoom and 320 px width without horizontal scrolling (reflow). |
| Forms | Persistent visible labels; hints and errors linked by `aria-describedby`; errors summarised on submit; autocomplete attributes (name, email, tel, new-password, current-password); no time limits. |
| Motion | Respect `prefers-reduced-motion`; no flashing; celebration can be skipped. |
| Authentication | No cognitive tests; paste allowed in password fields; password managers supported (WCAG 3.3.8). |
| Language | `lang="en"` on html; plain language; numbers formatted to locale. |
| Testing | axe-core in Playwright on every screen state; manual checks with NVDA + Firefox, VoiceOver + Safari (macOS and iOS), TalkBack + Chrome before release. |

---

## 21. Responsive Behaviour (p.53)

Mobile-first CSS. Layouts are designed at 360, 768, 1024 and 1440 px and must
work continuously between them (no dead zones). Minimum supported width: 320 px.

| Screen | < 768 px | 768–1023 px | ≥ 1024 px |
|---|---|---|---|
| Shell | Bottom tabs + FAB; header 56 px | Icon rail; header | Sidebar 240 px; content max 1200 px centred |
| Home | Single column: hero → categories → goals | Two columns: hero full width; categories \| goals | 12-col grid: hero (8) + goals (4); categories (8) + recent activity (4) |
| Add forms | Full-height sheet; Save button fixed above keyboard | Centred dialog 480 px | Centred dialog 480 px |
| Activity | List; details as pushed page | List; details as pushed page | Split view: list 58% / details 42% |
| Insights | Stacked cards; charts full width; 2 × 2 metric grid; bar chart shows last 3 buckets | 2-column cards | 4 metric cards in a row; trend (7) + bars (5); breakdown full width |
| Goals | One column cards | Two-column grid | Three-column grid |
| Goal details | Single column; sticky Add contribution bar | Two columns: hero \| pace/status | Two columns + history full width |
| Tables in settings | Rows stack label over value | Label left, value right | Label left, value right |

- Respect safe-area insets (`env(safe-area-inset-*)`) for the tab bar, FAB and sticky buttons on notched phones.
- Use `100dvh` (dynamic viewport) for sheets so the mobile browser toolbar does not hide the Save button; keep the focused input visible when the keyboard opens.
- Hover-only affordances are forbidden; every hover effect has a focus and touch equivalent.
- Images and illustrations use `next/image` with responsive sizes; illustrations hidden below 360 px when they would push content below the fold.

---

## 22. Web Acceptance Criteria (p.54)

A criterion passes only when an automated test exists and passes (Section 23),
unless marked "manual".

| ID | Criterion | Traces to |
|---|---|---|
| **WAC-01** | A new user can register with email or phone, verify, set base currency and reach Home in under 90 seconds; duplicate identifiers are rejected without revealing account existence. | AC01, FR-01, FR-05 |
| **WAC-02** | Login sessions survive reloads and browser restarts; logout clears cookies, query cache and offline stores. | AC01, FR-02/03 |
| **WAC-03** | Creating, editing and deleting income updates Home, Activity and Insights totals for all affected periods without a manual refresh. | AC02 |
| **WAC-04** | Same as WAC-03 for expenses, including category totals and percentages. | AC03 |
| **WAC-05** | Home shows income, expenses, recorded savings, remaining cash flow, net cash flow and savings rate matching F-01…F-06 for Today, This week and This month. | AC04 |
| **WAC-06** | A period with zero income shows savings rate "N/A" and no errors anywhere in UI, API or logs. | AC05 |
| **WAC-07** | Individual goals can be created with name, target amount, currency and target date; invalid values are blocked inline. | AC06 |
| **WAC-08** | Users in an active couple can create couple goals; users without one see the option disabled with an explanation and receive 409 COUPLE_REQUIRED from the API. | AC07 |
| **WAC-09** | Goal balance always equals the sum of its contributions after any create, edit or delete. | AC08 |
| **WAC-10** | Progress, remaining amount, required pace, status and projection match F-11…F-20 for the reference cases in Section 23. | AC09 |
| **WAC-11** | A goal becomes Completed the moment contributions reach the target, and reverts if a contribution is removed. | AC10 |
| **WAC-12** | Both partners see every couple-goal contribution with contributor name; no other partner data is visible in UI or obtainable via API (verified by RLS tests). | AC11, AC12 |
| **WAC-13** | Daily, weekly and monthly insights calculate correctly across timezone and month boundaries and show previous-period comparison when data exists. | AC13 |
| **WAC-14** | An amount entered in a non-base currency is stored with its original value and converted at the rate of its date; the preview matches the saved value. | Scope exception |
| **WAC-15** | Changing base currency re-expresses all totals and preserves original amounts. | Scope exception |
| **WAC-16** | Core flows pass E2E on Chrome, Safari, Firefox, Edge (latest 2) and on iOS Safari and Android Chrome viewports 360–430 px. | AC14 |
| **WAC-17** | With the network off, a user can add an expense; it syncs once online with no duplicate. | Design §21 |
| **WAC-18** | Every primary data screen has loading, empty and error states as specified in 19.2. | Design AC8 |
| **WAC-19** | No axe-core violations of serious or critical impact; manual screen reader pass completed (manual). | Design §23 |
| **WAC-20** | Home loads with LCP ≤ 2.5 s on a mid-range phone over 4G (Lighthouse mobile profile); dashboard API p95 ≤ 800 ms server time. | PRD §12 |

---

## 23. Testing Architecture (p.55–56)

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Unit (domain) | Vitest | Every formula F-01…F-24, status, rounding, date/period boundaries | 100% line + branch coverage for `packages/domain`; blocks merge |
| Schema & RLS | pgTAP via `supabase test db` | Constraints, triggers, functions, and every RLS policy for owner / partner / stranger / ex-partner | Blocks merge |
| API integration | Vitest + local Supabase (Docker) | Each endpoint: happy path, validation, auth, 404 isolation, idempotency | Blocks merge |
| Component | Vitest + Testing Library | Forms, AmountInput, pickers, states | Blocks merge |
| E2E | Playwright (Chromium, WebKit, Firefox; Pixel 7 + iPhone 14 emulation) | Flows 7.1–7.10, offline sync, couple two-user scenario | Blocks deploy to production |
| Accessibility | `@axe-core/playwright` + manual | All screens and states | Serious/critical = fail |
| Performance | Lighthouse CI + k6 (API) | Budgets in WAC-20; JS ≤ 180 kB gzip on first load of `/home` | Warn on preview, fail on main |
| Visual | Playwright screenshots | Key screens at 360 / 768 / 1280 | Reviewed diffs |

### 23.1 Required domain test cases (PRD §12) (p.55)

| ID | Case | Expected |
|---|---|---|
| **T-01** | Totals: income 1,200.00, expenses 570.00, savings 300.00 | net 630.00, remaining 330.00, rate 25.0% |
| **T-02** | Zero income, expenses 50.00 | rate N/A; remaining −50.00; no exception |
| **T-03** | Contribution 100.00 in same period | expenses unchanged; saved +100.00 |
| **T-04** | Goal target 1,200, balance 600 | progress 50%, remaining 600 |
| **T-05** | Balance 1,300 on target 1,200 | progress 100%, remaining 0, COMPLETED |
| **T-06** | Target date today, remaining 60 | required daily 60 (no divide-by-zero) |
| **T-07** | Target date yesterday, not complete | status BEHIND, required pace overdue |
| **T-08** | Couple goal: A 480, B 320 on target 2,000 | balance 800, shares 60% / 40% |
| **T-09** | Status thresholds at ratios 0.95, 0.9499, 0.75, 0.7499 | ON_TRACK, AT_RISK, AT_RISK, BEHIND |
| **T-10** | New goal, zero contributions, day 0 | ON_TRACK |
| **T-11** | Expense 5,000 LRD with rate 1 USD = 189.39 LRD | base 26.40 USD (half away from zero) |
| **T-12** | JPY 1,000 → USD, KWD 1.234 → USD | correct exponents 0 and 3 |
| **T-13** | Expense at 23:30 on 31 Aug in Africa/Monrovia vs Asia/Tokyo user | falls in the correct local month |
| **T-14** | Week boundaries: Sunday vs Monday | ISO week Monday start |
| **T-15** | Avg daily spending on day 17 of current month vs full previous month | divide by 17 vs 31 |
| **T-16** | Previous period = 0 | change shown as "New" |

### 23.2 Critical RLS tests (p.56)

- Partner cannot SELECT, UPDATE or DELETE the other partner's transactions, individual goals or contributions to individual goals (expect 0 rows / error).
- Stranger cannot read any couple goal or contribution by id (404 at API, 0 rows at DB).
- Ex-partner can read archived couple goal history but cannot insert contributions.
- User cannot insert a contribution with `user_id` of another user; cannot create a couple goal for a couple they are not in.
- `accept_invitation` rejects: wrong token, expired, invitee already coupled, invitee identity mismatch, reuse of accepted token.

---

## 24. Deployment Architecture (p.57–58)

### 24.1 Environments (p.57)

| Environment | Web | Database | Purpose |
|---|---|---|---|
| Local | `next dev` | Supabase CLI (Docker) with seed | Development and all automated tests |
| Preview | Vercel preview per pull request | Staging Supabase project | Review, E2E, Lighthouse |
| Staging | Vercel (main branch, protected) | Staging Supabase project | Release candidate, manual QA |
| Production | See 24.2 | Production Supabase project | Users |

### 24.2 Hosting phases and cost (p.57)

| Phase | Web hosting | Supabase | Monthly cost | Constraints |
|---|---|---|---|---|
| 1. Build & demo | Vercel Hobby | Free plan (2 projects: staging + demo) | $0 | Hobby is for personal, non-commercial use only. Free projects pause after 7 days without activity and have no backups. Acceptable only before real users. |
| 2. Launch (recommended) | Hetzner VPS (Docker, Nginx, PM2 or Node standalone output, Certbot) or Vercel Pro | Pro plan | Supabase Pro $25 + VPS (≈ single-digit USD) or Vercel Pro $20/seat | Backups, no pausing. VPS option needs the hardening checklist and uptime monitoring. |

> **Warning.** Do not put paying or real users on Phase 1 infrastructure. A
> financial app without database backups is a data-loss incident waiting to
> happen.

### 24.3 CI/CD pipeline (GitHub Actions) (p.57)

`PR opened → Install + lint + typecheck → Unit + component tests → supabase start → migrations → pgTAP + API tests → Build → Preview deploy → Playwright E2E + axe + Lighthouse → Review + merge → Migrate staging → deploy staging → Manual approval → Migrate prod → deploy prod → Smoke tests`

- Migrations run with `supabase db push` using a deploy token; they must be backward compatible with the currently running app (expand → migrate → contract).
- Generated DB types are committed; CI fails if they are out of date.
- Rollback: redeploy previous web build instantly; database fixes are forward-only migrations.
- Secrets live in GitHub Environments and the host's env store: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `FX_FALLBACK_KEY`, `SENTRY_DSN`, SMTP/SMS credentials. The service-role key is never exposed with a `NEXT_PUBLIC_` prefix.

### 24.4 Operations (p.58)

| Concern | Implementation |
|---|---|
| Monitoring | Sentry (web + API errors, performance traces); uptime check on `/api/health` every 5 min; Supabase logs. |
| Scheduled jobs | pg_cron: fx-sync (daily), idempotency purge (hourly), soft-delete purge (daily, > 30 days), invitation expiry (hourly). |
| Backups | Supabase Pro daily backups; weekly logical dump (`pg_dump`) encrypted to Cloudflare R2 with 8-week retention; quarterly restore drill. |
| Security headers | Strict CSP (nonce-based scripts), HSTS, X-Content-Type-Options, Referrer-Policy `strict-origin-when-cross-origin`, Permissions-Policy, `frame-ancestors none`. |
| Email / SMS | Supabase Auth emails via custom SMTP (Resend) on a verified domain (SPF, DKIM, DMARC). SMS via Twilio for phone accounts and phone invitations — this is a per-message cost. |
| Data protection | HTTPS only; encryption at rest (Supabase); logs and analytics exclude amounts, notes and category names. |

---

## 25. Security & Success Metrics (p.59)

### 25.1 Security checklist (p.59)

- Passwords hashed by Supabase Auth (bcrypt); minimum 10 characters; breached-password check enabled.
- Sessions in HTTP-only, Secure, SameSite=Lax cookies; no tokens in localStorage (PRD §8).
- Server-side validation (Zod) on every write; amounts positive integers; dates ≤ today; notes length-capped and rendered as text (no HTML).
- Authorization at API guard + RLS; 404 for foreign resources; invitation tokens 32 random bytes, stored hashed, single use, 7-day expiry.
- Rate limiting on auth and writes; generic auth errors; lockout messaging without enumeration.
- Dependency scanning (Dependabot) and secret scanning enabled on the repository.

### 25.2 Success metrics (PRD §13) (p.59)

| Category | Metric |
|---|---|
| Activation | Account created → base currency set → first transaction → first goal → partner connected (where applicable). |
| Engagement | Transactions per active user per week; contributions per active user per month; insight views. |
| Retention | Users still recording transactions after 7 and 30 days. |
| Outcome | % of active users with an active goal; % reporting clearer understanding of spending and savings progress (in-app one-question survey after 30 days). |

---

## 26. Known Limitations (Excluded by Scope) (p.60)

The owner chose strict PRD scope. These gaps are intentional in the MVP and
should be reviewed for version 1.1:

| Limitation | Consequence in MVP |
|---|---|
| No withdrawals from goals | Money used from savings cannot be recorded against a goal; users would have to delete or edit contributions, which rewrites history. |
| No recurring income/expenses | Salary, rent and subscriptions are entered manually each time. |
| Minimal couple dissolution | Ending a couple archives shared goals read-only; no splitting of shared balances. |
| No budgets, bank sync, receipts | Per PRD non-goals. |
| Light theme only | Dark mode not specified; tokens are structured so it can be added without refactoring. |
| Rates are daily | Conversions use the daily rate of the record's date, not intraday or parallel-market rates. |

> **Everything in this section is out of scope. Do not add these features.**

---

## 27. Definition of Done (p.61)

The MVP is complete when all of the following are true in production:

1. Authentication (register, verify, login, logout, reset), base-currency setup and session persistence work on all supported browsers.
2. Income and expense tracking with multi-currency conversion, editing, deletion with undo, and correct recalculation of every summary.
3. Period calculations for today/week/month and daily/weekly/monthly insights with previous-period comparison.
4. Individual goals, couple invitations, couple goals, contributions, derived balances, required pace, status and projection.
5. Couple privacy guaranteed by RLS and proven by automated tests.
6. All WAC-01…WAC-20 pass; domain coverage 100%; no serious/critical accessibility violations.
7. Loading, empty, error and offline states implemented for every primary screen.
8. Phase 2 infrastructure live: Supabase Pro with backups, monitoring, alerting, security headers and a completed restore drill.

---

## Digest coverage note

- **Pages covered:** 1–61 (all).
- **`[UNREADABLE]` markers:** none. Every page of the source rendered as
  extractable text, including the full DDL, both JSON examples, the ERD, the
  system-context diagram and all wireframe sketches.
- **Internal inconsistencies found in the source** (reproduced above, not
  resolved here, logged in `docs/plans/00-shared/open-questions.md`):
  Source Correction #7 cites "F-17" for the `max(Days Remaining, 1)` rule that
  §6.3 defines under **F-15**; Source Correction #2 cites "F-11" for category
  percentage, which §6.2 defines as **F-09**.
