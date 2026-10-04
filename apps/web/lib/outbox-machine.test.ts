import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import {
  EXHAUSTED_REASON,
  MAX_ATTEMPTS,
  afterFailure,
  backoffMs,
  canEdit,
  classify,
  edited,
  fifo,
  isDue,
  needsAttention,
  retried,
  wakeAll,
  type OutboxItem,
} from './outbox-machine';

// F12-04 / F12-07 / F12-09: the outbox state machine on its own (R-06).

const item = (over: Partial<OutboxItem> = {}): OutboxItem => ({
  id: 'a',
  endpoint: 'createTransaction',
  body: { amount_minor: 1200 },
  idempotency_key: 'a',
  created_at: '2026-09-17T12:00:00.000Z',
  attempts: 0,
  owner_id: 'alex',
  state: 'pending',
  next_attempt_at: null,
  display: {
    kind: 'transaction',
    type: 'expense',
    title: 'Food',
    category: { icon: 'utensils', color: 'cat-food' },
    amount: { amountMinor: 1200, currency: 'USD' },
    baseEstimate: { amountMinor: 1200, currency: 'USD' },
    date: '2026-09-17',
  },
  ...over,
});

const apiError = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  new ApiError(status, {
    error: { code: code as never, message, request_id: 'r', ...(fields ? { fields } : {}) },
  });

describe('classify', () => {
  it('network failures and server trouble are retried', () => {
    expect(classify(new TypeError('Failed to fetch'))).toEqual({ kind: 'transient' });
    expect(classify(apiError(500, 'INTERNAL', 'x'))).toEqual({ kind: 'transient' });
    expect(classify(apiError(429, 'RATE_LIMITED', 'x'))).toEqual({ kind: 'transient' });
    expect(classify(apiError(503, 'FX_UNAVAILABLE', 'x'))).toEqual({ kind: 'transient' });
  });
  it('an ended session blocks without spending an attempt', () => {
    expect(classify(apiError(401, 'UNAUTHENTICATED', 'x'))).toEqual({ kind: 'blocked' });
    expect(afterFailure(item(), { kind: 'blocked' }, 0)).toEqual(item());
  });
  it('a refusal is permanent, with the server’s plain-language reason', () => {
    expect(classify(apiError(409, 'CONFLICT', 'This goal was archived.'))).toEqual({
      kind: 'permanent',
      reason: 'This goal was archived.',
    });
    expect(
      classify(
        apiError(422, 'VALIDATION_FAILED', 'Check the highlighted fields.', {
          category_id: 'That category is archived.',
        }),
      ),
    ).toEqual({ kind: 'permanent', reason: 'That category is archived.' });
  });
});

describe('backoff and the attempt limit (§19.3 point 4)', () => {
  it('doubles from 2 s to a 5-minute ceiling', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([2_000, 4_000, 8_000, 16_000]);
    expect(backoffMs(20)).toBe(300_000);
  });

  it('retries 7 times, and the 8th failure needs attention: no 9th attempt', () => {
    let current = item();
    let now = 0;
    for (let n = 1; n < MAX_ATTEMPTS; n += 1) {
      current = afterFailure(current, { kind: 'transient' }, now);
      expect(current).toMatchObject({ state: 'pending', attempts: n });
      expect(current.next_attempt_at).toBe(now + backoffMs(n));
      expect(isDue(current, now)).toBe(false);
      now = current.next_attempt_at ?? now;
      expect(isDue(current, now)).toBe(true);
    }
    current = afterFailure(current, { kind: 'transient' }, now);
    expect(current).toMatchObject({ state: 'exhausted', attempts: 8, reason: EXHAUSTED_REASON });
    expect(isDue(current, Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(needsAttention(current)).toBe(true);
  });

  it('a refusal goes straight to Needs attention, never dropped', () => {
    const refused = afterFailure(item(), { kind: 'permanent', reason: 'No.' }, 0);
    expect(refused).toMatchObject({ state: 'refused', reason: 'No.', attempts: 1 });
    expect(needsAttention(refused)).toBe(true);
  });
});

describe('order and wake-up', () => {
  it('is FIFO by creation time, with the id as tie-break', () => {
    const queue = fifo([
      item({ id: 'c', created_at: '2026-09-17T12:00:02.000Z' }),
      item({ id: 'b', created_at: '2026-09-17T12:00:01.000Z' }),
      item({ id: 'a', created_at: '2026-09-17T12:00:01.000Z' }),
    ]);
    expect(queue.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
  it('back online makes backing-off entries due, attempts kept; attention untouched', () => {
    const woke = wakeAll([
      item({ attempts: 3, next_attempt_at: 99_999 }),
      item({ id: 'b', state: 'refused', reason: 'No.' }),
    ]);
    expect(woke[0]).toMatchObject({ attempts: 3, next_attempt_at: null });
    expect(woke[1]).toMatchObject({ state: 'refused' });
  });
});

describe('editing a queued entry (§19.3 point 3)', () => {
  it('a never-sent entry keeps its id and key: still one record', () => {
    const before = item();
    expect(canEdit(before)).toBe(true);
    const after = edited(before, { amount_minor: 1500 }, before.display, 'fresh');
    expect(after).toMatchObject({ id: 'a', idempotency_key: 'a', body: { amount_minor: 1500 } });
  });
  it('a refused entry gets a fresh key, so a remembered refusal isn’t replayed', () => {
    const refused = item({ state: 'refused', attempts: 1, reason: 'No.' });
    expect(canEdit(refused)).toBe(true);
    const after = edited(refused, { amount_minor: 1500 }, refused.display, 'fresh');
    expect(after).toMatchObject({
      id: 'a',
      idempotency_key: 'fresh',
      state: 'pending',
      attempts: 0,
    });
    expect(after.reason).toBeUndefined();
  });
  it('a sent, unanswered entry can’t be edited (it may be stored); it can be tried again', () => {
    expect(canEdit(item({ attempts: 2, next_attempt_at: 5 }))).toBe(false);
    const exhausted = item({ state: 'exhausted', attempts: 8, reason: EXHAUSTED_REASON });
    expect(canEdit(exhausted)).toBe(false);
    expect(retried(exhausted)).toMatchObject({
      state: 'pending',
      attempts: 0,
      idempotency_key: 'a',
      next_attempt_at: null,
    });
  });
});
