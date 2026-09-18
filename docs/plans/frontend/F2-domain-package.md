# F2 — Domain package (`packages/domain`)

## 1. Objective

Implement every financial formula in the specification — F-01 through F-24, goal status,
rounding, and period boundaries — as one pure TypeScript package with no framework,
database or UI imports, and prove it with the sixteen mandated test cases at 100% line
and branch coverage. This package is the single place in the product where arithmetic
happens to money; the API, server components, the mock backend and the offline client all
call the same functions, so a correct implementation here is correct everywhere.

## 2. Spec references

§6.1 (money representation), §6.2 (F-01…F-10), §6.3 (F-11…F-21), §6.4 (goal status
F-19), §6.5 (worked example / reference dataset), §6.6 (F-22…F-24), §4 BR-02, BR-07,
BR-08, BR-11, BR-16, §23.1 (T-01…T-16), §22 WAC-05, WAC-06, WAC-09, WAC-10, WAC-11,
WAC-13, WAC-14. ADR-004 (pace rounding), ADR-005 (amount too small).

## 3. Prerequisites

F0 complete. F1 complete and approved — the domain returns types the schemas describe.
Owner's answer or acceptance on **Q2** (pace rounding) and **Q9** (whether §10.5's
`current_pace_daily` or F-18 is normative).

## 4. Deliverables

- `src/money.ts` — `MoneyMinor` branded type, constructors, `roundHalfAwayFromZero`,
  exponent-aware conversion between major and minor units.
- `src/period.ts` — BR-16 boundaries: local calendar day, ISO week (Monday–Sunday),
  calendar month, in an arbitrary IANA timezone; `daysElapsedInPeriod` for F-07.
- `src/summary.ts` — F-01…F-10.
- `src/goal.ts` — F-11…F-18, F-20, F-21, and `goalStatus` (F-19).
- `src/fx.ts` — F-22 cross rate, F-23 converted amount, F-24 rate-for-date selection with
  the `fx_estimated` flag.
- `src/errors.ts` — typed results (`AmountTooSmall`, `RateUnavailable`), not exceptions.
- `test/` — T-01…T-16 plus boundary and property tests.
- Coverage gate wired into CI at 100% line and branch for this package only.

## 5. Task breakdown

**F2-01 · Money primitives and rounding** — *Purpose:* everything else builds on this.
Branded `MoneyMinor`; conversion by ISO exponent; `roundHalfAwayFromZero` (note: *not*
JavaScript's default banker-ish `Math.round` behaviour on negatives). *Files:*
`src/money.ts`. *Acceptance:* rounding table asserted at `.5` boundaries positive and
negative; exponents 0, 2 and 3 round-trip; multiplying two `MoneyMinor` values is a
compile error.

**F2-02 · Period boundaries** — *Purpose:* every summary depends on "which records are in
this period", and this is where timezone bugs live. *Files:* `src/period.ts`.
*Acceptance:* **T-13** (23:30 on 31 Aug falls in August for Africa/Monrovia and in
September for Asia/Tokyo) and **T-14** (ISO week starts Monday) pass; `daysElapsed`
returns 17 for 17 September and 31 for a completed August (**T-15**).

**F2-03 · Period summary formulas F-01…F-06** — *Purpose:* the Home and Insights numbers.
Contributions excluded from expenses (BR-02); savings rate returns `null`, not `0` or
`Infinity`, when income is zero. *Files:* `src/summary.ts`. *Acceptance:* **T-01**
(1200/570/300 → net 630, remaining 330, rate 25.0%) and **T-02** (zero income → N/A,
remaining −50, no throw) pass.

**F2-04 · Category and comparison formulas F-07…F-10** — *Purpose:* average daily
spending, category totals and percentages, previous-period change. *Files:*
`src/summary.ts`. *Acceptance:* **T-15** divisor behaviour; **T-16** previous = 0 yields
a "New" marker rather than a division; category percentages over the reference dataset
sum to 100.0% (Bills 26.3, Food 24.6, Other 18.4, Transport 15.8, Shopping 14.9).

**F2-05 · Goal balance, remaining, progress F-11…F-14** — *Purpose:* derived balances
only (BR-08). *Files:* `src/goal.ts`. *Acceptance:* **T-04** (600 of 1200 → 50%,
remaining 600) and **T-05** (1300 of 1200 → progress capped at 100%, remaining 0) pass.

**F2-06 · Required pace F-15…F-17 (ADR-004)** — *Purpose:* the rounding-order decision,
implemented once. Full-precision daily quotient; weekly and monthly derived from it;
each of the three rounded exactly once. `max(days, 1)` while the target date is today or
later; "Overdue" (no value) once it has passed. *Files:* `src/goal.ts`. *Acceptance:*
the §6.5 example yields $5.71 / $40.00 / $173.93 and the §10.5 payload `{daily: 571,
weekly: 4000, monthly: 17393}`; **T-06** (target date today, remaining 60 → 60/day, no
division by zero) and **T-07** (target date yesterday → overdue, no number) pass.

**F2-07 · Current pace and projection F-18, F-20** — *Purpose:* "at your pace, done ~5
Dec". *Files:* `src/goal.ts`. *Acceptance:* F-18 divides by `min(30, goalAgeInDays, ≥1)`;
F-20 returns "No recent contributions" when pace is zero rather than an infinite date.
Q9 resolution documented in a code comment.

**F2-08 · Goal status F-19** — *Purpose:* the expected-balance method with configurable
thresholds injected, never hard-coded. *Files:* `src/goal.ts`. *Acceptance:* **T-09**
(ratios 0.95 → ON_TRACK, 0.9499 → AT_RISK, 0.75 → AT_RISK, 0.7499 → BEHIND) and **T-10**
(new goal, zero contributions, day 0 → ON_TRACK, because expected = 0) pass; completion
takes precedence over overdue; the §6.5 status check reproduces ratio 1.17 → On Track.

**F2-09 · Contributor share F-21** — *Purpose:* couple goal breakdown. *Files:*
`src/goal.ts`. *Acceptance:* **T-08** (A 480, B 320 on target 2000 → balance 800, shares
60% / 40%) passes.

**F2-10 · FX formulas F-22…F-24 and ADR-005** — *Purpose:* conversion that never silently
loses money. Cross rate via USD; conversion rounded once into the target exponent;
rate-for-date selects the latest rate at or before the date, falling back to the earliest
stored rate flagged `fx_estimated`. A conversion rounding to zero returns a typed
`AmountTooSmall`, never a throw and never a stored 0. *Files:* `src/fx.ts`,
`src/errors.ts`. *Acceptance:* **T-11** (5,000 LRD at 189.39 → $26.40, half away from
zero) and **T-12** (JPY exponent 0, KWD exponent 3) pass; 0.01 LRD → USD returns
`AmountTooSmall`.

**F2-11 · Contribution effect on summaries** — *Purpose:* BR-02's hard boundary. *Files:*
`src/summary.ts`. *Acceptance:* **T-03** (a 100.00 contribution leaves expenses unchanged
and increases recorded savings by 100.00) passes; a contribution can never appear in a
category breakdown — enforced by the type, which has no category field.

**F2-12 · Reference dataset fixture** — *Purpose:* one canonical dataset, shared with F4's
mocks and later with the backend contract tests. *Files:*
`packages/domain/test/fixtures/reference-dataset.ts`. *Acceptance:* the §6.5 table
reproduces end to end, including avg daily $33.53 on 17 September.

**F2-13 · Coverage gate** — *Purpose:* make the 100% requirement enforced rather than
aspirational. *Files:* `packages/domain/vitest.config.ts`, CI job. *Acceptance:*
deleting any branch's test turns CI red.

## 6. Tooling

`decimal.js` 10.6.0 and `date-fns-tz` 3.2.0 — the package's only two runtime
dependencies, and a third requires an ADR. `@vitest/coverage-v8` for the gate. The
`money-handling` project skill is **created here** and is loaded by every later ticket
that touches an amount.

## 7. Testing

This phase is where the specification's own test list is discharged. **T-01 through T-16
all land here**, each tagged in its test name so `traceability-matrix.md` can be verified
by grep. Added beyond the mandated sixteen: property tests that conversion never returns
a negative for a positive input, that progress never exceeds 100, and that summing
already-rounded converted values never re-converts (§6.1's aggregate rule).

Supports **WAC-05, WAC-06, WAC-09, WAC-10, WAC-11, WAC-13, WAC-14** — each is asserted
end-to-end later, but the arithmetic they check is proven here.

## 8. Exit criteria

1. F-01 through F-24, plus goal status, are implemented and exported.
2. **100% line and branch coverage** on `packages/domain`, enforced in CI.
3. T-01…T-16 all pass and are individually tagged.
4. The §6.5 worked example reproduces in full, including the status check at ratio 1.17.
5. The §10.5 required-pace payload reproduces exactly (ADR-004 verified).
6. The package imports nothing but `decimal.js` and `date-fns-tz` — asserted by a test
   that reads its own `package.json` and by the import-boundary lint rule.
7. No ambient `Date` anywhere in the package; the clock is a parameter.
8. A conversion rounding below one minor unit returns a typed result, not an exception.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-03 rounding bugs | 100% branch coverage, explicit `.5` boundary tables, branded types making float math a compile error |
| R-05 timezone errors | `date-fns-tz` with injected clock; T-13/T-14/T-15 are mandated and non-negotiable |
| R-09 the coverage gate stalls unrelated work | The package is written once, here, with its tests; later phases import rather than extend it |
| ADR-004 is overturned after implementation | The pace calculation is one function with one rounding site; reversing it is a half-day, not a rewrite |
| `decimal.js` precision defaults are insufficient for `numeric(24,10)` rates | Configure precision explicitly at module load and assert it in a test |

## 10. Estimate

**6 days.** Roughly: 1 day money and rounding, 1 day period boundaries (the timezone
cases are fiddly), 1.5 days summary formulas, 1.5 days goal formulas including status and
pace, 1 day FX plus the coverage push to 100%. Medium uncertainty — the formulas are
unambiguous but the edge cases are where the time goes.

## 11. Approval gate

Owner reviews: the coverage report showing 100% on this package; a test run listing all
sixteen T- IDs passing; the §6.5 and §10.5 reproductions; and confirmation that ADR-004
matches intent. Then F3 may start.
