// Names shared by the page and the service worker (worker/sw.ts). No DOM or worker APIs
// here: both sides import it.

/** The runtime cache of `GET /api/v1` answers; personal data, cleared on logout. */
export const API_CACHE = 'api-v1';
/** Background Sync tag the page registers when it queues an entry. */
export const OUTBOX_SYNC_TAG = 'outbox-sync';
/** Posted by the service worker to open windows when Background Sync fires. */
export const OUTBOX_SYNC_MESSAGE = 'spendtogether:outbox-sync';
