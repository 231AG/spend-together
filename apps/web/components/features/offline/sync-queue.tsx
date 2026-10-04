'use client';

import { AlertTriangle, ArrowLeft, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ContributionForm } from '@/components/features/goals/contribution-form';
import { TransactionForm } from '@/components/features/transactions/transaction-form';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog } from '@/components/ui/dialog';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { MoneyText } from '@/components/ui/money-text';
import { OfflineSyncIndicator } from '@/components/ui/offline-sync-indicator';
import { useToast } from '@/components/ui/toast';
import { useOnline } from '@/lib/connectivity';
import { formatDay } from '@/lib/format-date';
import { outbox, useOutbox, useSending } from '@/lib/offline-queue';
import { onSyncPass, startOutboxSync, syncNow } from '@/lib/offline-sync';
import { canEdit, needsAttention, retried, type OutboxItem } from '@/lib/outbox-machine';
import { waiting } from '@/lib/pending-entries';
import { useGoal, useMe } from '@/lib/queries';

// F12-07, F12-09, F12-10 (§19.1, §19.3 points 4–5). The shell's sync engine and its one
// window: the header chip opens "Waiting to sync", listing entries still queued and the
// ones that need attention, each with its reason and Edit / Discard. Nothing leaves the
// queue unless it synced or the person discarded it: data is never silently dropped.

interface SyncQueueApi {
  open: () => void;
}
const SyncQueueContext = createContext<SyncQueueApi>({ open: () => undefined });

/** Open the queue from anywhere (a "Sync pending" row, a toast action). */
export function useSyncQueue(): SyncQueueApi {
  return useContext(SyncQueueContext);
}

/** The signed-in person's queue, for the screens' "Sync pending" rows. */
export function useMyOutbox(): readonly OutboxItem[] {
  return useOutbox(useMe().data?.id);
}

export function SyncQueueProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const api = useMemo(
    () => ({
      open: () => {
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <SyncQueueContext.Provider value={api}>
      {children}
      <OutboxEngine onReview={api.open} />
      <SyncQueueDialog open={open} onOpenChange={setOpen} />
    </SyncQueueContext.Provider>
  );
}

/** The header chip: offline, pending and attention counts; opens the queue. */
export function SyncIndicator() {
  const online = useOnline();
  const items = useMyOutbox();
  const { open } = useSyncQueue();
  const attention = items.filter(needsAttention).length;
  return (
    <OfflineSyncIndicator
      online={online}
      pendingCount={items.length - attention}
      attentionCount={attention}
      onOpen={open}
    />
  );
}

/** Starts the triggers for whoever is signed in, and says what each pass did. */
function OutboxEngine({ onReview }: { onReview: () => void }) {
  const qc = useQueryClient();
  const ownerId = useMe().data?.id;
  const toast = useToast();
  useEffect(() => (ownerId ? startOutboxSync(qc, ownerId) : undefined), [qc, ownerId]);
  useEffect(
    () =>
      onSyncPass(({ synced, attention }) => {
        if (synced.length > 0) {
          toast({
            message:
              synced.length === 1
                ? '1 offline entry synced'
                : `${String(synced.length)} offline entries synced`,
          });
        }
        if (attention.length > 0) {
          toast({
            message:
              attention.length === 1
                ? "1 entry couldn't be saved and needs attention"
                : `${String(attention.length)} entries couldn't be saved and need attention`,
            action: {
              label: 'Review',
              altText: 'Review entries that need attention',
              onAction: onReview,
            },
          });
        }
      }),
    [toast, onReview],
  );
  return null;
}

function SyncQueueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const online = useOnline();
  const qc = useQueryClient();
  const ownerId = useMe().data?.id;
  const items = useMyOutbox();
  const [editing, setEditing] = useState<OutboxItem | null>(null);
  const [discarding, setDiscarding] = useState<OutboxItem | null>(null);
  const toast = useToast();
  const attention = items.filter(needsAttention);
  const queued = waiting(items);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
          onOpenChange(next);
        }}
        title={editing ? 'Edit entry' : 'Waiting to sync'}
      >
        {editing ? (
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              iconLeft={<ArrowLeft aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
              onClick={() => {
                setEditing(null);
              }}
            >
              Back to the list
            </Button>
            <EditQueued
              item={editing}
              onDone={() => {
                setEditing(null);
                toast({ message: 'Entry updated — will sync' });
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <p className="type-body-sm text-fg-body">
              {online
                ? 'These are saved on this device and are being sent now.'
                : "You're offline. These are saved on this device and sync when you reconnect."}
            </p>
            {attention.length > 0 && (
              <section aria-labelledby="attention-title" className="flex flex-col gap-2">
                <h3
                  id="attention-title"
                  className="flex items-center gap-2 type-label text-fg-default"
                >
                  <AlertTriangle
                    aria-hidden
                    className="size-(--icon-sm) text-status-atrisk-fg"
                    strokeWidth={1.75}
                  />
                  Needs attention ({attention.length})
                </h3>
                <ul className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default">
                  {attention.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      onEdit={setEditing}
                      onDiscard={setDiscarding}
                      onRetry={(i) => {
                        void outbox.put(retried(i)).then(() => {
                          if (ownerId) void syncNow(qc, ownerId);
                        });
                      }}
                    />
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="pending-title" className="flex flex-col gap-2">
              <h3 id="pending-title" className="type-label text-fg-default">
                Sync pending ({queued.length})
              </h3>
              {queued.length === 0 ? (
                <p className="type-body-sm text-fg-muted">
                  Nothing is waiting. New expenses, income and contributions you add offline will
                  appear here until they sync.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default">
                  {queued.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      onEdit={setEditing}
                      onDiscard={setDiscarding}
                    />
                  ))}
                </ul>
              )}
            </section>
            {online && queued.length > 0 && ownerId && (
              <Button
                variant="secondary"
                className="self-start"
                iconLeft={<RefreshCw aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
                onClick={() => void syncNow(qc, ownerId)}
              >
                Sync now
              </Button>
            )}
          </div>
        )}
      </Dialog>
      <ConfirmationDialog
        open={discarding !== null}
        onOpenChange={(next) => {
          if (!next) setDiscarding(null);
        }}
        title="Discard this entry?"
        consequences={
          discarding && (discarding.attempts > 0 || discarding.state === 'exhausted')
            ? "It may not have reached your account. If it did, it will still appear in your activity; if not, it can't be recovered."
            : "It hasn't been saved to your account, so it can't be recovered."
        }
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          if (!discarding) return;
          void outbox.remove(discarding.id).then(() => {
            toast({ message: 'Entry discarded' });
          });
          setDiscarding(null);
        }}
      />
    </>
  );
}

function QueueRow({
  item,
  onEdit,
  onDiscard,
  onRetry,
}: {
  item: OutboxItem;
  onEdit: (item: OutboxItem) => void;
  onDiscard: (item: OutboxItem) => void;
  onRetry?: (item: OutboxItem) => void;
}) {
  const d = item.display;
  const kind = d.kind === 'contribution' ? 'saving' : d.type;
  const word =
    d.kind === 'contribution' ? 'Contribution' : d.type === 'income' ? 'Income' : 'Expense';
  const base = d.kind === 'contribution' ? d.goalEstimate : d.baseEstimate;
  const sending = useSending().has(item.id);
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-start gap-3">
        {d.kind === 'transaction' && (
          <CategoryIcon icon={d.category.icon} color={d.category.color} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="type-label text-fg-default">
            {word} · {d.title}
          </span>
          <span className="type-body-sm text-fg-muted">
            {[d.note, formatDay(d.date)].filter(Boolean).join(' · ')}
          </span>
        </div>
        <MoneyText
          money={d.amount}
          kind={kind}
          {...(base && base.currency !== d.amount.currency ? { base, provisional: true } : {})}
        />
      </div>
      {item.reason && (
        <p className="type-body-sm text-fg-body">
          <span className="sr-only">Why: </span>
          {item.reason}
        </p>
      )}
      {sending ? (
        // The answer decides what happens to it; Edit and Discard wait for that.
        <p role="status" className="flex items-center gap-2 type-body-sm text-fg-muted">
          <RefreshCw aria-hidden className="spin size-(--icon-sm)" strokeWidth={1.75} />
          Sending…
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canEdit(item) && (
            <Button
              variant="tertiary"
              size="sm"
              aria-label={`Edit ${word.toLowerCase()} ${d.title}`}
              iconLeft={<Pencil aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
              onClick={() => {
                onEdit(item);
              }}
            >
              Edit
            </Button>
          )}
          {item.state === 'exhausted' && onRetry && (
            <Button
              variant="tertiary"
              size="sm"
              aria-label={`Try again: ${word.toLowerCase()} ${d.title}`}
              iconLeft={<RefreshCw aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
              onClick={() => {
                onRetry(item);
              }}
            >
              Try again
            </Button>
          )}
          <Button
            variant="tertiary"
            size="sm"
            aria-label={`Discard ${word.toLowerCase()} ${d.title}`}
            iconLeft={<Trash2 aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
            onClick={() => {
              onDiscard(item);
            }}
          >
            Discard
          </Button>
        </div>
      )}
    </li>
  );
}

/** The same forms as online, saving back into the queue (§19.3 point 3: still one record). */
function EditQueued({ item, onDone }: { item: OutboxItem; onDone: () => void }) {
  const d = item.display;
  if (d.kind === 'transaction') {
    return <TransactionForm type={d.type} queued={item} onSaved={onDone} />;
  }
  return <EditQueuedContribution item={item} goalId={d.goalId} onDone={onDone} />;
}

function EditQueuedContribution({
  item,
  goalId,
  onDone,
}: {
  item: OutboxItem;
  goalId: string;
  onDone: () => void;
}) {
  const goal = useGoal(goalId);
  if (goal.data) return <ContributionForm goal={goal.data} queued={item} onSaved={onDone} />;
  if (goal.isPending && goal.fetchStatus !== 'paused') {
    return <LoadingSkeleton shape="row" count={3} label="Loading the goal" />;
  }
  return (
    <FormNotice tone="offline">
      This goal isn&apos;t saved on this device, so the entry can be edited once you&apos;re back
      online. You can still discard it.
    </FormNotice>
  );
}
