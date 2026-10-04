'use client';

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, type Query } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { offlineDb } from './offline-db';
import { registerOfflineStore } from './session';

// F12-03 (§19.3 point 2): the read cache persisted to IndexedDB, so a cold start offline
// shows the last figures. No tokens are ever in it (§25.1): sessions live in httpOnly
// cookies. It is personal data, so logout removes it (WAC-02).

const DAY_MS = 24 * 60 * 60_000;
/** Offline figures up to a week old are still worth showing (they're labelled as cached). */
export const PERSIST_MAX_AGE_MS = 7 * DAY_MS;
/** Bump when a cached shape changes, so an old cache is dropped instead of misread. */
const CACHE_VERSION = 'f12-1';
const KEY = 'query-cache';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // A query must outlive the persisted copy, or it is gone before it is saved.
        gcTime: PERSIST_MAX_AGE_MS,
      },
    },
  });
}

const storage = (() => {
  const open = offlineDb();
  if (!open) return null;
  return {
    getItem: async (key: string) => (await (await open).get('kv', key)) ?? null,
    setItem: async (key: string, value: string) => {
      await (await open).put('kv', value, key);
    },
    removeItem: async (key: string) => {
      await (await open).delete('kv', key);
    },
  };
})();

const persister = createAsyncStoragePersister({ storage, key: KEY, throttleTime: 1_000 });

/** Only settled answers are worth keeping; a public invitation isn't the person's data. */
function shouldPersist(query: Query): boolean {
  const [scope] = query.queryKey;
  return query.state.status === 'success' && scope !== 'invitation';
}

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: PERSIST_MAX_AGE_MS,
  buster: CACHE_VERSION,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
};

if (typeof window !== 'undefined') {
  registerOfflineStore({
    pending: () => 0,
    clear: () => Promise.resolve(persister.removeClient()),
  });
}
