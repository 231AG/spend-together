'use client';

import {
  endpoints,
  type GoalDetail,
  type CreateContributionRequest,
  type CreateGoalRequest,
  type PatchContributionRequest,
  type PatchGoalRequest,
} from '@spendtogether/schemas';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/queries';

// F9 mutations. A goal or contribution change can move the goal's balance and status,
// the goal lists, Home's goals preview and saved total, Insights and Activity (a
// contribution is an Activity row and counts as "Saved", F-03). All are refreshed.

export function invalidateGoalDependents(qc: QueryClient) {
  return Promise.all(
    [['goals'], ['home'], ['insights'], queryKeys.activity, queryKeys.couple].map((queryKey) =>
      qc.invalidateQueries({ queryKey: [...queryKey] }),
    ),
  );
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: z.input<typeof CreateGoalRequest>) =>
      apiClient.call(endpoints.createGoal, { body }),
    onSuccess: (goal) => {
      qc.setQueryData(queryKeys.goal(goal.id), goal);
    },
    onSettled: () => invalidateGoalDependents(qc),
  });
}

export function usePatchGoal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: z.input<typeof PatchGoalRequest>) =>
      apiClient.call(endpoints.patchGoal, { params: { id }, body }),
    onSuccess: (goal) => {
      qc.setQueryData(queryKeys.goal(id), goal);
    },
    onSettled: () => invalidateGoalDependents(qc),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.call(endpoints.deleteGoal, { params: { id } }),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: queryKeys.goal(id) });
    },
    onSettled: () => invalidateGoalDependents(qc),
  });
}

/**
 * After a contribution is stored: fetch the goal once (every screen showing it updates
 * from the cache) and refresh everything else in the background. A failed reload is not a
 * failed save — the write already succeeded — so it yields null rather than an error.
 */
async function freshGoal(qc: QueryClient, goalId: string): Promise<GoalDetail | null> {
  const detail = queryKeys.goal(goalId);
  let goal: GoalDetail | null;
  try {
    goal = await qc.query({
      queryKey: detail,
      queryFn: () => apiClient.call(endpoints.getGoal, { params: { id: goalId } }),
      staleTime: 0,
    });
  } catch {
    goal = null;
  }
  void qc.invalidateQueries({
    queryKey: ['goals'],
    predicate: (q) => q.queryKey.join('/') !== detail.join('/'),
  });
  void Promise.all(
    [['home'], ['insights'], queryKeys.activity].map((queryKey) =>
      qc.invalidateQueries({ queryKey: [...queryKey] }),
    ),
  );
  return goal;
}

export function useCreateContribution(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: z.input<typeof CreateContributionRequest>) => {
      const saved = await apiClient.call(endpoints.createContribution, {
        params: { id: goalId },
        body,
        ...(body.id ? { idempotencyKey: body.id } : {}),
      });
      return { saved, goal: await freshGoal(qc, goalId) };
    },
  });
}

export function usePatchContribution(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cid,
      body,
    }: {
      cid: string;
      body: z.input<typeof PatchContributionRequest>;
    }) => {
      const saved = await apiClient.call(endpoints.patchContribution, {
        params: { id: goalId, cid },
        body,
      });
      return { saved, goal: await freshGoal(qc, goalId) };
    },
  });
}

export function useDeleteContribution(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => {
      await apiClient.call(endpoints.deleteContribution, { params: { id: goalId, cid } });
      return { goal: await freshGoal(qc, goalId) };
    },
  });
}
