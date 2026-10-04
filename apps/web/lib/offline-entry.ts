'use client';

import { systemClock } from './clock';
import { outbox } from './offline-queue';
import { OUTBOX_QUEUED_EVENT, requestBackgroundSync } from './offline-sync';
import { edited, type OutboxDisplay, type OutboxEndpoint, type OutboxItem } from './outbox-machine';

// F12-05: what the forms call to save a create on this device instead of the server
// (§19.2 Forms offline: "Save → queued (create only)"). The entry's own id is its record
// id and its idempotency key, exactly as an online save would send it.

export const SAVED_OFFLINE = 'Saved offline — will sync';

/** fetch fails with a TypeError when the request never got an answer. */
export function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError;
}

export async function queueEntry(input: {
  id: string;
  endpoint: OutboxEndpoint;
  params?: { id: string };
  body: Record<string, unknown>;
  ownerId: string;
  display: OutboxDisplay;
  /**
   * The request already went out and its answer was lost, so the server may have stored
   * it: it counts as one attempt (not editable, not added to local totals).
   */
  sent?: boolean;
}): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: input.id,
    endpoint: input.endpoint,
    ...(input.params ? { params: input.params } : {}),
    body: input.body,
    idempotency_key: input.id,
    created_at: systemClock.now().toISOString(),
    attempts: input.sent ? 1 : 0,
    owner_id: input.ownerId,
    state: 'pending',
    next_attempt_at: null,
    display: input.display,
  };
  await outbox.put(item);
  announceQueued();
  return item;
}

/** Save an edit of a queued entry: still one record (§19.3 point 3). */
export async function updateQueued(
  item: OutboxItem,
  body: Record<string, unknown>,
  display: OutboxDisplay,
): Promise<void> {
  await outbox.put(edited(item, body, display, crypto.randomUUID()));
  announceQueued();
}

/** Online: send it now. Offline: ask Background Sync to wake us when the network returns. */
function announceQueued() {
  window.dispatchEvent(new Event(OUTBOX_QUEUED_EVENT));
  void requestBackgroundSync();
}
