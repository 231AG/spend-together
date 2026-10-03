'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TRANSACTION_DEPENDENTS } from '@/lib/queries';

// SCR-22 (F11-02). Settings lists archived categories too (pickers never do, BR-17).
// A rename or re-icon shows up wherever the category is named, so every category list
// and everything that renders transactions is refreshed.

type CreateBody = Parameters<typeof apiClient.call<typeof endpoints.createCategory>>[1]['body'];
type PatchBody = Parameters<typeof apiClient.call<typeof endpoints.patchCategory>>[1]['body'];

export const settingsCategoriesKey = ['categories', 'settings'] as const;

export function useSettingsCategories() {
  return useQuery({
    queryKey: settingsCategoriesKey,
    queryFn: () => apiClient.call(endpoints.listCategories, { query: { include: 'archived' } }),
    select: (res) => res.data,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [['categories'], ...TRANSACTION_DEPENDENTS].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
}

export function useCreateCategory() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: CreateBody) => apiClient.call(endpoints.createCategory, { body }),
    onSuccess: refresh,
  });
}

export function usePatchCategory() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchBody }) =>
      apiClient.call(endpoints.patchCategory, { params: { id }, body }),
    onSuccess: refresh,
  });
}
