'use client';

import { useSyncExternalStore } from 'react';

// Device preferences that are not personal data (spec §12.1 onboarding flag, §12.2
// shortcut toggle). localStorage can be unavailable (private mode), so every access is
// guarded and the default applies.

const SHORTCUTS_KEY = 'spendtogether.shortcuts';
const CHANGE = 'spendtogether:preferences';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not persisted; the in-memory event below still updates this tab.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Keyboard shortcuts are on unless the user turned them off in Profile (§12.2). */
export function shortcutsEnabled(): boolean {
  return read(SHORTCUTS_KEY) !== 'off';
}

export function setShortcutsEnabled(enabled: boolean): void {
  write(SHORTCUTS_KEY, enabled ? 'on' : 'off');
}

export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(subscribe, shortcutsEnabled, () => true);
}
