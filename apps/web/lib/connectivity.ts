'use client';

import { useSyncExternalStore } from 'react';

// Online state for the shell's OfflineSyncIndicator (§19.1). The browser's own signal,
// plus, in mock mode, the scenario switcher's "Offline" preset, which announces itself
// with MOCK_CONNECTIVITY_EVENT so the whole shell can be reviewed offline.

export const MOCK_CONNECTIVITY_EVENT = 'spendtogether:mock-connectivity';

let mockOffline = false;

export function announceMockConnectivity(offline: boolean): void {
  mockOffline = offline;
  window.dispatchEvent(new Event(MOCK_CONNECTIVITY_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  window.addEventListener(MOCK_CONNECTIVITY_EVENT, onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
    window.removeEventListener(MOCK_CONNECTIVITY_EVENT, onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine && !mockOffline,
    () => true,
  );
}
