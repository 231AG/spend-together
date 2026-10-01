import { afterEach, describe, expect, it } from 'vitest';
import { setAnalyticsSink, track, trackDailySession, type AnalyticsEvent } from './analytics';

// §16.4: no amounts, notes, category names or partner identity in any payload.

const FORBIDDEN = /amount|minor|note|category|partner|name|email|phone|currency/i;

function capture() {
  const sent: { name: string; props: Record<string, string> }[] = [];
  setAnalyticsSink((e) => sent.push(e));
  return sent;
}

afterEach(() => {
  setAnalyticsSink(() => undefined);
});

describe('analytics (F8-13)', () => {
  it('sends insights_viewed with the period only', () => {
    const sent = capture();
    track({ name: 'insights_viewed', props: { period: 'monthly' } });
    expect(sent).toEqual([{ name: 'insights_viewed', props: { period: 'monthly' } }]);
  });

  it('drops any property that is not allowed, even if a caller sneaks one in', () => {
    const sent = capture();
    const sneaky = {
      name: 'insights_viewed',
      props: { period: 'weekly', amount_minor: 57000, category: 'Food', note: 'x', partner: 'Sam' },
    } as unknown as AnalyticsEvent;
    track(sneaky);
    expect(sent[0]?.props).toEqual({ period: 'weekly' });
    for (const e of sent)
      for (const key of Object.keys(e.props)) expect(key).not.toMatch(FORBIDDEN);
  });

  it('session_start fires once per day', () => {
    const sent = capture();
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    trackDailySession('2026-09-17', 'alex', storage);
    trackDailySession('2026-09-17', 'alex', storage);
    trackDailySession('2026-09-18', 'alex', storage);
    // Another account on the same browser, same day, is its own session.
    trackDailySession('2026-09-18', 'sam', storage);
    expect(sent).toHaveLength(3);
    for (const e of sent) expect(e).toEqual({ name: 'session_start', props: {} });
  });

  it('still counts a session when storage throws', () => {
    const sent = capture();
    trackDailySession('2026-09-17', 'alex', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    });
    trackDailySession('2026-09-17', 'alex', null);
    expect(sent).toHaveLength(2);
  });
});
