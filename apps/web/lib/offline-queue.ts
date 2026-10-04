'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { offlineDb } from './offline-db';
import type { OutboxItem } from './outbox-machine';
import { registerOfflineStore } from './session';

// F12-04 (§19.3 point 3): the outbox. IndexedDB is the record; this module keeps an
// in-memory copy for rendering ("Sync pending" rows, the header count, Needs attention)
// and tells other tabs when it changes. Transitions live in outbox-machine.ts.

export interface OutboxStorage {
  all(): Promise<OutboxItem[]>;
  put(item: OutboxItem): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

function idbStorage(): OutboxStorage | null {
  const open = offlineDb();
  if (!open) return null;
  return {
    all: async () => (await open).getAll('outbox'),
    put: async (item) => {
      await (await open).put('outbox', item);
    },
    remove: async (id) => {
      await (await open).delete('outbox', id);
    },
    clear: async () => {
      await (await open).clear('outbox');
    },
  };
}

/** For tests, and for browsers without IndexedDB (entries then last until reload). */
export function memoryStorage(seed: OutboxItem[] = []): OutboxStorage {
  const items = new Map(seed.map((i) => [i.id, i] as const));
  return {
    all: () => Promise.resolve([...items.values()]),
    put: (item) => {
      items.set(item.id, item);
      return Promise.resolve();
    },
    remove: (id) => {
      items.delete(id);
      return Promise.resolve();
    },
    clear: () => {
      items.clear();
      return Promise.resolve();
    },
  };
}

const CHANNEL = 'spendtogether-outbox';
const EMPTY: readonly OutboxItem[] = [];

const NONE: ReadonlySet<string> = new Set();

export class Outbox {
  private items: readonly OutboxItem[] = EMPTY;
  /** Ids being sent right now: not editable or discardable until the answer is in. */
  private inFlight: ReadonlySet<string> = NONE;
  private readonly listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;
  private readonly channel: BroadcastChannel | null;

  constructor(private readonly storage: OutboxStorage) {
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
    this.channel?.addEventListener('message', () => {
      void this.reload();
    });
  }

  /** Reads the stored queue once; later calls wait for the same read. A failed read is retried. */
  load(): Promise<void> {
    this.loading ??= this.reload().catch((error: unknown) => {
      this.loading = null;
      throw error;
    });
    return this.loading;
  }

  snapshot = (): readonly OutboxItem[] => this.items;

  sending = (): ReadonlySet<string> => this.inFlight;

  /** Mark an entry as being sent (or done), so the queue UI can hold Edit and Discard. */
  setSending(id: string, on: boolean): void {
    const next = new Set(this.inFlight);
    if (on) next.add(id);
    else next.delete(id);
    this.inFlight = next;
    for (const listener of this.listeners) listener();
  }

  /** The entry as stored now (it may have changed while a request was out). */
  current(id: string): OutboxItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async put(item: OutboxItem): Promise<void> {
    await this.load();
    await this.storage.put(item);
    this.set([...this.items.filter((i) => i.id !== item.id), item], true);
  }

  async remove(id: string): Promise<void> {
    await this.load();
    await this.storage.remove(id);
    this.set(
      this.items.filter((i) => i.id !== id),
      true,
    );
  }

  async clear(): Promise<void> {
    await this.storage.clear();
    this.set(EMPTY, true);
  }

  private async reload(): Promise<void> {
    this.set(await this.storage.all(), false);
  }

  private set(items: readonly OutboxItem[], broadcast: boolean) {
    this.items = items;
    if (broadcast) this.channel?.postMessage('changed');
    for (const listener of this.listeners) listener();
  }
}

export let outbox = new Outbox(idbStorage() ?? memoryStorage());

/** Tests: start from a known queue. */
export function setOutbox(next: Outbox): void {
  outbox = next;
}

// Logout (§19.3 point 6, WAC-02): warn with the count of unsynced entries, then empty it.
if (typeof window !== 'undefined') {
  registerOfflineStore({
    pending: async () => {
      await outbox.load();
      return outbox.snapshot().length;
    },
    clear: () => outbox.clear(),
  });
}

/** Ids being sent right now (Edit and Discard wait for the answer). */
export function useSending(): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => outbox.subscribe(listener),
    () => outbox.sending(),
    () => NONE,
  );
}

/** The signed-in person's queued entries; nobody else's are ever shown. */
export function useOutbox(ownerId: string | undefined): readonly OutboxItem[] {
  const all = useSyncExternalStore(
    (listener) => outbox.subscribe(listener),
    () => outbox.snapshot(),
    () => EMPTY,
  );
  return useMemo(
    () => (ownerId === undefined ? EMPTY : all.filter((i) => i.owner_id === ownerId)),
    [all, ownerId],
  );
}
