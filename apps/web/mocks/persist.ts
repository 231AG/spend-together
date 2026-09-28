import { applyScenario, scenario, type ScenarioState } from './scenarios';

// The chosen scenario survives a reload in the browser (a dev convenience only; the
// mock's data itself is in memory and reseeds on reload).

const KEY = 'spendtogether.mock-scenario';

export function restoreScenario(): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) applyScenario(JSON.parse(raw) as Partial<ScenarioState>);
  } catch {
    // Storage unavailable (private mode): start from the default scenario.
  }
}

export function saveScenario(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scenario()));
  } catch {
    // Ignore: the scenario simply won't survive a reload.
  }
}
