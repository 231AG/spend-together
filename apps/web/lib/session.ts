'use client';

import { endpoints } from '@spendtogether/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { clearPendingVerify } from './auth-copy';

// FR-03 / WAC-02 (F11-07): logging out clears the session cookie (server), the query
// cache and every offline store. Offline stores register themselves here (F12's outbox),
// so logout never has to know what they are.

export interface OfflineStore {
  /** Entries not yet synced; logout warns before discarding them. */
  pending: () => Promise<number> | number;
  clear: () => Promise<void> | void;
}

const stores = new Set<OfflineStore>();

export function registerOfflineStore(store: OfflineStore): () => void {
  stores.add(store);
  return () => {
    stores.delete(store);
  };
}

/** Unsynced entries across every offline store (0 until F12 adds the outbox). */
export async function pendingOfflineEntries(): Promise<number> {
  const counts = await Promise.all([...stores].map((s) => Promise.resolve(s.pending())));
  return counts.reduce((a, b) => a + b, 0);
}

export async function signOut(qc: QueryClient): Promise<void> {
  try {
    await apiClient.call(endpoints.logout, {});
  } finally {
    // Whatever the server said, nothing of this session stays on the device.
    await Promise.all([...stores].map((s) => Promise.resolve(s.clear())));
    clearPendingVerify();
    qc.clear();
  }
}
