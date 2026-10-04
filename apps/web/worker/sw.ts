/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { NetworkFirst, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';
import { API_CACHE, OUTBOX_SYNC_MESSAGE, OUTBOX_SYNC_TAG } from '../lib/sw-messages';

// F12-01 (§19.3 point 1). Precaches the app shell, fonts and icons; answers `GET /api/v1`
// network-first with a 3 s timeout, then from cache; sends a never-cached page to
// /offline. Built by `serwist build` after `next build` (serwist.config.mjs).

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  // A new build takes over at once, so nobody keeps running stale code (F12 risk).
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // Personal data: same-origin GETs only, never auth calls; cleared on logout.
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        request.method === 'GET' &&
        url.pathname.startsWith('/api/v1/') &&
        !url.pathname.startsWith('/api/v1/auth/'),
      handler: new NetworkFirst({ cacheName: API_CACHE, networkTimeoutSeconds: 3 }),
    },
    ...defaultCache,
  ],
});

// A page that was never cached, offline: send the browser to /offline (precached). A
// redirect rather than serving its HTML under the requested URL, which Next's router
// would treat as the wrong page.
serwist.setCatchHandler(({ request }) =>
  Promise.resolve(
    request.destination === 'document'
      ? Response.redirect(new URL('/offline', self.location.origin).href, 302)
      : Response.error(),
  ),
);

serwist.addEventListeners();

/** Background Sync isn't in the WebWorker typings. */
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// Background Sync (where supported): wake the open app to drain its outbox. The outbox
// logic lives in the page, so with no window open the entries wait for the next visit,
// when the online, focus and 60 s triggers take over (the Safari path, §19.3 point 4).
self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag !== OUTBOX_SYNC_TAG) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windows) => {
      for (const client of windows) client.postMessage({ type: OUTBOX_SYNC_MESSAGE });
    }),
  );
}) as EventListener);
