# Frontend plan — overview

## Goal

Deliver the complete SpendTogether web frontend — all 22 screens, every state, WCAG 2.2
AA, running against a mock API that implements the frozen contract and enforces the real
business rules — before any backend exists. At the end of F13 the product is fully
demonstrable and reviewable; only the data is mocked.

## Principles

**The contract is frozen early and the mock is honest.** The mock backend is not a
convenience that returns happy paths. It enforces couple privacy (BR-05), idempotency,
conversion at the record date's rate, goal completion and reversal (BR-11), and returns
`409 COUPLE_REQUIRED`, `409 GOAL_ARCHIVED` and real validation errors. A frontend built
against an honest mock is a frontend that works against the real API.

**All money maths happens in one pure package.** No component, hook or route computes a
total. They call `packages/domain`. This is what makes 100% coverage on the numbers
achievable and meaningful.

**Tokens, not values.** No component hard-codes a colour, size, radius, duration or
z-index. Adding a missing token is correct; inlining a value is not.

**Accessibility is built in, not bolted on.** Radix primitives from F3, axe running per
component state in Storybook from F3, keyboard paths in every UI ticket's acceptance
check. F13 verifies; it does not remediate.

**Every number on screen traces to the corrected reference dataset** (spec §6.5), never
to the design boards.

## Phase map

Dependencies flow strictly downward. No phase depends on anything built later, and no
frontend phase depends on a real Supabase.

```
F0  Foundation ─────────────┐
                            ├─→ F1  Contract freeze (schemas)
                            │       │
                            │       ├─→ F2  Domain package (formulas)
                            │       │       │
                            │       └───────┼─→ F4  MSW mock backend
                            │               │       │
                            └─→ F3  Design system    │
                                    │               │
                                    └───────┬───────┘
                                            ▼
                                        F5  App shell & navigation
                                            │
              ┌─────────────────────────────┼──────────────┬──────────────┐
              ▼                             ▼              ▼              ▼
          F6 Auth/onboarding          F7 Transactions   F9 Goals     F10 Couple
                                            │              │              │
                                            └──→ F8 Home & Insights ←─────┘
                                                        │
                                                   F11 Profile & settings
                                                        │
                                                   F12 PWA & offline
                                                        │
                                                   F13 Hardening & acceptance
```

F6–F11 are drawn in parallel because their *dependencies* allow it. Executed by one
person they run in the listed order; F8 genuinely needs F7's transaction shapes and F9's
goal cards, and F11's base-currency banner needs F8's dashboards to show it over.

| Phase | Name | Est. (days) | Uncertainty |
|---|---|:-:|:-:|
| F0 | Foundation | 3 | Medium — new majors (R-01) |
| F1 | Contract freeze — `packages/schemas` | 4 | Low |
| F2 | Domain package — `packages/domain` | 6 | Medium — rounding/timezone edges |
| F3 | Design system | 9 | **High** — 23 components × full state matrix |
| F4 | MSW mock backend | 6 | Medium — rule enforcement, not just stubs |
| F5 | App shell & navigation | 4 | Medium — intercepted routes |
| F6 | Auth & onboarding UI | 4 | Low |
| F7 | Transactions | 7 | Medium |
| F8 | Home dashboard & Insights | 7 | Medium — 7 charts + table views |
| F9 | Goals & contributions | 6 | Low |
| F10 | Couple & invitations | 4 | Low |
| F11 | Profile & settings | 4 | Low |
| F12 | PWA & offline | 5 | **High** — outbox state machine |
| F13 | Hardening & frontend acceptance | 7 | **High** — 22 screens × 5 widths × 4 states |
| | **Total** | **76 days** | ≈ 15 working weeks for one engineer |

Estimates are working days for one experienced engineer, and they include writing the
tests each phase owes. They do not include review turnaround or the approval gate itself.
The three high-uncertainty phases (F3, F12, F13) carry roughly ±30%; the rest ±15%.

## Definition of done for the frontend

The frontend is complete when `frontend-acceptance.md` passes in full. In summary:

- All 22 screens (SCR-01…SCR-22) built at 320 / 360 / 768 / 1024 / 1440 px.
- Every state in §19.2 implemented for every primary screen: loading, empty, error,
  offline, plus partial data, foreign currency, and couple/non-couple where applicable.
- Playwright covers flows 7.1–7.10 plus offline sync and the two-user couple scenario,
  green against MSW.
- `packages/domain` at 100% line and branch coverage with T-01…T-16 asserted.
- No serious or critical axe violations on any screen state.
- WAC-20's frontend half met: LCP ≤ 2.5 s on the Lighthouse mobile profile, first-load JS
  ≤ 180 kB gzip on `/home`.
- Every FR and WAC with a frontend component is green in `traceability-matrix.md`.
- `NEXT_PUBLIC_API_MODE=live` still builds and runs — it simply has no server to talk to
  yet. The switch is proven, not theoretical.

## What the frontend deliberately does not do

It does not authenticate anyone for real, persist anything across a browser profile
reset, send an email or SMS, or compute an exchange rate from a live provider. Those
arrive in the backend plan, and B8 swaps them in domain by domain behind
`NEXT_PUBLIC_API_MODE` without redesigning a single screen.
