// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { db } from '@/mocks/db';
import { applyScenario } from '@/mocks/scenarios';
import { call, id, useMockServer as withMockServer } from '@/mocks/test-utils';
import { apiClient } from './api-client';
import { systemClock } from './clock';
import { Outbox, memoryStorage, outbox, setOutbox } from './offline-queue';
import {
  OUTBOX_QUEUED_EVENT,
  POLL_MS,
  nextDeadline,
  runPass,
  sendItem,
  startOutboxSync,
} from './offline-sync';
import { backoffMs, type OutboxItem } from './outbox-machine';

// F12-07 / F12-08 against the real mock handlers: FIFO, backoff, refusal → Needs
// attention, nobody else's entries, and WAC-17 — a create whose answer is lost three
// times is retried with its original key and exists exactly once.

withMockServer();

const ALEX = id.user('alex');
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function expense(n: number, over: Partial<OutboxItem> = {}): OutboxItem {
  const recordId = uuid(n);
  return {
    id: recordId,
    endpoint: 'createTransaction',
    body: {
      id: recordId,
      type: 'expense',
      amount_minor: 1200 + n,
      currency: 'USD',
      category_id: id.category('food'),
      transaction_date: '2026-09-17',
      note: `Queued ${String(n)}`,
    },
    idempotency_key: recordId,
    created_at: `2026-09-17T12:00:0${String(n)}.000Z`,
    attempts: 0,
    owner_id: ALEX,
    state: 'pending',
    next_attempt_at: null,
    display: {
      kind: 'transaction',
      type: 'expense',
      title: 'Food',
      category: { icon: 'utensils', color: 'cat-food' },
      amount: { amountMinor: 1200 + n, currency: 'USD' },
      baseEstimate: { amountMinor: 1200 + n, currency: 'USD' },
      date: '2026-09-17',
    },
    ...over,
  };
}

const original = outbox;
let box: Outbox;
beforeEach(() => {
  box = new Outbox(memoryStorage());
  setOutbox(box);
});
afterEach(() => {
  setOutbox(original);
});

async function countWithNote(note: string): Promise<number> {
  const list = await call('listTransactions', { query: { limit: 100 } });
  return list.data.filter((t) => t.note === note).length;
}

describe('runPass', () => {
  it('WAC-17: three lost answers, three retries with the same key, exactly one record', async () => {
    applyScenario({ lostResponses: 3 });
    await box.put(expense(1));
    const before = db.transactions.length;
    let now = 1_000;
    const keys: string[] = [];
    const send = (item: OutboxItem) => {
      keys.push(item.idempotency_key);
      return sendItem(item);
    };
    for (let pass = 1; pass <= 3; pass += 1) {
      const result = await runPass({ box, ownerId: ALEX, send, nowMs: () => now });
      expect(result.synced).toHaveLength(0);
      const [kept] = box.snapshot();
      expect(kept).toMatchObject({ attempts: pass, state: 'pending' });
      // Backoff is observable: not due before its deadline.
      expect(nextDeadline(box.snapshot(), ALEX)).toBe(now + backoffMs(pass));
      now += backoffMs(pass);
    }
    const last = await runPass({ box, ownerId: ALEX, send, nowMs: () => now });
    expect(last.synced.map((i) => i.id)).toEqual([uuid(1)]);
    expect(box.snapshot()).toEqual([]);
    expect(new Set(keys)).toEqual(new Set([uuid(1)]));
    expect(keys).toHaveLength(4);
    expect(db.transactions.length).toBe(before + 1);
    expect(await countWithNote('Queued 1')).toBe(1);
  });

  it('FIFO: a retryable failure holds the entries behind it', async () => {
    applyScenario({ failing: ['createTransaction'] });
    await box.put(expense(2));
    await box.put(expense(1));
    const sent: string[] = [];
    await runPass({
      box,
      ownerId: ALEX,
      send: (item) => {
        sent.push(item.id);
        return sendItem(item);
      },
      nowMs: () => 0,
    });
    expect(sent).toEqual([uuid(1)]);
    expect(box.snapshot().find((i) => i.id === uuid(2))?.attempts).toBe(0);
  });

  it('a refusal moves to Needs attention with the reason, and the pass goes on', async () => {
    applyScenario({ rejecting: ['createContribution'] });
    await box.put({
      ...expense(1),
      endpoint: 'createContribution',
      params: { id: id.goal('laptop') },
      body: { id: uuid(1), amount_minor: 1000, currency: 'USD', contribution_date: '2026-09-17' },
    });
    await box.put(expense(2));
    const result = await runPass({ box, ownerId: ALEX, send: sendItem, nowMs: () => 0 });
    expect(result.attention.map((i) => i.state)).toEqual(['refused']);
    expect(result.attention[0]?.reason).toBe(
      'This goal was archived, so it no longer takes contributions.',
    );
    expect(result.synced.map((i) => i.id)).toEqual([uuid(2)]);
    // Never dropped: it's still in the queue for Edit or Discard.
    expect(box.snapshot().map((i) => i.id)).toEqual([uuid(1)]);
  });

  it("never sends another person's entries", async () => {
    await box.put(expense(1, { owner_id: id.user('sam') }));
    const send = vi.fn(sendItem);
    await runPass({ box, ownerId: ALEX, send, nowMs: () => 0 });
    expect(send).not.toHaveBeenCalled();
    expect(box.snapshot()).toHaveLength(1);
  });
});

describe('triggers (§19.3 point 4)', () => {
  let spy: MockInstance<typeof apiClient.call>;
  let stop: () => void = () => undefined;
  const qc = new QueryClient();
  const attempts = () => spy.mock.calls.length;
  const settle = () => vi.advanceTimersByTimeAsync(1);

  beforeEach(() => {
    vi.useFakeTimers();
    spy = vi.spyOn(apiClient, 'call');
  });
  afterEach(() => {
    stop();
    spy.mockRestore();
    vi.useRealTimers();
  });

  it('on start, then again when the backoff runs out (not only on the poll)', async () => {
    spy.mockRejectedValue(new TypeError('offline'));
    await box.put(expense(1));
    stop = startOutboxSync(qc, ALEX);
    await settle();
    expect(attempts()).toBe(1);
    await vi.advanceTimersByTimeAsync(backoffMs(1) - 2);
    expect(attempts()).toBe(1);
    await vi.advanceTimersByTimeAsync(2);
    expect(attempts()).toBe(2);
  });

  it('back online: backing-off entries are sent at once', async () => {
    spy.mockResolvedValue({});
    await box.put(
      expense(1, { attempts: 3, next_attempt_at: systemClock.now().getTime() + 600_000 }),
    );
    stop = startOutboxSync(qc, ALEX);
    await settle();
    expect(attempts()).toBe(0);
    window.dispatchEvent(new Event('online'));
    await settle();
    expect(attempts()).toBe(1);
    expect(box.snapshot()).toEqual([]);
  });

  it('app focus, and an entry queued while online, each run a pass', async () => {
    spy.mockResolvedValue({});
    stop = startOutboxSync(qc, ALEX);
    await settle();
    await box.put(expense(1));
    await settle();
    expect(attempts()).toBe(0);
    window.dispatchEvent(new Event('focus'));
    await settle();
    expect(attempts()).toBe(1);
    await box.put(expense(2));
    window.dispatchEvent(new Event(OUTBOX_QUEUED_EVENT));
    await settle();
    expect(attempts()).toBe(2);
  });

  it('every 60 s while something waits, and not otherwise', async () => {
    spy.mockResolvedValue({});
    stop = startOutboxSync(qc, ALEX);
    await settle();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(attempts()).toBe(0);
    await box.put(expense(1));
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(attempts()).toBe(1);
  });
});
