// FR-17 / F9-11: which goal has just been completed. Set only on the *transition* into
// completion (a save that took the goal from active to completed), keyed by the
// contribution that did it. Only the goal screens open at that moment may show it, so a
// re-render keeps it but a revisit — a new screen — never celebrates again.

type Pending = { goalId: string; contributionId: string };

let pending: Pending | null = null;
let owners = new Set<object>();
const listeners = new Map<object, () => void>();

export function celebrate(goalId: string, contributionId: string): void {
  pending = { goalId, contributionId };
  owners = new Set(listeners.keys());
  for (const l of listeners.values()) l();
}

export function clearCelebration(): void {
  pending = null;
  owners = new Set();
  for (const l of listeners.values()) l();
}

/** The pending celebration as seen by one screen (`owner`), or null if it isn't theirs. */
export function celebrationFor(owner: object): Pending | null {
  return pending && owners.has(owner) ? pending : null;
}

export function subscribeCelebration(owner: object, listener: () => void): () => void {
  listeners.set(owner, listener);
  return () => {
    listeners.delete(owner);
  };
}
