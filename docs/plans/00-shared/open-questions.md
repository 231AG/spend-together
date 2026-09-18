# Open questions

Unresolved items needing the owner's decision, plus assumptions I have **proceeded on**
so the plan could be completed. Anything marked *Assumed* is live in the plan right now
and can be overturned cheaply until the phase that consumes it starts.

Status: **Assumed** (proceeding, reversible), **Open** (needs an answer before the named
phase), **Closed** (decided — kept for the record).

---

## Q1 — Undo has no endpoint in the contract

**Status:** Assumed · **Needed before:** F1 closes · **Impact:** contract, F7, B5

§7.4 and SCR-13 require a 5-second Undo on a soft-deleted transaction, and
`DELETE /transactions/:id` returns `{undo_until}` — but no endpoint restores the row.

**Assumed:** add `POST /transactions/:id/restore` (ADR-003). Idempotent, returns the
restored transaction, 404 if purged or foreign.

**If rejected:** F7's Undo becomes a client-side 5-second delay before issuing the
delete. That loses the undo if the tab closes, behaves badly offline, and makes the
toast lie about what has already happened. Add ~0.5 d to F7.

---

## Q2 — Rounding order for required pace

**Status:** Assumed · **Needed before:** F2 closes · **Impact:** domain, WAC-10, T-06

F-16/F-17 read as multiplying F-15, but using the *rounded* F-15 does not reproduce the
spec's own published figures ($40.00/week, $173.93/month; `{571, 4000, 17393}`).

**Assumed:** compute at full precision, round each of the three outputs once (ADR-004).

**Confidence:** high — it is the only reading under which spec §6.5 and §10.5 agree with
each other.

---

## Q3 — Conversions that round below one minor unit

**Status:** Assumed · **Needed before:** F1 closes · **Impact:** schemas, domain, B1, UX copy

`check (base_amount_minor > 0)` can be violated by a legitimate entry (0.01 LRD → USD
rounds to 0).

**Assumed:** reject with `422 VALIDATION_FAILED`, field message on `amount`: *"This
amount is too small to record in USD. Enter a larger amount."* The `AmountInput` preview
shows the same message before Save (ADR-005).

**If rejected** in favour of storing 0: every total, category percentage and savings rate
downstream silently absorbs a zero. I recommend against it.

---

## Q4 — The seed currency list is never enumerated  ⚠️ highest-value answer

**Status:** Assumed (provisional) · **Needed before:** B1 · **Impact:** seed, MSW fixtures, FX provider check

§11.1 says "every currency in the seed list (including LRD)" but the spec never lists it.
Only USD, LRD, EUR, GBP, NGN appear anywhere (wireframe W-08), and T-12 requires JPY
(exponent 0) and KWD (exponent 3) to exist for the exponent tests.

**Assumed provisional list (12)** — launch market is Liberia, so West/East Africa is
weighted, plus the two exponent edge cases the tests demand:

| Code | Name | Exp | Why |
|---|---|:--:|---|
| USD | US Dollar | 2 | Base of the FX table; Liberia's de-facto second currency |
| LRD | Liberian Dollar | 2 | Launch market; named explicitly in §11.1 |
| EUR | Euro | 2 | W-08 |
| GBP | Pound Sterling | 2 | W-08 |
| NGN | Nigerian Naira | 2 | W-08 |
| GHS | Ghanaian Cedi | 2 | Regional |
| SLE | Sierra Leonean Leone | 2 | Neighbouring market |
| KES | Kenyan Shilling | 2 | Regional |
| ZAR | South African Rand | 2 | Regional |
| CAD | Canadian Dollar | 2 | Common diaspora remittance corridor |
| JPY | Japanese Yen | **0** | Required by T-12 |
| KWD | Kuwaiti Dinar | **3** | Required by T-12 |

**Please confirm or replace.** This is the single answer that most changes fixture data.
Currencies the provider does not return get `is_active = false` at the B6 pre-build
check, so an over-long list is safer than a short one.

---

## Q5 — The default category list is never enumerated  ⚠️ highest-value answer

**Status:** Assumed (high confidence) · **Needed before:** B1 · **Impact:** seed, fixtures, pickers

The DDL has `is_default`, §17.3 defines nine category colour tokens, and W-09 shows
"14 categories" — but no list exists.

**Assumed:** 9 expense + 5 income = **14**, where the nine expense categories map
exactly onto the nine `cat-*` colour tokens in §17.3. The arithmetic and the token count
agreeing at 14 makes this close to certain.

| Type | Name | Token | Lucide icon |
|---|---|---|---|
| expense | Food | `cat-food` | `utensils` |
| expense | Bills | `cat-bills` | `receipt` |
| expense | Transport | `cat-transport` | `bus` |
| expense | Shopping | `cat-shopping` | `shopping-bag` |
| expense | Health | `cat-health` | `heart-pulse` |
| expense | Education | `cat-education` | `graduation-cap` |
| expense | Entertainment | `cat-entertainment` | `clapperboard` |
| expense | Family | `cat-family` | `users` |
| expense | Other | `cat-other` | `circle-dashed` |
| income | Salary | `cat-bills` | `wallet` |
| income | Business | `cat-family` | `briefcase` |
| income | Gift | `cat-health` | `gift` |
| income | Investment | `cat-transport` | `trending-up` |
| income | Other | `cat-other` | `circle-dashed` |

Income colour tokens are reused because §17.3 defines no income-specific palette, and
income is never shown in the category donut (C-01 is expense-only, F-08/F-09). Confirm
the five income names — those are my invention, not the spec's.

---

## Q6 — Pending-couple collision

**Status:** Assumed · **Needed before:** B3 · **Impact:** `accept_invitation()`, SCR-19

BR-06 says at most one active *or pending* couple per user, but nothing enforces the
pending half for an **invitee**: `one_open_couple_per_user` covers members, and
`one_pending_invite_per_couple` is scoped per couple. Two people can therefore both have
a pending invitation out to the same person. `accept_invitation()` correctly lets only
one succeed, so this is not a privacy or integrity hole — but the loser's state is
undefined.

**Assumed:** when an invitee accepts one invitation, every other `pending` invitation
addressed to that same identity transitions to `declined`, inside the same transaction.
The inviter's SCR-19 pending card then shows "Declined", which §7.8 already specifies as
a state.

**Alternative:** a new `superseded` enum value — more honest, but it changes the DDL
enum and every UI that renders invitation status.

---

## Q7 — Does the frontend gate include PWA/offline (F12)?

**Status:** Assumed · **Needed before:** F11 ends · **Impact:** critical path, ~5 days

FR-25 (offline) is **SHOULD**, not MUST — the only substantial SHOULD in the spec.

**Assumed:** F12 stays inside the frontend gate, so "frontend complete" means the whole
spec including WAC-17.

**The cut, if you want it:** move F12 to after B8 (integration). Saves ~5 days on the
path to a reviewable frontend; costs a second pass over transaction and contribution
mutation paths, because retrofitting an outbox is harder than building against one. I
recommend keeping it where it is, but it is the cleanest available schedule lever.

---

## Q8 — Pinned clock for fixtures

**Status:** Assumed · **Impact:** all fixtures and tests

**Assumed:** all fixtures and the MSW deterministic clock are pinned to
**2026-09-17T12:00:00Z**, the spec's own reference date, so §6.5, §10.5, §16.3 and
W-01…W-09 reproduce verbatim. Cost: test data reads as historical during development.

---

## Q9 — `current_pace_daily` in the §10.5 example is not reproducible

**Status:** Open (low impact) · **Needed before:** F2 closes

§10.5 returns `current_pace_daily: 769` ($7.69/day), but F-18 over the W-06 contribution
history ($50 on 15 Sep + $200 on 1 Sep, both inside the last 30 days, ÷ 30) gives $8.33.
The `projected_completion_date` of 5 Dec *is* consistent with 769, so the JSON is
internally coherent — it just does not derive from the wireframe's history.

**Recommendation:** treat §10.5 as illustrative and F-18 as normative; test F-18 against
its own stated formula. Flagging only so nobody "fixes" the domain to match the example.

---

## Q10 — Minimum supported width: 320 or 360?

**Status:** Assumed · **Impact:** F13

§20 and §21 promise support to **320 px**; WAC-16 only tests **360–430 px**.

**Assumed:** test at 320, 360, 768, 1024 and 1440. Keep the stronger promise, widen the
coverage. Cost is negligible.

---

## Q11 — Deployment target for Phase 1

**Status:** Open · **Needed before:** B10 · **Impact:** B10 estimate ±2 days

§24.2 offers Vercel Hobby (free, non-commercial, pauses after 7 days, no backups) for
build-and-demo, then Hetzner VPS **or** Vercel Pro for launch. The plan assumes Vercel
for preview/staging throughout and defers the production choice to B10.

Worth deciding before B10 starts: a VPS path adds Docker, Nginx, Certbot, PM2 and the
hardening checklist (~+2 days) but has materially lower running cost at scale.

---

## Q12 — Who owns the FX provider accounts and the Twilio/Resend credentials?

**Status:** Open · **Needed before:** B6 (FX) and B4 (SMS/email)

fxfeed.io needs an API key; Twilio SMS is a per-message cost; Resend needs a verified
domain with SPF, DKIM and DMARC records. These are procurement and DNS tasks with real
lead time, not code. Flagging early so they are not discovered on the day B4 starts.

---

## Closed

| # | Item | Resolution |
|---|---|---|
| C-1 | Correction #7 cites "F-17" for the `max(days,1)` rule | Typo in the source; §6.3 defines it under **F-15**. Digest reproduces both with a note. No behavioural ambiguity. |
| C-2 | Correction #2 cites "F-11" for category percentage | Typo; §6.2 defines it as **F-09** (F-11 is Goal Balance). Same treatment. |
| C-3 | PDF export of the plans | Owner decided Markdown only, 18 Sep 2026 (ADR-008). |
| C-4 | Component workbench choice | Storybook (ADR-007). |
