# API contract (generated)

> **Generated from `packages/schemas/src/endpoints.ts`. Do not edit by hand.**
> Regenerate with `pnpm --filter @spendtogether/schemas contract:doc`. `pnpm test`
> fails when this file is out of date.

Base path `/api/v1`. JSON, snake_case, ISO 8601 dates, money as
`{amount_minor, currency, formatted}` (spec §10.1). Every error uses the envelope
`ErrorEnvelope` (§10.2). *Errors* lists every code an endpoint can return: its own
codes plus those implied by its shape (session → UNAUTHENTICATED, input →
VALIDATION_FAILED, path id → NOT_FOUND, writes and auth → RATE_LIMITED, always INTERNAL).

43 endpoints: 23 from §10.3, 18 from §10.4, 1 from ADR-012, 1 from ADR-003.

| Endpoint | Purpose | Request | Response | Status | Errors | Access | Source | Client key |
|---|---|---|---|---|---|---|---|---|
| `POST /auth/register` | Create account | body `RegisterRequest` | `AuthSession` | 201 | CONFLICT, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | §10.3 | `register` |
| `POST /auth/login` | Start session | body `LoginRequest` | `AuthSession` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | §10.3 | `login` |
| `POST /auth/logout` | End session on this device | — | — (204) | 204 | UNAUTHENTICATED, RATE_LIMITED, INTERNAL | session | §10.3 | `logout` |
| `POST /auth/refresh` | Refresh native tokens | body `RefreshRequest` | `AuthTokens` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | §10.3 | `refresh` |
| `POST /auth/forgot-password` | Send reset instructions | body `ForgotPasswordRequest` | `AcknowledgedResponse` | 202 | VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | §10.4 | `forgotPassword` |
| `POST /auth/reset-password` | Set a new password | body `ResetPasswordRequest` | — (204) | 204 | UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | §10.4 | `resetPassword` |
| `POST /auth/verify` | Confirm an email link or phone code | body `VerifyRequest` | `AuthSession` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | §10.4 | `verify` |
| `POST /auth/verify/resend` | Send a new verification code or link | body `ResendVerificationRequest` | `AcknowledgedResponse` | 202 | VALIDATION_FAILED, RATE_LIMITED, INTERNAL | public | ADR-012 | `resendVerification` |
| `GET /me` | Own profile | — | `Me` | 200 | UNAUTHENTICATED, INTERNAL | session | §10.4 | `getMe` |
| `PATCH /me` | Update profile, base currency, time zone | body `PatchMeRequest` | `Me` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | session | §10.4 | `patchMe` |
| `GET /transactions` | List own transactions | query `ListTransactionsQuery` | `ListTransactionsResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.3 | `listTransactions` |
| `POST /transactions` | Create; server converts to base | body `CreateTransactionRequest` | `Transaction` | 201 | FX_UNAVAILABLE, UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | session, idempotent | §10.3 | `createTransaction` |
| `GET /transactions/:id` | Transaction detail | params `IdParams` | `Transaction` | 200 | UNAUTHENTICATED, NOT_FOUND, INTERNAL | session | §10.3 | `getTransaction` |
| `PATCH /transactions/:id` | Edit; re-converts on amount, currency or date | params `IdParams`<br>body `PatchTransactionRequest` | `Transaction` | 200 | FX_UNAVAILABLE, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.3 | `patchTransaction` |
| `DELETE /transactions/:id` | Soft delete; returns undo_until | params `IdParams` | `DeleteTransactionResponse` | 200 | UNAUTHENTICATED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.3 | `deleteTransaction` |
| `POST /transactions/:id/restore` | Undo a soft delete | params `IdParams` | `Transaction` | 200 | UNAUTHENTICATED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | ADR-003 | `restoreTransaction` |
| `GET /insights/daily` | Daily insights | query `InsightsQuery` | `InsightsResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.3 | `insightsDaily` |
| `GET /insights/weekly` | Weekly insights (ISO week) | query `InsightsQuery` | `InsightsResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.3 | `insightsWeekly` |
| `GET /insights/monthly` | Monthly insights | query `InsightsQuery` | `InsightsResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.3 | `insightsMonthly` |
| `GET /goals` | List goals | query `ListGoalsQuery` | `ListGoalsResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.3 | `listGoals` |
| `POST /goals` | Create goal | body `CreateGoalRequest` | `GoalDetail` | 201 | COUPLE_REQUIRED, UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | session | §10.3 | `createGoal` |
| `GET /goals/:id` | Goal detail with computed metrics | params `IdParams` | `GoalDetail` | 200 | UNAUTHENTICATED, NOT_FOUND, INTERNAL | session | §10.3 | `getGoal` |
| `PATCH /goals/:id` | Edit name, target, date, icon | params `IdParams`<br>body `PatchGoalRequest` | `GoalDetail` | 200 | GOAL_ARCHIVED, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.3 | `patchGoal` |
| `DELETE /goals/:id` | Delete goal and its contributions | params `IdParams` | — (204) | 204 | GOAL_ARCHIVED, UNAUTHENTICATED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.3 | `deleteGoal` |
| `POST /goals/:id/contributions` | Add contribution | params `GoalIdParams`<br>body `CreateContributionRequest` | `Contribution` | 201 | GOAL_ARCHIVED, FX_UNAVAILABLE, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session, idempotent | §10.3 | `createContribution` |
| `GET /goals/:id/contributions` | Contribution history | params `GoalIdParams`<br>query `PageQuery` | `ListContributionsResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, INTERNAL | session | §10.3 | `listContributions` |
| `PATCH /goals/:id/contributions/:cid` | Correct a contribution | params `ContributionParams`<br>body `PatchContributionRequest` | `Contribution` | 200 | GOAL_ARCHIVED, FX_UNAVAILABLE, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.4 | `patchContribution` |
| `DELETE /goals/:id/contributions/:cid` | Remove a contribution | params `ContributionParams` | — (204) | 204 | GOAL_ARCHIVED, UNAUTHENTICATED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.4 | `deleteContribution` |
| `GET /couple` | Couple state | — | `CoupleState` | 200 | UNAUTHENTICATED, INTERNAL | session | §10.3 | `getCouple` |
| `POST /couple/invite` | Invite partner | body `InviteRequest` | `Invitation` | 201 | CONFLICT, UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | session | §10.3 | `invitePartner` |
| `POST /couple/invitations/:id/accept` | Accept invitation | params `InvitationParams`<br>body `InvitationTokenRequest` | `CoupleState` | 200 | CONFLICT, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.3 | `acceptInvitation` |
| `POST /couple/invitations/:id/cancel` | Cancel pending invitation | params `InvitationParams` | `Invitation` | 200 | CONFLICT, UNAUTHENTICATED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.4 | `cancelInvitation` |
| `POST /couple/invitations/:id/resend` | Resend invitation | params `InvitationParams` | `Invitation` | 200 | CONFLICT, UNAUTHENTICATED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.4 | `resendInvitation` |
| `POST /couple/invitations/:id/decline` | Decline invitation | params `InvitationParams`<br>body `InvitationTokenRequest` | `Invitation` | 200 | CONFLICT, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.4 | `declineInvitation` |
| `DELETE /couple` | End couple (BR-18) | — | `CoupleState` | 200 | CONFLICT, UNAUTHENTICATED, RATE_LIMITED, INTERNAL | session | §10.3 | `endCouple` |
| `GET /invitations/by-token/:token` | Public landing: inviter first name only | params `InvitationTokenParams` | `PublicInvitation` | 200 | NOT_FOUND, INTERNAL | public | §10.4 | `getInvitationByToken` |
| `GET /categories` | Default and custom categories | query `ListCategoriesQuery` | `ListCategoriesResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.4 | `listCategories` |
| `POST /categories` | Create custom category | body `CreateCategoryRequest` | `Category` | 201 | CONFLICT, UNAUTHENTICATED, VALIDATION_FAILED, RATE_LIMITED, INTERNAL | session | §10.4 | `createCategory` |
| `PATCH /categories/:id` | Edit or archive custom category | params `IdParams`<br>body `PatchCategoryRequest` | `Category` | 200 | CONFLICT, UNAUTHENTICATED, VALIDATION_FAILED, NOT_FOUND, RATE_LIMITED, INTERNAL | session | §10.4 | `patchCategory` |
| `GET /activity` | Own transactions and contributions, merged | query `ActivityQuery` | `ActivityResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.4 | `getActivity` |
| `GET /home/summary` | Home dashboard in one round trip | query `HomeSummaryQuery` | `HomeSummaryResponse` | 200 | UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.4 | `getHomeSummary` |
| `GET /currencies` | Supported currencies | — | `ListCurrenciesResponse` | 200 | UNAUTHENTICATED, INTERNAL | session | §10.4 | `listCurrencies` |
| `GET /exchange-rates` | USD-based rates for a date | query `ExchangeRatesQuery` | `ExchangeRatesResponse` | 200 | FX_UNAVAILABLE, UNAUTHENTICATED, VALIDATION_FAILED, INTERNAL | session | §10.4 | `getExchangeRates` |
