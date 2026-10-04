'use client';

import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

// Spec §14.3 OfflineSyncIndicator and §19.1: a subtle chip in the header — "Offline",
// "Sync pending (2)", or "Needs attention (1)" when an entry was refused (§19.3 point 5).
// Activating it opens the queue (F12-10). Nothing renders when online with nothing
// queued. Icon and words always carry the meaning together, never colour alone.

export interface OfflineSyncIndicatorProps {
  online: boolean;
  pendingCount: number;
  attentionCount?: number;
  onOpen?: () => void;
}

export function indicatorLabel(online: boolean, pending: number, attention: number): string {
  const parts: string[] = [];
  if (!online) parts.push('Offline');
  if (attention > 0) parts.push(`Needs attention (${String(attention)})`);
  if (pending > 0) parts.push(`Sync pending (${String(pending)})`);
  return parts.join(' · ');
}

export function OfflineSyncIndicator({
  online,
  pendingCount,
  attentionCount = 0,
  onOpen,
}: OfflineSyncIndicatorProps) {
  if (online && pendingCount === 0 && attentionCount === 0) return null;
  const Icon = attentionCount > 0 ? AlertTriangle : online ? RefreshCw : CloudOff;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 type-caption hover:bg-bg-subtle',
        attentionCount > 0
          ? 'border-status-atrisk-fg bg-status-atrisk-bg text-status-atrisk-fg'
          : 'border-border-input bg-bg-card text-fg-body',
      )}
    >
      <Icon aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
      {indicatorLabel(online, pendingCount, attentionCount)}
    </button>
  );
}
