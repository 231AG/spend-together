import { announceMockConnectivity } from '@/lib/connectivity';
import { worker } from './browser';
import { restoreScenario } from './persist';
import { scenario } from './scenarios';

let started: Promise<void> | null = null;

/**
 * Start the MSW worker before the app's first request (NEXT_PUBLIC_API_MODE=mock).
 * Idempotent: React runs effects twice in development, and MSW refuses a second start.
 */
export function startMockWorker(): Promise<void> {
  started ??= (async () => {
    restoreScenario();
    announceMockConnectivity(scenario().offline);
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  })();
  return started;
}
