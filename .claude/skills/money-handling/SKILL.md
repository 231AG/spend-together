---
name: money-handling
description: Rules and helpers for any code that touches an amount, a currency, an exchange rate or a financial formula in SpendTogether. Load before writing or reviewing code that adds, converts, rounds, formats or displays money, or that computes a period summary or goal metric.
---

# money-handling

Every formula lives in `packages/domain` (spec §6). Call it; never re-implement it.

## The rules

1. **Money is integer minor units** (`MoneyMinor`, `bigint` in Postgres). Never a float,
   never `parseFloat`/`Number()` on an amount, never `toFixed` on money. The
   `no-float-money` lint rule catches the common slips.
2. **Exchange rates are decimal strings** carried into `Decimal` from `@spendtogether/domain`
   (40 digits, ties away from zero). Never hold a rate as a JS number.
3. **Round once, half away from zero** (`roundHalfAwayFromZero`), at the last step. Totals
   sum already-rounded converted values and are never re-converted (§6.1).
4. **Percentages are full precision**; `roundPct1` only for display.
5. **Conversion can fail**: `convert` returns `AMOUNT_TOO_SMALL` for a positive amount that
   rounds to 0 (ADR-005). Surface it as the `amount` field error, never store 0.
6. **Contributions are not expenses** (BR-02). `SavingsContribution` has no category.
7. **"Today" is a parameter** in the user's time zone (`localDate(clock.now(), tz)`),
   never `new Date()` inside a formula.
8. **Never copy a number from the design boards.** Test against
   `packages/domain/test/fixtures/reference-dataset.ts` (spec §6.5).

## Which function

| Need | Function |
|---|---|
| Parse typed input / show minor units | `parseMajor(text, exponent)` / `toMajorString(amount, exponent)` |
| Period boundaries, days elapsed | `periodContaining`, `previousPeriod`, `daysElapsed` |
| F-01…F-06 | `periodTotals` |
| F-07 / F-08, F-09 / F-10 | `avgDailySpending` / `categoryTotals` / `periodChangePct`, `savingsRateChangePts` |
| F-11…F-14 | `goalBalance`, `remainingAmount`, `progressPct`, `daysRemaining` |
| F-15…F-17 (ADR-004) | `requiredPace` |
| F-18, F-20 | `currentPaceDaily`, `projectedCompletion` |
| F-19 (inject thresholds from `app_config`) | `goalStatus` |
| F-21 | `contributorShares` |
| F-22…F-24 | `crossRate`, `convert`, `rateForDate` |

## If a formula seems missing

Add it to `packages/domain` with a test tagged by its spec ID, keeping 100% coverage
(`pnpm test:domain`). Do not compute it inline in a route, component or mock handler.
