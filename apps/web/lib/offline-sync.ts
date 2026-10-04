'use client';

import { endpoints } from '@spendtogether/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { systemClock } from './clock';
import { outbox, type Outbox } from './offline-queue';
import { afterFailure, classify, fifo, isDue, wakeAll, type OutboxItem } from './outbox-machine';
import { TRANSACTION_DEPENDENTS } from './queries';
import { OUTBOX_SYNC_MESSAGE, OUTBOX_SYNC_TAG } from './sw-messages';

// F12-07 / F12-08 (§19.3 point 4): drain the outbox oldest first. Every attempt carries the
// entry's original Idempotency-Key, so a create whose answer was lost and is sent again
// can't make a second record (WAC-17). A retryable failure stops the pass (later entries
// never overtake an earlier one) and backs off; a refusal moves the entry to Needs
// attention and the pass continues. Triggers: back online, app focus, every 60 s while
// entries remain, and Background Sync where the browser has it.

export const POLL_MS = 60_000;

export interface PassResult {
  synced: OutboxItem[];
  /** Entries that newly need attention in this pass. */
  attention: OutboxItem[];
}

export interface PassDeps {
  box: Outbox;
  ownerId: string;
  send: (item: OutboxItem) => Promise<unknown>;
  nowMs: () => number;
}

/** One pass over the due entries of `ownerId`. Exported for the state-machine tests. */
export async function runPass({ box, ownerId, send, nowMs }: PassDeps): Promise<PassResult> {
  await box.load();
  const result: PassResult = { synced: [], attention: [] };
  const queue = fifo(box.snapshot().filter((i) => i.owner_id === ownerId));
  for (const item of queue) {
    if (item.state !== 'pending') continue;
    // FIFO: an earlier entry still backing off holds the ones behind it.
    if (!isDue(item, nowMs())) break;
    try {
      await send(item);
      await box.remove(item.id);
      result.synced.push(item);
    } catch (error) {
      const failure = classify(error);
      const next = afterFailure(item, failure, nowMs());
      if (next !== item) await box.put(next);
      if (next.state !== 'pending') {
        result.attention.push(next);
        continue;
      }
      break;
    }
  }
  return result;
}

/**
 * The real request: the same call the online form makes, with the original key. The
 * stored body is checked against the frozen schema by the client before it is sent.
 */
export function sendItem(item: OutboxItem): Promise<unknown> {
  if (item.endpoint === 'createContribution') {
    if (!item.params) throw new TypeError('A queued contribution needs its goal id.');
    return apiClient.call(endpoints.createContribution, {
      params: item.params,
      body: item.body as never,
      idempotencyKey: item.idempotency_key,
    });
  }
  return apiClient.call(endpoints.createTransaction, {
    body: item.body as never,
    idempotencyKey: item.idempotency_key,
  });
}

type Listener = (result: PassResult) => void;
const listeners = new Set<Listener>();

/** The shell's announcer: "2 entries synced", "1 entry needs attention". */
export function onSyncPass(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let running: Promise<void> | null = null;

/**
 * Run a pass now unless one is running (in this tab, or in another one holding the lock).
 * Skipped while offline: an attempt that can't leave the device shouldn't count.
 */
export function syncNow(qc: QueryClient, ownerId: string): Promise<void> {
  if (!navigator.onLine) return Promise.resolve();
  running ??= (async () => {
    try {
      const pass = () =>
        runPass({ box: outbox, ownerId, send: sendItem, nowMs: () => systemClock.now().getTime() });
      const result = await withLock(pass);
      if (result && (result.synced.length > 0 || result.attention.length > 0)) {
        if (result.synced.length > 0) await refreshAfterSync(qc);
        for (const listener of listeners) listener(result);
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/** One tab drains the queue at a time; others skip rather than wait. */
async function withLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!('locks' in navigator)) return fn();
  return navigator.locks.request('spendtogether-outbox-sync', { ifAvailable: true }, (lock) =>
    lock ? fn() : null,
  );
}

/** Synced entries move totals, lists and goals: the server's figures replace estimates. */
function refreshAfterSync(qc: QueryClient) {
  return Promise.all(
    [...TRANSACTION_DEPENDENTS, ['goals'], ['transactions']].map((queryKey) =>
      qc.invalidateQueries({ queryKey: [...queryKey] }),
    ),
  );
}

/** Ask the browser to wake us when it's back online (Background Sync, Chromium). */
export async function requestBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const sync = (registration as { sync?: { register(tag: string): Promise<void> } } | undefined)
      ?.sync;
    await sync?.register(OUTBOX_SYNC_TAG);
  } catch {
    // Not supported or not allowed: the online, focus and 60 s triggers cover it.
  }
}

/** Wire every trigger for the signed-in person. Returns the cleanup. */
/** Fired by the forms when they queue an entry, so an online device sends it at once. */
export const OUTBOX_QUEUED_EVENT = 'spendtogether:outbox-queued';

/** The earliest backoff deadline among this person's pending entries, if any. */
export function nextDeadline(items: readonly OutboxItem[], ownerId: string): number | null {
  let soonest: number | null = null;
  for (const item of items) {
    if (item.owner_id !== ownerId || item.state !== 'pending' || item.next_attempt_at === null) {
      continue;
    }
    if (soonest === null || item.next_attempt_at < soonest) soonest = item.next_attempt_at;
  }
  return soonest;
}

/** Wire every trigger for the signed-in person. Returns the cleanup. */
export function startOutboxSync(qc: QueryClient, ownerId: string): () => void {
  let retry: number | undefined;
  let stopped = false;
  // After each pass, wake up again when the earliest backoff runs out (observable
  // backoff, not only the 60 s poll).
  const run = () => {
    void syncNow(qc, ownerId).then(() => {
      if (stopped) return;
      window.clearTimeout(retry);
      const deadline = nextDeadline(outbox.snapshot(), ownerId);
      if (deadline !== null) {
        retry = window.setTimeout(run, Math.max(0, deadline - systemClock.now().getTime()));
      }
    });
  };
  const online = () => {
    // The connection is back: whatever was backing off is due now.
    void (async () => {
      await outbox.load();
      for (const item of wakeAll(outbox.snapshot())) {
        const before = outbox.snapshot().find((i) => i.id === item.id);
        if (before && before.next_attempt_at !== item.next_attempt_at) await outbox.put(item);
      }
      run();
    })();
  };
  const visible = () => {
    if (document.visibilityState === 'visible') run();
  };
  const message = (event: MessageEvent<unknown>) => {
    const data = event.data as { type?: unknown } | null;
    if (data?.type === OUTBOX_SYNC_MESSAGE) run();
  };
  // Every 60 s, but only while this person has something waiting.
  const timer = window.setInterval(() => {
    if (outbox.snapshot().some((i) => i.owner_id === ownerId && i.state === 'pending')) run();
  }, POLL_MS);

  window.addEventListener('online', online);
  window.addEventListener('focus', run);
  window.addEventListener(OUTBOX_QUEUED_EVENT, run);
  document.addEventListener('visibilitychange', visible);
  // Absent on insecure origins (plain http other than localhost).
  const worker = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
  worker?.addEventListener('message', message);
  void outbox.load().then(run);

  return () => {
    stopped = true;
    window.clearTimeout(retry);
    window.clearInterval(timer);
    window.removeEventListener('online', online);
    window.removeEventListener('focus', run);
    window.removeEventListener(OUTBOX_QUEUED_EVENT, run);
    document.removeEventListener('visibilitychange', visible);
    worker?.removeEventListener('message', message);
  };
}
