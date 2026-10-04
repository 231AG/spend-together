'use client';

import { endpoints } from '@spendtogether/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { ApiError, apiClient } from './api-client';
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
  // A store that can't be read counts as empty rather than blocking logout.
  const counts = await Promise.allSettled(
    [...stores].map((s) => Promise.resolve().then(() => s.pending())),
  );
  return counts.reduce((sum, c) => sum + (c.status === 'fulfilled' ? c.value : 0), 0);
}

let signedOutOnPurpose = false;

/** True after the person logged out here: the gate then drops `?next=` (no hand-me-down path). */
export function wasSignedOutOnPurpose(): boolean {
  return signedOutOnPurpose;
}

/** Called when someone signs in again. */
export function resetSignedOut(): void {
  signedOutOnPurpose = false;
}

/**
 * Ends the session on the server first: if that fails (offline, 5xx) nothing is cleared
 * and the error is thrown, because the cookie would still be valid and the person would
 * land back in the app. A 401 means the session had already ended, which is fine.
 */
export async function signOut(qc: QueryClient): Promise<void> {
  try {
    await apiClient.call(endpoints.logout, {});
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
  signedOutOnPurpose = true;
  // One store failing to clear must not keep the rest, or the cache, on the device.
  await Promise.allSettled([...stores].map((s) => Promise.resolve().then(() => s.clear())));
  clearPendingVerify();
  qc.clear();
}
