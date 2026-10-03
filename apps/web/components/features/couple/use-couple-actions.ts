'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/queries';

// F10 actions: invite, resend, cancel, accept, decline, end. Each refreshes the couple
// state; joining or ending a couple also changes which goals are shared (Our goals, Home).

function refresh(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.couple });
}

/** After the response already put the new couple state in the cache: only goals move. */
function refreshShared(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['goals'] });
  void qc.invalidateQueries({ queryKey: ['home'] });
}

export function useInvitePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitee: string) => apiClient.call(endpoints.invitePartner, { body: { invitee } }),
    onSuccess: () => {
      refresh(qc);
    },
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.call(endpoints.resendInvitation, { params: { id } }),
    onSuccess: () => {
      refresh(qc);
    },
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.call(endpoints.cancelInvitation, { params: { id } }),
    onSuccess: () => {
      refresh(qc);
    },
  });
}

export function useAcceptInvitation(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.call(endpoints.acceptInvitation, { params: { id }, body: { token } }),
    onSuccess: (state) => {
      qc.setQueryData(queryKeys.couple, state);
      void qc.invalidateQueries({ queryKey: queryKeys.invitation(token) });
      refreshShared(qc);
    },
  });
}

export function useDeclineInvitation(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.call(endpoints.declineInvitation, { params: { id }, body: { token } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.invitation(token) });
    },
  });
}

export function useEndCouple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.call(endpoints.endCouple, {}),
    onSuccess: (state) => {
      qc.setQueryData(queryKeys.couple, state);
      refreshShared(qc);
    },
  });
}
