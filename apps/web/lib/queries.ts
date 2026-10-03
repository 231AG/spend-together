'use client';

import { localDate } from '@spendtogether/domain';
import { endpoints } from '@spendtogether/schemas';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ApiError, apiClient } from './api-client';
import { appClock } from './clock';

// Shared queries for the shell. Screens add their own in later phases; the keys live here
// so invalidation after mutations has one source.

export const queryKeys = {
  me: ['me'] as const,
  goals: (scope: 'mine' | 'ours' | 'all') => ['goals', scope] as const,
  goalsWithCompleted: (scope: 'mine' | 'ours') => ['goals', scope, 'with-completed'] as const,
  goal: (id: string) => ['goals', 'detail', id] as const,
  contributions: (goalId: string) => ['goals', 'contributions', goalId] as const,
  couple: ['couple'] as const,
  invitation: (token: string) => ['invitation', token] as const,
  currencies: ['currencies'] as const,
  categories: (type: 'income' | 'expense' | 'all') => ['categories', type] as const,
  rates: (date: string) => ['exchange-rates', date] as const,
  /** Every Activity list, whatever its filters (prefix for invalidation). */
  activity: ['activity'] as const,
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transactions', 'detail', id] as const,
  recentTransactions: (type: 'income' | 'expense') => ['transactions', 'recent', type] as const,
  home: (period: 'today' | 'week' | 'month') => ['home', period] as const,
  insights: (period: 'daily' | 'weekly' | 'monthly', date: string | null) =>
    ['insights', period, date ?? 'today'] as const,
};

/**
 * Everything a change to a transaction can move (§7.3, WAC-03/04): lists, details, Home
 * and Insights. Invalidated after every create, edit, delete and restore.
 */
export const TRANSACTION_DEPENDENTS = [
  queryKeys.activity,
  queryKeys.transactions,
  ['home'],
  ['insights'],
] as const;

/** 401 is an answer, not a failure worth retrying. */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** The signed-in user. Polls while a base-currency recalculation runs (§11.3). */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiClient.call(endpoints.getMe, {}),
    retry: (count, error) => !isUnauthenticated(error) && count < 2,
    refetchInterval: (query) => (query.state.data?.recalculating ? 2000 : false),
  });
}

/** Active goals the user can contribute to (Add sheet → savings contribution). */
export function useActiveGoals(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.goals('all'),
    queryFn: () => apiClient.call(endpoints.listGoals, { query: { scope: 'all' } }),
    enabled,
    select: (res) => res.data.filter((g) => g.archived_at === null),
  });
}

/** Supported currencies, keyed by code for display (exponent, symbol). */
export function useCurrencies() {
  const query = useQuery({
    queryKey: queryKeys.currencies,
    queryFn: () => apiClient.call(endpoints.listCurrencies, {}),
    staleTime: Infinity,
  });
  const byCode = useMemo(
    () => new Map((query.data?.data ?? []).map((c) => [c.code, c] as const)),
    [query.data],
  );
  return { ...query, byCode };
}

/** Active categories (archived ones are hidden from pickers, BR-17). */
export function useCategories(type: 'income' | 'expense' | 'all' = 'all') {
  return useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: () =>
      apiClient.call(endpoints.listCategories, { query: type === 'all' ? {} : { type } }),
    staleTime: 5 * 60_000,
    select: (res) => res.data,
  });
}

/** The USD-based rates in force on `date` (F-24), for the conversion preview. */
export function useRates(date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rates(date),
    queryFn: () => apiClient.call(endpoints.getExchangeRates, { query: { date } }),
    enabled,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/** Today in the signed-in user's time zone (BR-09), from the app clock. */
export function useToday(): string | null {
  const me = useMe();
  if (!me.data) return null;
  return localDate(appClock.now(), me.data.timezone);
}

/** SCR-08 in one round trip (§10.4). */
export function useHomeSummary(period: 'today' | 'week' | 'month') {
  return useQuery({
    queryKey: queryKeys.home(period),
    queryFn: () => apiClient.call(endpoints.getHomeSummary, { query: { period } }),
  });
}

const INSIGHTS = {
  daily: endpoints.insightsDaily,
  weekly: endpoints.insightsWeekly,
  monthly: endpoints.insightsMonthly,
} as const;

/** SCR-14 for the period containing `date` (today when null). Keeps the last view while loading the next. */
export function useInsights(period: 'daily' | 'weekly' | 'monthly', date: string | null) {
  return useQuery({
    queryKey: queryKeys.insights(period, date),
    queryFn: () => apiClient.call(INSIGHTS[period], { query: date ? { date } : {} }),
    placeholderData: (previous) => previous,
  });
}

/** A goal list including completed goals (SCR-15 shows them collapsed). */
export function useGoals(scope: 'mine' | 'ours') {
  return useQuery({
    queryKey: queryKeys.goalsWithCompleted(scope),
    queryFn: () => apiClient.call(endpoints.listGoals, { query: { scope, include: 'completed' } }),
    select: (res) => res.data,
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.goal(id),
    queryFn: () => apiClient.call(endpoints.getGoal, { params: { id } }),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

/** Contribution history, newest first, 50 per page with "Load more" (no silent cut-off). */
export function useContributions(goalId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.contributions(goalId),
    queryFn: ({ pageParam }) =>
      apiClient.call(endpoints.listContributions, {
        params: { id: goalId },
        query: { limit: 50, ...(pageParam ? { cursor: pageParam } : {}) },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function useCouple() {
  return useQuery({
    queryKey: queryKeys.couple,
    queryFn: () => apiClient.call(endpoints.getCouple, {}),
    staleTime: 60_000,
  });
}

/** SCR-20: the public invitation (inviter first name, status, expiry). */
export function useInvitation(token: string) {
  return useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: () => apiClient.call(endpoints.getInvitationByToken, { params: { token } }),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

/**
 * PATCH /me (F11). A base-currency change only refreshes /me: dashboards keep showing the
 * previous values until the recalculation finishes (§11.3 step 3), then everything is
 * refetched at once (see RecalcWatcher).
 */
export function usePatchMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof apiClient.call<typeof endpoints.patchMe>>[1]['body']) =>
      apiClient.call(endpoints.patchMe, { body }),
    onSuccess: (me, body) => {
      qc.setQueryData(queryKeys.me, me);
      // A time-zone change moves "today", and with it every period boundary (BR-16). A
      // base-currency change that finished within the request re-expresses everything
      // now; one still running is picked up by RecalcWatcher when it ends.
      if ((body.timezone !== undefined || body.base_currency !== undefined) && !me.recalculating) {
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      }
    },
  });
}
