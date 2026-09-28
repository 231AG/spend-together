'use client';

import { localDate } from '@spendtogether/domain';
import { endpoints } from '@spendtogether/schemas';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ApiError, apiClient } from './api-client';
import { appClock } from './clock';

// Shared queries for the shell. Screens add their own in later phases; the keys live here
// so invalidation after mutations has one source.

export const queryKeys = {
  me: ['me'] as const,
  goals: (scope: 'mine' | 'ours' | 'all') => ['goals', scope] as const,
  currencies: ['currencies'] as const,
  categories: (type: 'income' | 'expense' | 'all') => ['categories', type] as const,
  rates: (date: string) => ['exchange-rates', date] as const,
  /** Every Activity list, whatever its filters (prefix for invalidation). */
  activity: ['activity'] as const,
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transactions', 'detail', id] as const,
  recentTransactions: (type: 'income' | 'expense') => ['transactions', 'recent', type] as const,
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
