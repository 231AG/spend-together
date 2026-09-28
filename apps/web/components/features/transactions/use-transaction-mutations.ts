'use client';

import {
  endpoints,
  type ActivityItem,
  type CreateTransactionRequest,
  type PatchTransactionRequest,
} from '@spendtogether/schemas';
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { TRANSACTION_DEPENDENTS, queryKeys } from '@/lib/queries';

// F7-04 / F7-09: create, edit, delete and restore. Creates and deletes are optimistic:
// the Activity caches change at once and the exact prior snapshot is put back if the
// server refuses (§7.3). Everything a transaction moves is invalidated afterwards, so
// every affected period's totals refresh without a manual reload (FR-08, WAC-03/04).

export interface ActivityPage {
  data: ActivityItem[];
  next_cursor: string | null;
}
export type ActivityFilters = {
  kind?: 'income' | 'expense' | 'contribution';
  category_id?: string;
  from?: string;
  to?: string;
  q?: string;
};

type Snapshot = [QueryKey, InfiniteData<ActivityPage> | undefined][];

export const activityKey = (filters: ActivityFilters) => [...queryKeys.activity, filters] as const;

function filtersOf(key: QueryKey): ActivityFilters {
  return key[1] ?? {};
}

/** Would this list show the item? Search is left to the server. */
function accepts(filters: ActivityFilters, item: ActivityItem): boolean {
  if (filters.q) return false;
  if (filters.from && item.date < filters.from) return false;
  if (filters.to && item.date > filters.to) return false;
  if (item.kind === 'contribution')
    return !filters.category_id && (!filters.kind || filters.kind === 'contribution');
  if (filters.kind && filters.kind !== item.type) return false;
  if (filters.category_id && filters.category_id !== item.category.id) return false;
  return true;
}

/** Insert newest-first by date; past the loaded pages it is left for the refetch. */
function insert(data: InfiniteData<ActivityPage>, item: ActivityItem): InfiniteData<ActivityPage> {
  const pages = data.pages.map((p) => ({ ...p, data: [...p.data] }));
  for (const [i, page] of pages.entries()) {
    const at = page.data.findIndex((x) => x.date <= item.date);
    const last = i === pages.length - 1;
    if (at >= 0 || (last && page.next_cursor === null)) {
      page.data.splice(at >= 0 ? at : page.data.length, 0, item);
      break;
    }
  }
  return { ...data, pages };
}

function remove(data: InfiniteData<ActivityPage>, id: string): InfiniteData<ActivityPage> {
  return {
    ...data,
    pages: data.pages.map((p) => ({ ...p, data: p.data.filter((x) => x.id !== id) })),
  };
}

async function patchLists(
  qc: QueryClient,
  change: (
    filters: ActivityFilters,
    data: InfiniteData<ActivityPage>,
  ) => InfiniteData<ActivityPage> | null,
): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: queryKeys.activity });
  const snapshot: Snapshot = qc.getQueriesData<InfiniteData<ActivityPage>>({
    queryKey: queryKeys.activity,
  });
  for (const [key, data] of snapshot) {
    if (!data) continue;
    const next = change(filtersOf(key), data);
    if (next) qc.setQueryData(key, next);
  }
  return snapshot;
}

function restore(qc: QueryClient, snapshot: Snapshot | undefined) {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}

export function invalidateTransactionDependents(qc: QueryClient) {
  return Promise.all(
    TRANSACTION_DEPENDENTS.map((queryKey) => qc.invalidateQueries({ queryKey: [...queryKey] })),
  );
}

type CreateBody = z.input<typeof CreateTransactionRequest>;

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body }: { body: CreateBody; optimistic: ActivityItem | null }) =>
      // The client-made `id` doubles as the idempotency key: a retry of the same entry
      // can never create a second record (§10.1).
      apiClient.call(endpoints.createTransaction, {
        body,
        ...(body.id ? { idempotencyKey: body.id } : {}),
      }),
    onMutate: async ({ optimistic }) => {
      if (!optimistic) return { snapshot: [] as Snapshot };
      const snapshot = await patchLists(qc, (filters, data) =>
        accepts(filters, optimistic) ? insert(data, optimistic) : null,
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      restore(qc, context?.snapshot);
    },
    onSettled: () => invalidateTransactionDependents(qc),
  });
}

type PatchBody = z.input<typeof PatchTransactionRequest>;

export function usePatchTransaction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchBody) =>
      apiClient.call(endpoints.patchTransaction, { params: { id }, body }),
    onSuccess: (saved) => {
      qc.setQueryData(queryKeys.transaction(id), saved);
    },
    onSettled: () => invalidateTransactionDependents(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.call(endpoints.deleteTransaction, { params: { id } }),
    onMutate: async (id) => ({ snapshot: await patchLists(qc, (_f, data) => remove(data, id)) }),
    onError: (_error, _id, context) => {
      restore(qc, context?.snapshot);
    },
    onSettled: () => invalidateTransactionDependents(qc),
  });
}

const restoring = new Set<string>();

/**
 * ADR-003 restore, for the Undo toast. Not tied to a component, because the screen that
 * deleted the record has usually gone by the time Undo is pressed. A second tap while the
 * first is in flight is ignored, and the server treats a repeat as a no-op anyway.
 */
export async function restoreTransaction(qc: QueryClient, id: string): Promise<boolean> {
  if (restoring.has(id)) return false;
  restoring.add(id);
  try {
    await apiClient.call(endpoints.restoreTransaction, { params: { id } });
    return true;
  } finally {
    restoring.delete(id);
    await invalidateTransactionDependents(qc);
  }
}
