'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OutboxItem } from './outbox-machine';

// The device's own store (§8.1 idb, §19.3 points 2–3): the outbox, and the persisted read
// cache as key-value pairs. Encrypted at rest by the OS only, so both are cleared on
// logout (WAC-02).

interface OfflineSchema extends DBSchema {
  outbox: { key: string; value: OutboxItem };
  kv: { key: string; value: string };
}

const DB_NAME = 'spendtogether';
const VERSION = 1;

let db: Promise<IDBPDatabase<OfflineSchema>> | null = null;

/** Null where IndexedDB doesn't exist (tests, very old browsers): the app then runs without. */
export function offlineDb(): Promise<IDBPDatabase<OfflineSchema>> | null {
  if (typeof indexedDB === 'undefined') return null;
  db ??= openDB<OfflineSchema>(DB_NAME, VERSION, {
    upgrade(database) {
      database.createObjectStore('outbox', { keyPath: 'id' });
      database.createObjectStore('kv');
    },
  });
  return db;
}
