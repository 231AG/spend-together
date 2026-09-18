# B6 — Multi-currency

## 1. Objective

Make conversion real: a scheduled `fx-sync` Edge Function pulling daily USD-based rates
from a primary provider with automatic fallback, a pre-launch availability check that
deactivates any currency the provider cannot quote, and a base-currency recalculation job
that re-expresses a user's entire history at each record's own historical rate while
preserving every original amount.

## 2. Spec references

§11.1 (rate source and sync, providers, schedule, staleness), §11.2 (conversion rules),
§11.3 (base currency change), §11.4 (display rules the API must support), §6.6
(F-22…F-24), §9.4 (`recalc_base_amounts`), §24.4 (pg_cron schedule), BR-13, BR-14, BR-15,
WAC-14, WAC-15, T-11, T-12.

## 3. Prerequisites

B1 (the `exchange_rates` and `currencies` tables), B3 (`recalc_base_amounts`), B5 (the
endpoints that consume rates). Owner has provisioned the fxfeed.io fallback key
(open-questions **Q12**).

## 4. Deliverables

- `supabase/functions/fx-sync/` — the Edge Function with a provider abstraction.
- `FxProvider` implementations: ExchangeRate-API (primary) and fxfeed.io (fallback).
- pg_cron schedule at 01:00 UTC with retries at 01:30 and 03:00.
- Pre-build currency availability check, including LRD.
- Base-currency recalculation wired to `PATCH /me` with the `recalculating: true` window.
- Staleness alerting to Sentry at 72 hours.

## 5. Task breakdown

**B6-01 · `FxProvider` abstraction** — `interface FxProvider { latest(): Promise<Record<Code,
Decimal>> }`, selected by `app_config.fx_provider` so swapping providers is a
configuration change, not a deploy (§11.1). *Files:* `supabase/functions/fx-sync/providers/`.
*Acceptance:* both implementations satisfy the interface; switching the config switches
the provider with no code change.

**B6-02 · `fx-sync` Edge Function** — fetch USD-based rates, upsert `exchange_rates` for
today, fall back automatically when the primary fails **or omits a currency**. *Files:*
`supabase/functions/fx-sync/index.ts`. *Acceptance:* §11.1 — a simulated primary outage
transparently uses the fallback; a partial primary response is topped up rather than
discarded.

**B6-03 · pg_cron schedule** — 01:00 UTC daily, retries at 01:30 and 03:00 on failure.
*Files:* `migrations/0008_cron.sql`. *Acceptance:* the schedule exists; a forced failure
triggers exactly the two retries and no more.

**B6-04 · Currency availability pre-check** — before launch, confirm every seeded currency
(LRD included) is quoted; any that is not gets `is_active = false` (§11.1). *Files:*
`scripts/check-currency-availability.ts`. *Acceptance:* the report lists every seeded
currency with its status; inactive currencies disappear from pickers without breaking
existing records that already use them.

**B6-05 · Rate-for-date resolution (F-24)** — latest stored rate with `rate_date ≤ d`;
when none exists (a date before launch), the earliest stored rate flagged
`fx_estimated = true`. *Files:* `server/services/fx-service.ts`. *Acceptance:* a
back-dated transaction converts at its own date's rate; a pre-launch date is flagged
estimated and the API surfaces the flag so the UI can show its info affordance.

**B6-06 · Conversion on write** — transactions convert to the user's base; contributions
convert to **both** the goal currency and the contributor's base (§11.2). Rounding is half
away from zero, once, via `packages/domain`. *Acceptance:* **T-11** (5,000 LRD at 189.39 →
$26.40) and **T-12** (JPY exponent 0, KWD exponent 3) pass through the real API;
**WAC-14** — the value the client previewed equals the value stored.

**B6-07 · Base-currency recalculation** — `PATCH /me` sets the new base and enqueues
`recalc_base_amounts(user)`; responses carry `recalculating: true` while it runs. *Files:*
`server/services/profile-service.ts`. *Acceptance:* **WAC-15** — every total is
re-expressed, every `amount_minor` and `currency` original is untouched, and **goal
currencies do not change** (BR-15).

**B6-08 · Recalculation performance** — load-test at 10,000 and 100,000 records. *Files:*
`scripts/load-test-recalc.ts`. *Acceptance:* §11.3 — under 5 seconds for 10,000 records;
the 100k figure is measured and documented even if slower, so the limit is known rather
than discovered by a user.

**B6-09 · Staleness alerting** — no rate stored in 72 h raises a Sentry alert; the API
exposes "rates last updated" for the currency preview. *Acceptance:* §11.1 — a simulated
three-day gap alerts, and users see the age of the rates rather than silently wrong
numbers.

**B6-10 · Provider attribution** — ExchangeRate-API Open Access requires attribution; the
API exposes what the UI needs for the Settings → Currency and footer links (built in
F11-09). *Acceptance:* attribution data is served and correct — a licensing obligation.

## 6. Tooling

Supabase Edge Functions (Deno runtime), pg_cron. External: ExchangeRate-API (no key),
fxfeed.io (key from Q12).

## 7. Testing

Unit tests for each provider against recorded fixtures; integration tests for the fallback
path and the partial-response top-up; a test that a back-dated record converts at its own
date; the recalculation load test; and end-to-end **T-11** and **T-12** through the real
API.

Covers **WAC-14**, **WAC-15**, and the currency half of **T-11**/**T-12** at the
integration level.

## 8. Exit criteria

1. `fx-sync` runs on schedule and upserts rates for every active currency.
2. The fallback engages automatically on primary failure **or omission**.
3. Every seeded currency is confirmed available, or deactivated with a record of why.
4. Conversion uses the rate for the **record's own date**, not today's (BR-14).
5. `fx_estimated` is set and surfaced when a pre-launch date is used.
6. T-11 and T-12 pass through the real API.
7. Base-currency change re-expresses all totals, preserves all originals, and leaves goal
   currencies untouched.
8. Recalculation completes within 5 s for 10,000 records; the 100k figure is documented.
9. A 72-hour staleness gap alerts to Sentry.
10. Provider attribution is served.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-07 provider unreliability or missing currencies | Primary plus automatic fallback behind the interface; the availability pre-check deactivates unquotable currencies rather than failing silently; retries at 01:30 and 03:00 |
| R-08 recalculation slow or partial | One transaction so it cannot half-apply; load-tested at 10× the stated target; UI keeps prior values behind a banner meanwhile |
| Free-tier provider rate limits or terms change | The abstraction makes swapping a config change; the fallback is already a second vendor |
| Rates silently stale, quietly distorting every total | 72-hour Sentry alert **and** user-visible "rates last updated", because an alert nobody reads is not a control |
| A user changes base currency twice in quick succession | The second enqueue waits on the first; the endpoint is idempotent per target currency |

## 10. Estimate

**6 days** — flagged high-uncertainty (±30%), because the dependency is external.
Roughly: 1 day the provider abstraction, 1.5 days the Edge Function and schedule, 1 day
conversion on write and rate-for-date, 1.5 days recalculation and its load test, 1 day
availability check, alerting and attribution.

## 11. Approval gate

Owner reviews: a live `fx-sync` run; a forced primary failure using the fallback; a
back-dated foreign-currency transaction converting at its own date; and a base-currency
change on a seeded account showing re-expressed totals with preserved originals. Then B7
may start.
