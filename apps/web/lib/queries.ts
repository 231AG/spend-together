'use client';

import { endpoints } from '@spendtogether/schemas';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiClient } from './api-client';

// Shared queries for the shell. Screens add their own in later phases; the keys live here
// so invalidation after mutations has one source.

export const queryKeys = {
  me: ['me'] as const,
  goals: (scope: 'mine' | 'ours' | 'all') => ['goals', scope] as const,
};

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
