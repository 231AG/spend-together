'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { Popover } from 'radix-ui';

// Spec §14.3 OfflineSyncIndicator and §19.1: a subtle chip, "Offline" or
// "Sync pending (2)"; activating it shows what is queued. Nothing renders when online
// with an empty queue.

export interface OfflineSyncIndicatorProps {
  online: boolean;
  pendingCount: number;
  /** Short descriptions of queued items, e.g. "Expense · Food · $12.00". */
  pendingItems?: string[];
}

export function OfflineSyncIndicator({
  online,
  pendingCount,
  pendingItems = [],
}: OfflineSyncIndicatorProps) {
  if (online && pendingCount === 0) return null;
  const label = pendingCount > 0 ? `Sync pending (${pendingCount})` : 'Offline';
  const Icon = online ? RefreshCw : CloudOff;
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-input bg-bg-card px-3 type-caption text-fg-body hover:bg-bg-subtle">
        <Icon aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
        {online ? label : pendingCount > 0 ? `Offline · ${label}` : label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          className="z-(--z-overlay) w-(--popover-width) rounded-lg border border-border-default bg-bg-card p-4 shadow-elev-2"
        >
          <p className="type-label text-fg-default">
            {online ? 'Syncing your changes' : 'You are offline'}
          </p>
          <p className="mt-1 type-body-sm text-fg-muted">
            {pendingCount > 0
              ? 'These will be saved as soon as you are back online.'
              : 'New transactions and contributions will be saved on this device and synced later.'}
          </p>
          {pendingItems.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 type-body-sm text-fg-body">
              {pendingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
