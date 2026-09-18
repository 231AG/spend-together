# F12 — PWA and offline

## 1. Objective

Make the app installable and genuinely usable without a network: a Serwist service worker
precaching the shell, an IndexedDB outbox that queues transaction and contribution
creation, a sync loop that is safe to retry because every create is idempotent, and a
"Needs attention" list so that a permanently rejected entry is surfaced with a reason
rather than silently dropped. The governing principle from §19.3 is that **data is never
silently lost**.

## 2. Spec references

§19.3 (offline architecture, all six numbered points), §19.1 (offline global rule), §19.2
(offline column for every screen), FR-25, WAC-17; §10.1 (idempotency); §12.1 (`/offline`
route); §8.1 (Serwist + idb); §11.2 (offline entry conversion — client estimates, server
is authoritative).

## 3. Prerequisites

F7 (transaction mutations), F9 (contribution mutations), F11 (the logout warning hook),
F5 (`/offline` route and the `OfflineSyncIndicator` slot).

## 4. Deliverables

- `apps/web/sw.ts` — Serwist service worker: precache shell, fonts and icons; runtime
  network-first (3 s timeout) then cache for `GET /api/v1`.
- Web app manifest and icons; installability.
- TanStack Query persisted to IndexedDB, cleared on logout.
- `lib/offline-queue.ts` — the `outbox` store and its state machine.
- Sync triggers, backoff and attempt limit.
- "Needs attention" list with Edit and Discard.
- Logout guard when items are pending.

## 5. Task breakdown

**F12-01 · Service worker and precache** — shell, fonts and icons precached; `GET
/api/v1` runtime-cached network-first with a 3-second timeout; `/offline` served for an
uncached route. *Files:* `apps/web/sw.ts`, `next.config.ts`. *Acceptance:* with the
network disabled, a cold load of a previously visited route renders from cache, and an
unvisited route renders `/offline`.

**F12-02 · Installability** — manifest, icons, theme colour, display mode. *Files:*
`app/manifest.ts`, `public/icons/`. *Acceptance:* the install prompt appears in Chrome
and the installed app opens standalone with correct safe-area handling.

**F12-03 · Persisted read cache** — TanStack Query persisted to IndexedDB, **cleared on
logout**. *Files:* `lib/query-client.ts`. *Acceptance:* §19.3 point 2 — cached summaries
render offline; logging out removes them entirely (WAC-02).

**F12-04 · Outbox store** — `{id (UUID), endpoint, body, idempotency_key, created_at,
attempts}`; the client-generated UUID **becomes the record id** so later edits reference
it. *Files:* `lib/offline-queue.ts`. *Acceptance:* §19.3 point 3 — an entry created
offline and edited offline produces one record, not two.

**F12-05 · Queue on create when offline** — transaction and contribution creates are
queued; the row appears immediately, marked "Sync pending"; the toast reads "Saved
offline — will sync". *Files:* `hooks/use-create-transaction.ts`,
`use-contribution-mutations.ts`. *Acceptance:* **FR-25** — the optimistic row is visible
in Activity at the top, and goal status recomputes locally (§19.2 Goal-details offline
cell).

**F12-06 · Offline conversion estimate** — the client shows an estimate from cached rates
and labels it as such; the server's conversion on sync is authoritative and replaces it.
*Files:* `lib/fx-cache.ts`. *Acceptance:* §11.2 — the estimate is visibly an estimate,
and a post-sync correction does not look like a bug to the user.

**F12-07 · Sync loop** — triggered on the `online` event, on app focus, and every 60 s
while items remain; Background Sync API where supported, with those triggers as the
Safari fallback. FIFO, exponential backoff, **max 8 attempts**. *Files:*
`lib/offline-sync.ts`. *Acceptance:* §19.3 point 4 — all three triggers fire; backoff is
observable; the ninth attempt does not happen.

**F12-08 · Idempotent replay** — retries carry the original `Idempotency-Key`, so a
retried create cannot duplicate. *Files:* `lib/offline-sync.ts`. *Acceptance:*
**WAC-17** — forcing three retries of the same queued expense yields exactly one
transaction.

**F12-09 · "Needs attention" list** — an item rejected permanently (for example, the goal
was archived meanwhile) moves here with the reason and Edit / Discard actions. *Files:*
`components/features/offline/needs-attention.tsx`. *Acceptance:* §19.3 point 5 — **data
is never silently dropped**; the reason is plain language, not an error code.

**F12-10 · Offline indicator and disabled actions** — the "Offline" chip in the header;
"Sync pending (2)" with a tap-through to queue details; edits and deletes of synced
records and all goal/couple management disabled with "Connect to the internet to do
this." *Files:* `components/features/offline/`. *Acceptance:* §19.1 — exactly the
operations named in the spec are disabled, no more and no less.

**F12-11 · Logout guard** — with pending items: "2 entries haven't synced. Log out anyway
and lose them?" *Files:* `app/(app)/profile/security/page.tsx`. *Acceptance:* §19.3
point 6 — the count is accurate and logout is genuinely blocked until confirmed.

**F12-12 · Offline states across screens** — the offline column of §19.2 for Home,
Activity, Insights, Goals, Goal details, Couple, Forms and Auth. *Files:* across.
*Acceptance:* every offline cell in the matrix renders correctly.

## 6. Tooling

New: `serwist` / `@serwist/next` 9.5.12, `idb` 8.0.3,
`@tanstack/react-query-persist-client`. Playwright's offline emulation drives the tests.

## 7. Testing

Playwright with `context.setOffline(true)`: add an expense offline, come back online,
assert exactly one transaction (**WAC-17**). Unit tests for the outbox state machine —
backoff, attempt limit, transition to Needs attention. A test that logout with pending
items warns and can be cancelled. Service-worker caching tested via a cold offline load.

Covers **FR-25** and **WAC-17**; completes the offline column of **WAC-18**.

## 8. Exit criteria

1. The app is installable and opens standalone with correct safe areas.
2. A previously visited route loads offline; an unvisited one renders `/offline`.
3. Transactions and contributions created offline queue, appear immediately marked "Sync
   pending", and sync on reconnect.
4. **A retried create never duplicates** — asserted with forced retries.
5. Sync fires on `online`, on focus, and every 60 s; backoff is exponential; attempts cap
   at 8.
6. A permanently rejected item lands in "Needs attention" with a reason and Edit/Discard.
7. Exactly the operations named in §19.1 are disabled offline.
8. Logout with pending items warns with an accurate count.
9. Every offline cell of §19.2 renders.
10. Logout clears the persisted query cache and the outbox.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| R-06 outbox complexity | Idempotency makes retries safe by construction; the state machine is unit-tested independently of the UI; Q7 documents the deferral option |
| Safari lacks Background Sync | Explicitly handled: `online`, focus and 60 s polling are the specified fallback, and they are what the tests exercise |
| Service worker caches a stale build and users see old code | Serwist's versioned precache with skip-waiting on activate; a cache-version test |
| Offline estimates differ from server conversion and look like a bug | The estimate is labelled; §11.2 makes the server authoritative; the correction is expected behaviour, documented in microcopy |
| Persisted cache leaks personal data on a shared device | Cleared on logout (§19.3 point 2); no tokens are ever persisted (§25.1) |

## 10. Estimate

**5 days** — flagged high-uncertainty (±30%). Roughly: 1 day service worker and
installability, 1 day outbox store and queueing, 1.5 days sync loop with backoff and
Needs attention, 1 day offline states across screens, 0.5 day logout guard and E2E. The
uncertainty is in cross-browser service-worker behaviour, not in the logic.

## 11. Approval gate

Owner reviews: adding an expense with the network off, reconnecting, and seeing exactly
one transaction; the "Sync pending" chip and queue detail; a forced permanent rejection
landing in Needs attention; and the logout warning. Then F13 may start.
