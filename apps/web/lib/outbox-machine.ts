import { ApiError } from './api-client';
import type { MoneyDisplay } from './format-money';

// §19.3 points 3–5 as a pure state machine (F12-04, F12-07, F12-09): what an outbox entry
// is, when it is due, and what one failed attempt does to it. No storage, no timers and
// no clock of its own, so every transition is unit-tested on its own (R-06).

export const MAX_ATTEMPTS = 8;
/** First retry after 2 s, doubling to a 5-minute ceiling. */
export const BASE_DELAY_MS = 2_000;
export const MAX_DELAY_MS = 5 * 60_000;

export type OutboxEndpoint = 'createTransaction' | 'createContribution';

/** What a "Sync pending" row shows before the server has answered (estimates labelled). */
export type OutboxDisplay =
  | {
      kind: 'transaction';
      type: 'income' | 'expense';
      title: string;
      category: { icon: string; color: string };
      amount: MoneyDisplay;
      /** §11.2: an estimate from cached rates; null when none were cached. */
      baseEstimate: MoneyDisplay | null;
      date: string;
      note?: string;
    }
  | {
      kind: 'contribution';
      goalId: string;
      title: string;
      amount: MoneyDisplay;
      /** The amount in the goal's currency (an estimate unless it is the same currency). */
      goalEstimate: MoneyDisplay | null;
      /** The contributor's base-currency estimate, for Home's "saved". */
      baseEstimate: MoneyDisplay | null;
      date: string;
      note?: string;
    };

export interface OutboxItem {
  /** The client-made UUID: the record's id once synced, so edits reference it (§19.3.3). */
  id: string;
  endpoint: OutboxEndpoint;
  /** Path parameters (the goal for a contribution). */
  params?: { id: string };
  body: Record<string, unknown>;
  /** Sent on every attempt, so a retry can never create a second record (§10.1, WAC-17). */
  idempotency_key: string;
  /** Wall-clock ISO instant; orders the queue (FIFO). */
  created_at: string;
  attempts: number;
  /** The signed-in user who made it: never shown to, or sent as, anyone else. */
  owner_id: string;
  /**
   * pending: waiting or retrying. refused: the server rejected it (never stored), so it
   * can be edited. exhausted: no answer after MAX_ATTEMPTS; it may have been stored, so it
   * can be tried again (same key) or discarded, but not edited. Both of the last two are
   * "Needs attention".
   */
  state: 'pending' | 'refused' | 'exhausted';
  /** Wall-clock ms before which it isn't retried (backoff); null means due now. */
  next_attempt_at: number | null;
  /** Plain-language reason, for "Needs attention". */
  reason?: string;
  display: OutboxDisplay;
}

export type Failure =
  /** Worth retrying later: offline, timeouts, server trouble. */
  | { kind: 'transient' }
  /** Nothing can be done until the person signs in again; the attempt doesn't count. */
  | { kind: 'blocked' }
  /** The server refused the entry itself; retrying would only be refused again. */
  | { kind: 'permanent'; reason: string };

const RETRYABLE = new Set([408, 425, 429]);

/** Sort an attempt's outcome into the three kinds above. */
export function classify(error: unknown): Failure {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: 'blocked' };
    if (error.status >= 500 || RETRYABLE.has(error.status) || error.code === 'FX_UNAVAILABLE') {
      return { kind: 'transient' };
    }
    const fields = Object.values(error.fields);
    return { kind: 'permanent', reason: fields.length > 0 ? fields.join(' ') : error.message };
  }
  // fetch's TypeError, an aborted request, a malformed response: try again later.
  return { kind: 'transient' };
}

/** Delay before the attempt after `attempts` failures: 2 s, 4 s, 8 s … up to 5 min. */
export function backoffMs(attempts: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1), MAX_DELAY_MS);
}

export const EXHAUSTED_REASON =
  "We couldn't reach SpendTogether after several tries. Check your connection, then edit or discard this entry.";

/** One failed attempt. Never drops the entry: at worst it needs attention (§19.3.5). */
export function afterFailure(item: OutboxItem, failure: Failure, nowMs: number): OutboxItem {
  if (failure.kind === 'blocked') return item;
  const attempts = item.attempts + 1;
  if (failure.kind === 'permanent') {
    return { ...item, attempts, state: 'refused', next_attempt_at: null, reason: failure.reason };
  }
  if (attempts >= MAX_ATTEMPTS) {
    return {
      ...item,
      attempts,
      state: 'exhausted',
      next_attempt_at: null,
      reason: EXHAUSTED_REASON,
    };
  }
  return { ...item, attempts, next_attempt_at: nowMs + backoffMs(attempts) };
}

/** Pending, and its backoff (if any) has run out. */
export function isDue(item: OutboxItem, nowMs: number): boolean {
  return (
    item.state === 'pending' && (item.next_attempt_at === null || item.next_attempt_at <= nowMs)
  );
}

/** Oldest first; the id breaks ties so the order is total. */
export function fifo(items: readonly OutboxItem[]): OutboxItem[] {
  return [...items].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

/** The connection is back: everything pending is due now (attempts are kept). */
export function wakeAll(items: readonly OutboxItem[]): OutboxItem[] {
  return items.map((i) => (i.state === 'pending' ? { ...i, next_attempt_at: null } : i));
}

export function needsAttention(item: OutboxItem): boolean {
  return item.state !== 'pending';
}

/**
 * Editable while it can't have reached the server: never sent (made and changed
 * offline, §19.3 point 3) or refused by it. A sent, unanswered entry may already be
 * stored, and the server would answer an edit with the stored version.
 */
export function canEdit(item: OutboxItem): boolean {
  return item.state === 'refused' || (item.state === 'pending' && item.attempts === 0);
}

/**
 * The edit replaces the queued entry: same record id, a fresh start. A refused entry gets
 * a new idempotency key (`freshKey`), so a server that remembered the refusal under the
 * old key doesn't simply repeat it; a never-sent one keeps its key.
 */
export function edited(
  item: OutboxItem,
  body: Record<string, unknown>,
  display: OutboxDisplay,
  freshKey: string,
): OutboxItem {
  const next: OutboxItem = {
    ...item,
    body,
    display,
    idempotency_key: item.state === 'refused' ? freshKey : item.idempotency_key,
    attempts: 0,
    state: 'pending',
    next_attempt_at: null,
  };
  delete next.reason;
  return next;
}

/** "Try again" on an exhausted entry: same key, so a stored record is answered, not doubled. */
export function retried(item: OutboxItem): OutboxItem {
  const next: OutboxItem = { ...item, attempts: 0, state: 'pending', next_attempt_at: null };
  delete next.reason;
  return next;
}
