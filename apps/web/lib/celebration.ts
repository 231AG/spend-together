// FR-17 / F9-11: which goal has just been completed. Set only on the *transition* into
// completion (a save that took the goal from active to completed), keyed by the
// contribution that did it. The goal screens open at that moment own it; if none is open
// (the full-page contribute route), the next goal screen to open for that goal claims it.
// Either way it is shown once: a revisit never celebrates again.

type Pending = { goalId: string; contributionId: string };

let pending: Pending | null = null;
let owners = new Set<object>();
let claimable = false;
const listeners = new Map<object, { goalId: string; notify: () => void }>();

function notifyAll() {
  for (const l of listeners.values()) l.notify();
}

export function celebrate(goalId: string, contributionId: string): void {
  pending = { goalId, contributionId };
  owners = new Set([...listeners].filter(([, l]) => l.goalId === goalId).map(([o]) => o));
  claimable = owners.size === 0;
  notifyAll();
}

export function clearCelebration(): void {
  pending = null;
  owners = new Set();
  claimable = false;
  notifyAll();
}

/** The pending celebration as seen by one screen (`owner`), or null if it isn't theirs. */
export function celebrationFor(owner: object): Pending | null {
  return pending && owners.has(owner) ? pending : null;
}

/** Subscribe a goal screen; the first one to open after an unowned completion claims it. */
export function subscribeCelebration(
  owner: object,
  goalId: string,
  notify: () => void,
): () => void {
  listeners.set(owner, { goalId, notify });
  if (pending && claimable && pending.goalId === goalId) {
    owners.add(owner);
    claimable = false;
    notify();
  }
  return () => {
    listeners.delete(owner);
  };
}
