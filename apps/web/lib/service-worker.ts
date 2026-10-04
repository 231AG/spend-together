'use client';

import { registerOfflineStore } from './session';
import { API_CACHE } from './sw-messages';

// F12-01: the app's one service worker (worker/sw.ts → /sw.js). Production builds only:
// in development every request should reach the dev server, and Storybook has its own.

export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;
  // After load, so installing (and precaching) never competes with the first paint.
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Without a worker the app still works online; offline loads show the browser's page.
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Logout (WAC-02): the worker's copy of API answers is personal data too. */
export async function clearApiCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(API_CACHE);
}

if (typeof window !== 'undefined') {
  registerOfflineStore({ pending: () => 0, clear: clearApiCache });
}
