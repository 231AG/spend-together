# SpendTogether design boards — description and correction warning

Files: `docs/spec/design-board-1.png`, `docs/spec/design-board-2.png`.

---

## ⚠️ READ THIS BEFORE USING ANYTHING ON THESE BOARDS

**The boards are visual inspiration only. They are not specification.**

They contain numerical and labelling errors that the specification's
*Source Corrections & Resolved Conflicts* section (p.6, reproduced in
`spec-digest.md`) identifies and overrides. Every one of those corrections is
binding.

**Never copy from the boards into code, fixtures, tests, mockups or copy:**

| Do not copy | Because | Use instead |
|---|---|---|
| The hero figure **"Available this month $850"** | $850 is not produced by any PRD formula | **"Remaining this month $330.00"** = Remaining Cash Flow (F-04); net cash flow $630.00 as a secondary metric |
| The donut legend **Food 30% · Bills 25% · Transport 20% · Shopping 15% · Other 10%** | Invented; contradicts the same board's own amounts | The corrected reference dataset: **Bills $150.00 (26.3%) · Food $140.00 (24.6%) · Other $105.00 (18.4%) · Transport $90.00 (15.8%) · Shopping $85.00 (14.9%)**, total $570, computed with F-09 |
| Board 1's **Inter Bold headings** / board 2's **Plus Jakarta Sans** (two competing systems) | Conflict | **Plus Jakarta Sans** headings, **Inter** body/UI/numbers (tabular figures) — spec §17.4 |
| The **palette swatches** (board 2's "Accent #F59E0B (Amber)" square is purple; "Secondary #6366F1" is grey; several labels are garbled) | Labels and swatches disagree | The **hex values** win, and only through spec §17.1 / §18.1 tokens |
| **White text on #10B981**, and #22C55E / #F59E0B used as text | 2.54:1, 2.28:1, 2.15:1 — all fail WCAG AA's 4.5:1 | Brand hues for fills/illustration only; text and filled buttons use the **-700** shades (primary-700 #047857 = 5.48:1) |
| The mobile **4 tabs + central "+"** navigation (no Profile tab) | Conflicts with the written design spec | **5 destinations** (Home, Activity, Goals, Insights, Profile) **+ a global Add action** — spec §12.2 |
| The **"At Risk"** chip used without defined thresholds | Untestable | **F-19** expected-balance method with `ON_TRACK_MIN` 0.95 / `AT_RISK_MIN` 0.75 from `app_config` |
| The PRD **required-pace** formula as drawn | Divides by zero on the target date | **F-15**: `F-12 ÷ max(F-14, 1)`; "Overdue" (no number) once the date has passed |

Additionally, the boards describe a **React Native + Expo mobile app**. This
project is a **responsive Next.js web app / PWA**. Treat every board layout as a
mobile-viewport reference (< 768 px) only; the tablet and desktop layouts come
from spec §21, and the route map from §12.1.

**What the boards *are* good for:** overall visual temperature (calm teal-green,
indigo, amber on a light neutral ground), card-based information density,
illustration style (flat, soft gradients, people of African descent represented
prominently — spec §18.2 endorses this), icon feel (rounded outline / Lucide),
and the general shape of each screen's content hierarchy.

---

## Board 1 — "Mobile App Design Specification"

Light board, white ground with a teal-green accent. Header: SpendTogether logo
and "Track. Save. Grow. Together." · "Complete visual, interaction and component
guide for the Income, Expense & Savings app" · Platform "Android & iOS (React
Native + Expo)" · Brand promise "Simple tools. Better money habits. A brighter
future." · a "Better Together" illustration of a couple.

### Panels

**1. User Journey & App Flow.** Four stages left to right: *Onboarding*
(welcome screens, key features, get started) → *Authentication* (sign up/login,
set currency, profile setup) → *Main App* (dashboard, add transactions, track
goals) → *Ongoing Use* (track expenses, view insights, achieve goals). Below,
a phone-frame strip: Splash → Welcome → Onboarding → Register/Login → Currency
→ Dashboard.

**2. Navigation Pattern.** A phone mock of the dashboard beside a legend of
bottom navigation items: Home ("Overview & summary"), Activity ("Transactions
list"), **+ (Floating Action)** ("Add income/expense/savings"), Goals ("Savings
goals"), Insights ("Reports & analytics"), Profile ("Settings & account").
Below: an "Add Transaction Sheet" — "What would you like to add?" with Income,
Expense, Savings Contribution rows.
→ **Conflict:** this panel shows the FAB *in place of* a fifth tab. Spec §12.2
wins: five destinations **plus** a global Add.

**3. Key User Flows.** Three numbered flow strips: *Add Transaction Flow*
(Tap + → Choose Type → Enter Amount → Select Category → Save); *Create Goal
Flow* (Tap Goals → Create Goal → Set Amount & Target → Set Date & Details →
Save); *Couple Setup Flow* (Invite Partner → Accept Invitation → Create Shared
Goal → View Together).

**4. Key Screens.** Ten phone mocks: 1 Splash · 2 Welcome · 3 Dashboard (Home)
· 4 Add Transaction · 5 Activity (Transactions) · 6 Insights · 7 Goals · 8 Goal
Details · 9 Couple Screen · 10 Profile & Settings. These carry the **incorrect**
hero ($850), the invented donut legend, and the 4-tab bar.

**5. Charts & Infographics.** Spending Breakdown (donut), Spending Trend (line,
Weekly/Monthly toggle), Income vs Expenses (grouped bars, Daily/Weekly/Monthly),
Savings Progress (progress bars: Laptop 60%, Vacation 40%), Monthly Summary
(four cards: Income $1,200 · Expenses $570 · Saved $300 · Remaining $330),
Category Distribution (pie).
→ The four summary cards happen to agree with the corrected dataset; the donut
and pie legends do not. Use spec §16 (C-01…C-07) as the real chart catalogue.

**6. Component Hierarchy.** A single worked example — `TransactionCard` broken
into Icon (category), Title (category name), Amount, Date & Note, Actions
(Edit/Delete).

**7. UI Components.** Buttons (Primary / Secondary / Destructive), Input Fields
(text input, dropdown), Chips & Badges (On Track, At Risk, Completed),
Navigation Bar, Toggle (My Goals / Our Goals), Progress Bar.

**8. States.** Loading (skeletons), Empty ("No transactions yet" + Add
Transaction), Error (+ Retry).

**9. Visual Design Direction.** Colour palette swatches (Primary #10B981,
Secondary #6366F1, Accent #F59E0B, Success #22C55E, Error #EF4444, Neutral
#6B7280); Typography (Headings **Inter Bold**, Body Inter Regular, Numbers Inter
Semibold); Icons row; Illustrations row; Brand Style keywords (Clean, Modern,
Friendly, Trustworthy, Motivational).
→ **Conflict:** "Inter Bold" headings. Spec §17.4 wins: Plus Jakarta Sans.

---

## Board 2 — "Mobile App Design Specifications"

Darker, denser board. Deep-navy header band with the SpendTogether logo,
"Complete visual, interaction and component guide for the Income, Expense &
Savings app", Platform "Android & iOS (React Native + Expo)", and Design
Philosophy "Simple. Clean. Intuitive. Built for individuals and couples."

**Legibility note:** several panels on this board are rendered at low resolution
with visibly garbled or duplicated label text (notably the typography specimen
column, the "Screen Flow & User Journeys" captions, the "Screens — Additional
States" panel and parts of the "Key Design considerations" row). Where a label
cannot be read with confidence it is described below only in the terms that are
legible, and **no value from this board is used anywhere in the plan** — the
spec's tokens, palette and type scale are the only source. This is a source
quality problem, not a specification gap.

### Panels

**1. Brand & Visual Identity.** 1.1 Logo & app icon. 1.2 Colour palette —
Primary #10B981 (Teal Green), Secondary #6366F1 (Indigo), Accent #F59E0B
(Amber), Success #22C55E (Green), Error #EF4444 (Red), Neutral #6B7280 (Gray) /
#111827 (Deep Navy).
→ **Conflict:** the Accent swatch is drawn purple and the Secondary swatch grey;
several labels are garbled. Spec §17.1 resolves this — the **hex values win**.

**2. App Navigation Pattern.** Phone mock of the dashboard ("Good morning, Alex
· August 2025", "Available this month $850", Income $1,200 / Expenses $570 /
Saved $300 / Remaining $330, spending-by-category icon row, savings goals) with
a five-tab legend — Home ("Financial overview"), Activity ("Transactions list"),
Goals ("Savings goals"), Insights ("Charts & analytics"), Profile ("Settings &
account") — plus a Floating Action Button for "Add Transaction (Income /
Expense / Savings)".
→ This board's **five tabs + FAB** is the arrangement the spec adopts (§12.2).
Its **$850 hero** is the arrangement the spec rejects (correction #1).

**3. UI Components.** 3.1 Buttons (Primary / Secondary / Tertiary; Normal,
Pressed, Disabled). 3.2 Input fields (label, text entry, currency select).
3.3 Cards (goal title, $600 / $1,200, 50% progress bar). 3.4 Icons (Home,
Activity, Add, Goals, Insights, Profile). 3.5 Chart styles (Pie, Bar, Line,
Area).

**4. Screen Flow & User Journeys.** Four columns — Onboarding, Authentication,
Setup, Main App — each a short captioned list. Caption text is largely
unreadable at this resolution; the column headings and step counts are legible.

**5. App Screens — Full Flow.** Ten small mocks: 1 Welcome · 2 Login ·
3 Register · 4 Dashboard · 5 (Goal creation) · 6 (Transaction button) ·
7 Insights · 8 Goals · 9 Goal Details · 10 Dashboard/Profile settings. Several
captions on this row are garbled.

**6. Screens — Additional States.** Empty state, loading state and error state
treatments, with a list of accompanying rules. Body text is largely unreadable.

**7. Data visualization & Charts.** Spending Breakdown (pie, $570 total, Food
30% / Bills 25% / Transport 20% / Shopping 15% / Other 10%), Income vs Expenses
(grouped bars), Savings Progress (Vacation 40%, New Laptop 50%, Emergency Fund
25%), Monthly Comparison (line, May–Aug).
→ **Conflict:** the pie legend repeats the invented percentages. Correction #2
overrides them.

**8. Component Hierarchy.** A `GoalCard` anatomy diagram — Goal Icon, Goal
Type, Goal Name, Progress Bar, Progress %, Target Date — plus a nested
component-structure tree (`GoalCard → CardContainer → GoalHeader → Icon + Title
+ Type`, `ProgressSection → ProgressBar + Amounts + %`, `MetaInfo → Date +
Status + Contributor`).

**9. Key Design considerations.** Six tiles: Mobile-first (optimized for Android
and iOS), Clean & Modern UI (simple, minimal, friendly), Colour-Coded Categories
(quick visual recognition), Readable Typography (clear hierarchy), Accessible
(high contrast and large touch targets). Tile captions are partly garbled.

**10. Key User Interactions.** Six tiles: Tap (open screen/action), Swipe
(navigate / switch tabs), Long Press (edit / more options), Pull to Refresh
(update data), Bottom Sheet (quick actions).

**11. Design System — Do's & Don'ts.**
*Do:* use consistent spacing · keep interactions simple · use clear visual
hierarchy · ensure good contrast · use friendly, positive language.
*Don't:* overload with charts · use complex jargon · make users enter too much
data · use too many colours · hide important actions.
→ These principles are compatible with spec §18.2, §19 and §20 and may be used
as-is.

---

## Where the board content is authoritatively replaced

| Board topic | Authoritative source |
|---|---|
| Navigation, tabs, global Add, routes | spec §12 (digest §12) |
| Every screen's content and states | spec §13 (SCR-01…SCR-22), §19.2 |
| Component inventory, props, behaviour | spec §14.3 |
| Charts, data and encodings | spec §16 (C-01…C-07) |
| Colour, contrast, financial meaning | spec §17.1–17.3 |
| Typography | spec §17.4 |
| Spacing, radius, elevation, motion, z-index, breakpoints | spec §18 |
| Every number shown in a mockup | spec §6.5 reference dataset |
