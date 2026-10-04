'use client';

import { CloudOff } from 'lucide-react';
import { TransactionRow } from '@/components/ui/transaction-row';
import { pendingRow, waiting } from '@/lib/pending-entries';
import type { OutboxItem } from '@/lib/outbox-machine';
import { useSyncQueue } from './sync-queue';

// §19.2's offline column, shared by the screens: queued rows marked "Sync pending" (they
// open the queue, where they can be edited or discarded), and the message for a screen
// that has nothing saved on this device yet.

/** A request that is waiting for the network (React Query pauses it offline). */
export function waitingForNetwork(query: { isPending: boolean; fetchStatus: string }): boolean {
  return query.isPending && query.fetchStatus === 'paused';
}

export function NotSavedOffline({ what }: { what: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 rounded-xl bg-bg-card p-6 text-center shadow-elev-1"
    >
      <CloudOff aria-hidden className="size-(--icon-lg) text-fg-muted" strokeWidth={1.75} />
      <p className="type-label text-fg-default">You&apos;re offline</p>
      <p className="type-body-sm text-fg-body">
        {what} isn&apos;t saved on this device yet. It appears when you reconnect.
      </p>
    </div>
  );
}

/** Banner over cached figures: they may be out of date (Insights, Home). */
export function CachedFiguresBanner() {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-md bg-bg-subtle px-3 py-2 type-body-sm text-fg-body"
    >
      <CloudOff aria-hidden className="size-(--icon-sm) shrink-0" strokeWidth={1.75} />
      You&apos;re offline. These are your last saved figures.
    </p>
  );
}

/** Queued entries at the top of a list (Activity, Home's recent activity). */
export function PendingRows({
  items,
  baseCurrency,
  limit,
}: {
  items: readonly OutboxItem[];
  baseCurrency: string;
  limit?: number;
}) {
  const { open } = useSyncQueue();
  const rows = waiting(items).slice(0, limit);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Waiting to sync" className="flex flex-col gap-1">
      <h2 className="px-2 type-overline text-fg-muted">Waiting to sync</h2>
      <ul className="flex flex-col">
        {rows.map((item) => (
          <li key={item.id}>
            <TransactionRow row={pendingRow(item)} baseCurrency={baseCurrency} onPress={open} />
          </li>
        ))}
      </ul>
    </section>
  );
}
