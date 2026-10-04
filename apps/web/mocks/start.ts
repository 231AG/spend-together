import { setAppClock } from '@/lib/clock';
import { announceMockConnectivity } from '@/lib/connectivity';
import { setApiTransport } from '@/lib/api-client';
import { mockFetch } from './in-page';
import { mockClock } from './clock';
import { restoreScenario } from './persist';
import { scenario } from './scenarios';

let started: Promise<void> | null = null;

/**
 * Start the in-page mock API before the app's first request (NEXT_PUBLIC_API_MODE=mock).
 * Idempotent: React runs effects twice in development.
 */
export function startMockWorker(): Promise<void> {
  if (!started) {
    restoreScenario();
    setAppClock(mockClock);
    announceMockConnectivity(scenario().offline);
    setApiTransport(mockFetch);
    started = Promise.resolve();
  }
  return started;
}
