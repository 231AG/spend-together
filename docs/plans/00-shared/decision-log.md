# Decision log

On 28 Sep 2026 the owner delegated routine decisions: *"When ever you're stuck with such
decisions, choose the options that makes more sense, and later summarize every decision
you made along the way."* Every decision taken under that delegation is recorded here,
newest last, with what it overrides and how to reverse it. ADRs remain the record for
architectural decisions; this log points to them.

| ID | Date | Phase | Decision | Why | Reverse by |
|---|---|---|---|---|---|
| D-01 | 28 Sep 2026 | F1 | Accepted **Q1 / ADR-003**: Undo uses `POST /transactions/:id/restore`. | The only option that survives closed tabs and offline; already in the frozen contract. | New ADR removing the endpoint; F7 falls back to a delayed delete. |
| D-02 | 28 Sep 2026 | F1/F2 | Accepted **Q3 / ADR-005**: a conversion that rounds below one minor unit is rejected (`AMOUNT_TOO_SMALL`), never stored as 0. | Storing 0 silently corrupts totals, percentages and rates. | New ADR; change `convert` and the 422 copy. |
| D-03 | 28 Sep 2026 | F2 | Accepted **Q2 / ADR-004**: required pace at full precision, each of daily/weekly/monthly rounded once. | Only reading under which §6.5 and §10.5 agree (571 / 4000 / 17393). | One function, `requiredPace`. |
| D-04 | 28 Sep 2026 | F2 | Closed **Q9**: F-18 is normative; §10.5's `current_pace_daily: 769` is illustrative. The reference dataset yields 833 and projects 28 Nov. | The formula is the spec's rule; the JSON example is not derivable from its own history. | Change `currentPaceDaily`. |
| D-05 | 28 Sep 2026 | F2 | **ADR-011**: dropped `date-fns-tz` (and its `date-fns` peer); `Intl.DateTimeFormat` gives the local date. `decimal.js` is the domain's only dependency. | One time-zone operation doesn't justify two packages in the purity-gated core. | Add the dependency back with an ADR. |
| D-06 | 28 Sep 2026 | F2 | `MoneyMinor` is a **branded number**, not `bigint`. Multiplying two amounts is not a compile error (TS cannot forbid `*` on a branded number); `no-float-money`, the helpers and review enforce it instead. | `bigint` would force conversions at every JSON, Zod and chart boundary; amounts stay far below 2^53. | Switch the brand to `bigint` in one module. |
| D-07 | 28 Sep 2026 | F2 | Typed results live in `src/result.ts` (not `errors.ts` as planned). | Holds `Result`, `ok`, `err` as well as the error types. | Rename. |
| D-08 | 28 Sep 2026 | F2 | F-18's goal age counts the creation day (created today → age 1), and the 30-day window is today plus the 29 days before. | Matches "last 30 days" inclusive of today and keeps the divisor ≥ 1 without special cases. | `currentPaceDaily`. |
| D-09 | 28 Sep 2026 | F2 | A **completed** goal past its target date is not overdue: required pace is 0 / 0 / 0 with `overdue: false`. | F-15 says overdue only when "not completed"; status is `completed`. | `requiredPace`. |
| D-10 | 28 Sep 2026 | F2 | F-10 returns `null` for "New" (previous = 0) and the caller shows the absolute change, matching the frozen `Change` schema. Categories tie-break by id; contributor shares keep first-contribution order. | Deterministic output for mocks and snapshot tests. | `periodChangePct`, `categoryTotals`. |
| D-11 | 28 Sep 2026 | F2 | Reference dataset uses deterministic UUIDs for users and categories (`…a001`, `…c001`) so F4's mocks and backend contract tests can share it unchanged. | The contract requires UUIDs. | Fixture file. |
| D-12 | 28 Sep 2026 | F2 | T-12's KWD case uses 1 USD = 0.3065 KWD, JPY 148.2 (the spec gives no rates): 1.234 KWD → 4.03 USD, 1,000 JPY → 6.75 USD. | Realistic rates; the test is about exponents 0 and 3. | Test data only. |
| D-13 | 28 Sep 2026 | F1/F2 | Approval gates delegated: merged F1 (PR #9) and marked F2 Complete once CI is green, without waiting for a separate sign-off. | Owner's delegation; each phase still stops for a status update and summary. | Owner reverts the merge commit. |
