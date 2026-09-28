'use client';

import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
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

/** §11.3: shown while a base-currency change is recalculating; overlays, never shifts. */
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
      Updating your totals to your new currency. Figures may change for a moment.
    </div>
  );
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
