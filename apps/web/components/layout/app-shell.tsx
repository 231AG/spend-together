'use client';

import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { SiteFooter } from '@/components/ui/fx-attribution';
import { OfflineSyncIndicator } from '@/components/ui/offline-sync-indicator';
import { AddButton, AddSheetProvider } from '@/components/features/add-sheet';
import {
  Brand,
  BottomTabBar,
  IconRail,
  Sidebar,
} from '@/components/features/navigation/navigation';
import { ShortcutLayer } from '@/components/features/shortcuts/shortcut-layer';
import { useOnline } from '@/lib/connectivity';
import { useMe } from '@/lib/queries';
import { ConfirmProvider } from './confirm';
import { RouteFocus } from './route-focus';

// §14.1 AppShell: SkipLink, the breakpoint's navigation, global Add, the offline chip and
// recalculating banner slots, <main id="content">, the @modal slot, and the single
// ConfirmationDialog. §21: content max 1200 px, header 56 px, room for the tab bar.

export function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only rounded-md bg-action-primary-bg px-4 py-2 type-label text-action-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-(--z-toast)"
    >
      Skip to content
    </a>
  );
}

/**
 * §11.3 (F11-04): shown while a base-currency change is recalculating; it overlays and
 * never shifts the layout. The dashboards underneath keep their previous values.
 */
function RecalculatingBanner() {
  const me = useMe();
  if (!me.data?.recalculating) return null;
  return (
    <div
      role="status"
      className="absolute inset-x-4 top-full z-(--z-sticky) mt-2 flex items-center gap-2 rounded-lg border border-border-default bg-bg-card px-4 py-2 type-body-sm text-fg-body shadow-elev-2"
    >
      <RefreshCw
        aria-hidden
        className="spin size-(--icon-sm) shrink-0 text-fg-link"
        strokeWidth={1.75}
      />
      Updating your totals to {me.data.base_currency}…
    </div>
  );
}

/**
 * §11.3 steps 3–4. While a base-currency change recalculates, cached figures are frozen
 * (never stale, so revisiting a screen shows the previous values, not a half-converted
 * mix). When it finishes, everything except /me is refetched at once.
 */
export function RecalcWatcher() {
  const me = useMe();
  const qc = useQueryClient();
  const recalculating = me.data?.recalculating ?? false;
  const was = useRef(false);
  useEffect(() => {
    if (recalculating) {
      was.current = true;
      const staleTime = qc.getDefaultOptions().queries?.staleTime;
      const setStaleTime = (value: typeof staleTime) => {
        const current = qc.getDefaultOptions();
        const queries = { ...current.queries };
        delete queries.staleTime;
        qc.setDefaultOptions({
          ...current,
          queries: value === undefined ? queries : { ...queries, staleTime: value },
        });
      };
      setStaleTime(Infinity);
      // Restores only what it changed, also when unmounted mid-recalculation (logout).
      return () => {
        setStaleTime(staleTime);
      };
    }
    if (was.current) {
      was.current = false;
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    }
    return undefined;
  }, [recalculating, qc]);
  return null;
}

function ShellHeader() {
  const online = useOnline();
  return (
    <header className="relative flex h-(--header) items-center gap-3">
      <span className="md:hidden">
        <Brand />
      </span>
      {/* The chip lives in a reserved slot at the end, so it never moves other content. */}
      <div className="ml-auto flex items-center gap-2">
        <OfflineSyncIndicator online={online} pendingCount={0} />
      </div>
      <RecalculatingBanner />
      <RecalcWatcher />
    </header>
  );
}

export function AppShell({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <AddSheetProvider>
      <ConfirmProvider>
        <SkipLink />
        <BottomTabBar />
        <IconRail />
        <Sidebar />
        <div className="min-h-dvh pb-(--mobile-content-bottom) md:pb-12 md:pl-(--rail) lg:pl-(--sidebar)">
          <div className="mx-auto w-full max-w-(--content-max) px-4 md:px-6 lg:px-8">
            <ShellHeader />
            <main id="content" tabIndex={-1} className="focus:outline-none">
              {children}
            </main>
            <SiteFooter className="mt-12" />
          </div>
        </div>
        <span className="md:hidden">
          <AddButton variant="fab" />
        </span>
        {modal}
        <RouteFocus />
        <ShortcutLayer />
      </ConfirmProvider>
    </AddSheetProvider>
  );
}
