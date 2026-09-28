import type { z } from 'zod';
import { ActivityQuery, ActivityResponse } from './activity';
import {
  AcknowledgedResponse,
  AuthSession,
  AuthTokens,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ResendVerificationRequest,
  VerifyRequest,
} from './auth';
import {
  Category,
  CreateCategoryRequest,
  ListCategoriesQuery,
  ListCategoriesResponse,
  PatchCategoryRequest,
} from './categories';
import {
  Contribution,
  ContributionParams,
  CreateContributionRequest,
  GoalIdParams,
  ListContributionsQuery,
  ListContributionsResponse,
  PatchContributionRequest,
} from './contributions';
import {
  CoupleState,
  Invitation,
  InvitationParams,
  InvitationTokenRequest,
  InviteRequest,
} from './couple';
import { ExchangeRatesQuery, ExchangeRatesResponse, ListCurrenciesResponse } from './currencies';
import type { ErrorCode } from './errors';
import {
  CreateGoalRequest,
  GoalDetail,
  ListGoalsQuery,
  ListGoalsResponse,
  PatchGoalRequest,
} from './goals';
import { HomeSummaryQuery, HomeSummaryResponse } from './home';
import { InsightsQuery, InsightsResponse } from './insights';
import { InvitationTokenParams, PublicInvitation } from './invitations';
import { Me, PatchMeRequest } from './me';
import { IdParams, NoContent } from './primitives';
import {
  CreateTransactionRequest,
  DeleteTransactionResponse,
  ListTransactionsQuery,
  ListTransactionsResponse,
  PatchTransactionRequest,
  Transaction,
} from './transactions';

// Every endpoint of the frozen contract (spec §10.3, §10.4, ADR-003). This registry is the
// single list that the typed client, the MSW handlers (F4), the route handlers (B5) and
// the generated docs/plans/00-shared/api-contract.md all read.

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type Source = '§10.3' | '§10.4' | 'ADR-003' | 'ADR-012';

export interface Endpoint<
  P extends z.ZodType | undefined = z.ZodType | undefined,
  Q extends z.ZodType | undefined = z.ZodType | undefined,
  B extends z.ZodType | undefined = z.ZodType | undefined,
  R extends z.ZodType = z.ZodType,
> {
  method: Method;
  /** Path under /api/v1 with `:name` parameters. */
  path: string;
  summary: string;
  source: Source;
  auth: 'public' | 'session';
  params: P;
  query: Q;
  body: B;
  response: R;
  /** Success status. 204 means the body is empty (`response` is `null`). */
  status: 200 | 201 | 202 | 204;
  /** Accepts an `Idempotency-Key` header; replays within 48 h return the first response. */
  idempotent: boolean;
  /** Error codes specific to this endpoint, beyond those implied by its shape. */
  errors: readonly ErrorCode[];
}

function endpoint<
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType = z.ZodType,
>(e: {
  method: Method;
  path: string;
  summary: string;
  source: Source;
  auth?: 'public' | 'session';
  params?: P;
  query?: Q;
  body?: B;
  response: R;
  status?: 200 | 201 | 202 | 204;
  idempotent?: boolean;
  errors?: readonly ErrorCode[];
}): Endpoint<P, Q, B, R> {
  return {
    method: e.method,
    path: e.path,
    summary: e.summary,
    source: e.source,
    auth: e.auth ?? 'session',
    params: e.params as P,
    query: e.query as Q,
    body: e.body as B,
    response: e.response,
    status: e.status ?? 200,
    idempotent: e.idempotent ?? false,
    errors: e.errors ?? [],
  };
}

export const endpoints = {
  // ---- Auth (§10.3, §10.4)
  register: endpoint({
    method: 'POST',
    path: '/auth/register',
    summary: 'Create account',
    source: '§10.3',
    auth: 'public',
    body: RegisterRequest,
    response: AuthSession,
    status: 201,
    errors: ['CONFLICT'],
  }),
  login: endpoint({
    method: 'POST',
    path: '/auth/login',
    summary: 'Start session',
    source: '§10.3',
    auth: 'public',
    body: LoginRequest,
    response: AuthSession,
    errors: ['UNAUTHENTICATED'],
  }),
  logout: endpoint({
    method: 'POST',
    path: '/auth/logout',
    summary: 'End session on this device',
    source: '§10.3',
    response: NoContent,
    status: 204,
  }),
  refresh: endpoint({
    method: 'POST',
    path: '/auth/refresh',
    summary: 'Refresh native tokens',
    source: '§10.3',
    auth: 'public',
    body: RefreshRequest,
    response: AuthTokens,
    errors: ['UNAUTHENTICATED'],
  }),
  forgotPassword: endpoint({
    method: 'POST',
    path: '/auth/forgot-password',
    summary: 'Send reset instructions',
    source: '§10.4',
    auth: 'public',
    body: ForgotPasswordRequest,
    response: AcknowledgedResponse,
    status: 202,
  }),
  resetPassword: endpoint({
    method: 'POST',
    path: '/auth/reset-password',
    summary: 'Set a new password',
    source: '§10.4',
    auth: 'public',
    body: ResetPasswordRequest,
    response: NoContent,
    status: 204,
    errors: ['UNAUTHENTICATED'],
  }),
  verify: endpoint({
    method: 'POST',
    path: '/auth/verify',
    summary: 'Confirm an email link or phone code',
    source: '§10.4',
    auth: 'public',
    body: VerifyRequest,
    response: AuthSession,
    errors: ['UNAUTHENTICATED'],
  }),

  resendVerification: endpoint({
    method: 'POST',
    path: '/auth/verify/resend',
    summary: 'Send a new verification code or link',
    source: 'ADR-012',
    auth: 'public',
    body: ResendVerificationRequest,
    response: AcknowledgedResponse,
    status: 202,
  }),
  // ---- Me (§10.4)
  getMe: endpoint({
    method: 'GET',
    path: '/me',
    summary: 'Own profile',
    source: '§10.4',
    response: Me,
  }),
  patchMe: endpoint({
    method: 'PATCH',
    path: '/me',
    summary: 'Update profile, base currency, time zone',
    source: '§10.4',
    body: PatchMeRequest,
    response: Me,
  }),

  // ---- Transactions (§10.3, ADR-003)
  listTransactions: endpoint({
    method: 'GET',
    path: '/transactions',
    summary: 'List own transactions',
    source: '§10.3',
    query: ListTransactionsQuery,
    response: ListTransactionsResponse,
  }),
  createTransaction: endpoint({
    method: 'POST',
    path: '/transactions',
    summary: 'Create; server converts to base',
    source: '§10.3',
    body: CreateTransactionRequest,
    response: Transaction,
    status: 201,
    idempotent: true,
    errors: ['FX_UNAVAILABLE'],
  }),
  getTransaction: endpoint({
    method: 'GET',
    path: '/transactions/:id',
    summary: 'Transaction detail',
    source: '§10.3',
    params: IdParams,
    response: Transaction,
  }),
  patchTransaction: endpoint({
    method: 'PATCH',
    path: '/transactions/:id',
    summary: 'Edit; re-converts on amount, currency or date',
    source: '§10.3',
    params: IdParams,
    body: PatchTransactionRequest,
    response: Transaction,
    errors: ['FX_UNAVAILABLE'],
  }),
  deleteTransaction: endpoint({
    method: 'DELETE',
    path: '/transactions/:id',
    summary: 'Soft delete; returns undo_until',
    source: '§10.3',
    params: IdParams,
    response: DeleteTransactionResponse,
  }),
  restoreTransaction: endpoint({
    method: 'POST',
    path: '/transactions/:id/restore',
    summary: 'Undo a soft delete',
    source: 'ADR-003',
    params: IdParams,
    response: Transaction,
  }),

  // ---- Insights (§10.3)
  insightsDaily: endpoint({
    method: 'GET',
    path: '/insights/daily',
    summary: 'Daily insights',
    source: '§10.3',
    query: InsightsQuery,
    response: InsightsResponse,
  }),
  insightsWeekly: endpoint({
    method: 'GET',
    path: '/insights/weekly',
    summary: 'Weekly insights (ISO week)',
    source: '§10.3',
    query: InsightsQuery,
    response: InsightsResponse,
  }),
  insightsMonthly: endpoint({
    method: 'GET',
    path: '/insights/monthly',
    summary: 'Monthly insights',
    source: '§10.3',
    query: InsightsQuery,
    response: InsightsResponse,
  }),

  // ---- Goals and contributions (§10.3, §10.4)
  listGoals: endpoint({
    method: 'GET',
    path: '/goals',
    summary: 'List goals',
    source: '§10.3',
    query: ListGoalsQuery,
    response: ListGoalsResponse,
  }),
  createGoal: endpoint({
    method: 'POST',
    path: '/goals',
    summary: 'Create goal',
    source: '§10.3',
    body: CreateGoalRequest,
    response: GoalDetail,
    status: 201,
    errors: ['COUPLE_REQUIRED'],
  }),
  getGoal: endpoint({
    method: 'GET',
    path: '/goals/:id',
    summary: 'Goal detail with computed metrics',
    source: '§10.3',
    params: IdParams,
    response: GoalDetail,
  }),
  patchGoal: endpoint({
    method: 'PATCH',
    path: '/goals/:id',
    summary: 'Edit name, target, date, icon',
    source: '§10.3',
    params: IdParams,
    body: PatchGoalRequest,
    response: GoalDetail,
    errors: ['GOAL_ARCHIVED'],
  }),
  deleteGoal: endpoint({
    method: 'DELETE',
    path: '/goals/:id',
    summary: 'Delete goal and its contributions',
    source: '§10.3',
    params: IdParams,
    response: NoContent,
    status: 204,
    errors: ['GOAL_ARCHIVED'],
  }),
  createContribution: endpoint({
    method: 'POST',
    path: '/goals/:id/contributions',
    summary: 'Add contribution',
    source: '§10.3',
    params: GoalIdParams,
    body: CreateContributionRequest,
    response: Contribution,
    status: 201,
    idempotent: true,
    errors: ['GOAL_ARCHIVED', 'FX_UNAVAILABLE'],
  }),
  listContributions: endpoint({
    method: 'GET',
    path: '/goals/:id/contributions',
    summary: 'Contribution history',
    source: '§10.3',
    params: GoalIdParams,
    query: ListContributionsQuery,
    response: ListContributionsResponse,
  }),
  patchContribution: endpoint({
    method: 'PATCH',
    path: '/goals/:id/contributions/:cid',
    summary: 'Correct a contribution',
    source: '§10.4',
    params: ContributionParams,
    body: PatchContributionRequest,
    response: Contribution,
    errors: ['GOAL_ARCHIVED', 'FX_UNAVAILABLE'],
  }),
  deleteContribution: endpoint({
    method: 'DELETE',
    path: '/goals/:id/contributions/:cid',
    summary: 'Remove a contribution',
    source: '§10.4',
    params: ContributionParams,
    response: NoContent,
    status: 204,
    errors: ['GOAL_ARCHIVED'],
  }),

  // ---- Couple and invitations (§10.3, §10.4)
  getCouple: endpoint({
    method: 'GET',
    path: '/couple',
    summary: 'Couple state',
    source: '§10.3',
    response: CoupleState,
  }),
  invitePartner: endpoint({
    method: 'POST',
    path: '/couple/invite',
    summary: 'Invite partner',
    source: '§10.3',
    body: InviteRequest,
    response: Invitation,
    status: 201,
    errors: ['CONFLICT'],
  }),
  acceptInvitation: endpoint({
    method: 'POST',
    path: '/couple/invitations/:id/accept',
    summary: 'Accept invitation',
    source: '§10.3',
    params: InvitationParams,
    body: InvitationTokenRequest,
    response: CoupleState,
    errors: ['CONFLICT'],
  }),
  cancelInvitation: endpoint({
    method: 'POST',
    path: '/couple/invitations/:id/cancel',
    summary: 'Cancel pending invitation',
    source: '§10.4',
    params: InvitationParams,
    response: Invitation,
    errors: ['CONFLICT'],
  }),
  resendInvitation: endpoint({
    method: 'POST',
    path: '/couple/invitations/:id/resend',
    summary: 'Resend invitation',
    source: '§10.4',
    params: InvitationParams,
    response: Invitation,
    errors: ['CONFLICT'],
  }),
  declineInvitation: endpoint({
    method: 'POST',
    path: '/couple/invitations/:id/decline',
    summary: 'Decline invitation',
    source: '§10.4',
    params: InvitationParams,
    body: InvitationTokenRequest,
    response: Invitation,
    errors: ['CONFLICT'],
  }),
  endCouple: endpoint({
    method: 'DELETE',
    path: '/couple',
    summary: 'End couple (BR-18)',
    source: '§10.3',
    response: CoupleState,
    errors: ['CONFLICT'],
  }),
  getInvitationByToken: endpoint({
    method: 'GET',
    path: '/invitations/by-token/:token',
    summary: 'Public landing: inviter first name only',
    source: '§10.4',
    auth: 'public',
    params: InvitationTokenParams,
    response: PublicInvitation,
  }),

  // ---- Categories, activity, home, currencies (§10.4)
  listCategories: endpoint({
    method: 'GET',
    path: '/categories',
    summary: 'Default and custom categories',
    source: '§10.4',
    query: ListCategoriesQuery,
    response: ListCategoriesResponse,
  }),
  createCategory: endpoint({
    method: 'POST',
    path: '/categories',
    summary: 'Create custom category',
    source: '§10.4',
    body: CreateCategoryRequest,
    response: Category,
    status: 201,
    errors: ['CONFLICT'],
  }),
  patchCategory: endpoint({
    method: 'PATCH',
    path: '/categories/:id',
    summary: 'Edit or archive custom category',
    source: '§10.4',
    params: IdParams,
    body: PatchCategoryRequest,
    response: Category,
    errors: ['CONFLICT'],
  }),
  getActivity: endpoint({
    method: 'GET',
    path: '/activity',
    summary: 'Own transactions and contributions, merged',
    source: '§10.4',
    query: ActivityQuery,
    response: ActivityResponse,
  }),
  getHomeSummary: endpoint({
    method: 'GET',
    path: '/home/summary',
    summary: 'Home dashboard in one round trip',
    source: '§10.4',
    query: HomeSummaryQuery,
    response: HomeSummaryResponse,
  }),
  listCurrencies: endpoint({
    method: 'GET',
    path: '/currencies',
    summary: 'Supported currencies',
    source: '§10.4',
    response: ListCurrenciesResponse,
  }),
  getExchangeRates: endpoint({
    method: 'GET',
    path: '/exchange-rates',
    summary: 'USD-based rates for a date',
    source: '§10.4',
    query: ExchangeRatesQuery,
    response: ExchangeRatesResponse,
    errors: ['FX_UNAVAILABLE'],
  }),
} as const;

export type EndpointName = keyof typeof endpoints;

/**
 * Every error code an endpoint can return: its specific codes plus the ones its shape
 * implies (session → 401, input → 422, path id → 404, writes → 429, always 500).
 */
export function errorCodesFor(e: Endpoint): ErrorCode[] {
  const codes = new Set<ErrorCode>(e.errors);
  if (e.auth === 'session') codes.add('UNAUTHENTICATED');
  if (e.body !== undefined || e.query !== undefined) codes.add('VALIDATION_FAILED');
  if (e.path.includes('/:')) codes.add('NOT_FOUND');
  if (e.method !== 'GET' || e.path.startsWith('/auth/')) codes.add('RATE_LIMITED');
  codes.add('INTERNAL');
  return [...codes];
}
