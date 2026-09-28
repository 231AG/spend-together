import type { EndpointName } from '@spendtogether/schemas';
import { mockClock } from './clock';
import { db } from './db';
import { variants, type VariantName } from './fixtures';

// Scenarios (F4-10, spec §19.2): a dataset variant plus network behaviour, so any screen
// can be seen empty, loading, failing, offline, slow, zero-income, in every couple state,
// in a foreign currency, one contribution from completion, or mid-recalculation.

export interface ScenarioState {
  variant: VariantName;
  /** Added to every response: 0 normal, ~1200 slow network, ~4000 to hold loading states. */
  latencyMs: number;
  /** Every request fails as a network error, as when the device is offline. */
  offline: boolean;
  /** Endpoints that answer 500 INTERNAL; 'all' fails everything. */
  failing: 'all' | EndpointName[];
  /** Keep `recalculating: true` on /me (§11.3 banner). */
  recalculating: boolean;
  /** How long a base-currency change reports `recalculating` (ms). */
  recalcMs: number;
}

export const DEFAULT_SCENARIO: ScenarioState = {
  variant: 'reference',
  latencyMs: 0,
  offline: false,
  failing: [],
  recalculating: false,
  recalcMs: 3000,
};

export const PRESETS: Record<string, Partial<ScenarioState>> = {
  Reference: {},
  Empty: { variant: 'empty' },
  Loading: { latencyMs: 4000 },
  'Slow network': { latencyMs: 1200 },
  Error: { failing: 'all' },
  Offline: { offline: true },
  'Zero income': { variant: 'zeroIncome' },
  'No partner': { variant: 'noPartner' },
  'Invitation pending': { variant: 'pendingInvite' },
  'Ex-partner': { variant: 'exPartner' },
  'Foreign currency (Sam, LRD)': { variant: 'foreignCurrency' },
  'Goal about to complete': { variant: 'goalAboutToComplete' },
  Recalculating: { recalculating: true },
  'Signed out': { variant: 'signedOut' },
  'Not onboarded': { variant: 'notOnboarded' },
};

let state: ScenarioState = { ...DEFAULT_SCENARIO };

export function scenario(): ScenarioState {
  return state;
}

/** Apply a scenario. Changing the variant reseeds the store and resets the clock. */
export function applyScenario(next: Partial<ScenarioState>): ScenarioState {
  const merged = { ...state, ...next };
  const reseed = next.variant !== undefined && next.variant !== state.variant;
  state = merged;
  if (reseed) resetData();
  return state;
}

export function resetData(): void {
  mockClock.reset();
  db.load(variants[state.variant]());
}

export function resetScenario(): void {
  state = { ...DEFAULT_SCENARIO };
  resetData();
}

resetData();
