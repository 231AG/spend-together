'use client';

import { hashKey, useQueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/queries';
import { makeQueryClient, persistOptions } from '@/lib/query-client';
import { registerServiceWorker } from '@/lib/service-worker';

// App-wide client providers (§14.1): React Query (persisted to IndexedDB, F12-03), the
// toaster, the service worker (F12-01) and, in mock mode, the in-page mock API, which must
// be running before the first request (F4-11). In live mode the mock is never loaded.

// Dev only: the branch is removed from production builds, so the switcher and its chunk
// never ship (asserted after `next build` by scripts/assert-prod-bundle.mjs).
const ScenarioSwitcher =
  process.env.NODE_ENV === 'production'
    ? null
    : dynamic(() => import('@/components/dev/scenario-switcher').then((m) => m.ScenarioSwitcher), {
        ssr: false,
      });

/** Routes that must render with no network at all (the service worker's fallback, F12). */
const NETWORK_FREE = new Set(['/offline']);

function MockGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bypass = NETWORK_FREE.has(pathname);
  const [ready, setReady] = useState(!apiClient.usesMockWorker);
  useEffect(() => {
    if (ready || bypass) return;
    let cancelled = false;
    void import('@/mocks/start')
      .then((m) => m.startMockWorker())
      .then(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, bypass]);
  return ready || bypass ? children : null;
}

/**
 * A different person signed in on this device (a session that expired without logout):
 * nothing cached for the previous one may show, so everything but /me is dropped.
 */
const ME_HASH = hashKey(queryKeys.me);

function CacheOwnerGuard() {
  const qc = useQueryClient();
  useEffect(() => {
    let owner: string | null = null;
    return qc.getQueryCache().subscribe((event) => {
      if (event.query.queryHash !== ME_HASH) return;
      const id = qc.getQueryData<{ id: string }>(queryKeys.me)?.id ?? null;
      if (id === null) return;
      if (owner !== null && owner !== id) {
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      }
      owner = id;
    });
  }, [qc]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      // The saved copy shows at once; everything is then refetched (when online), so a
      // reload never leaves day-old figures looking current.
      onSuccess={() => client.invalidateQueries()}
    >
      <CacheOwnerGuard />
      <ToastProvider>
        <MockGate>
          {children}
          {ScenarioSwitcher && apiClient.usesMockWorker && <ScenarioSwitcher />}
        </MockGate>
      </ToastProvider>
    </PersistQueryClientProvider>
  );
}
