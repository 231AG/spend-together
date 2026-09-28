'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';

// App-wide client providers (§14.1): React Query, the toaster, and in mock mode the MSW
// worker, which must be running before the first request (F4-11). In live mode MSW is
// never loaded.

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

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MockGate>
          {children}
          {ScenarioSwitcher && apiClient.usesMockWorker && <ScenarioSwitcher />}
        </MockGate>
      </ToastProvider>
    </QueryClientProvider>
  );
}
