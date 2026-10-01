// Product analytics (§16.4, F8-13). Events never carry amounts, notes, category names or
// partner identity: each event has a fixed list of allowed properties, and anything else
// is dropped before it reaches a sink. No analytics vendor is chosen yet (D-71), so the
// default sink records nothing; a provider is plugged in with `setAnalyticsSink`.

type Allowed = {
  insights_viewed: { period: 'daily' | 'weekly' | 'monthly' };
  session_start: Record<string, never>;
};

export type AnalyticsEvent = {
  [K in keyof Allowed]: { name: K; props: Allowed[K] };
}[keyof Allowed];

const ALLOWED_PROPS: { [K in keyof Allowed]: readonly (keyof Allowed[K])[] } = {
  insights_viewed: ['period'],
  session_start: [],
};

export type AnalyticsSink = (event: { name: string; props: Record<string, string> }) => void;

let sink: AnalyticsSink = () => undefined;

export function setAnalyticsSink(next: AnalyticsSink): void {
  sink = next;
}

/** Send an event with only its allowed properties (a guard against later mistakes). */
export function track(event: AnalyticsEvent): void {
  const allowed = ALLOWED_PROPS[event.name] as readonly string[];
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.props as Record<string, unknown>)) {
    if (allowed.includes(key) && typeof value === 'string') props[key] = value;
  }
  sink({ name: event.name, props });
}

const SESSION_KEY = 'spendtogether.session-day';

/**
 * `session_start` at most once per local day per account (§16.4 "daily"), so two people
 * sharing a browser are each counted. `today` is YYYY-MM-DD. The key holds the account
 * id, which is not an event property and never leaves the device.
 */
export function trackDailySession(
  today: string,
  userId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
): void {
  const key = `${SESSION_KEY}:${userId}`;
  try {
    if (storage?.getItem(key) === today) return;
    storage?.setItem(key, today);
  } catch {
    // Storage blocked: count the session anyway; at worst it is counted twice.
  }
  track({ name: 'session_start', props: {} });
}
