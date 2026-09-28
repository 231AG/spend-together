// Keyboard shortcuts (spec §12.2): N new transaction, / focus Activity search,
// G then H/A/G/I/P go to a section, ? help. A pure handler so it can be tested without a
// browser; ShortcutLayer wires it to `keydown`.

export interface ShortcutActions {
  openAdd: () => void;
  focusSearch: () => void;
  go: (path: string) => void;
  showHelp: () => void;
}

export const GO_TARGETS: Record<string, { path: string; label: string }> = {
  h: { path: '/home', label: 'Home' },
  a: { path: '/activity', label: 'Activity' },
  g: { path: '/goals', label: 'Goals' },
  i: { path: '/insights', label: 'Insights' },
  p: { path: '/profile', label: 'Profile' },
};

/** The rows of the "?" help dialog. */
export const SHORTCUT_HELP: { keys: string[]; action: string }[] = [
  { keys: ['N'], action: 'New transaction' },
  { keys: ['/'], action: 'Search activity' },
  ...Object.entries(GO_TARGETS).map(([key, t]) => ({
    keys: ['G', key.toUpperCase()],
    action: `Go to ${t.label}`,
  })),
  { keys: ['?'], action: 'Show keyboard shortcuts' },
];

/** How long after G the second key still counts (ms of event time, not wall clock). */
export const SEQUENCE_WINDOW_MS = 1000;

export interface KeyLike {
  key: string;
  timeStamp: number;
  target: EventTarget | null;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

/** Typing into a field must never trigger a shortcut (plan F5-07, risk "search"). */
export function isEditable(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (target as HTMLInputElement).type;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
    type,
  );
}

export function createShortcutHandler(actions: ShortcutActions, isEnabled: () => boolean) {
  let pendingGoUntil = -1;

  return (event: KeyLike): void => {
    if (!isEnabled() || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditable(event.target)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (pendingGoUntil >= event.timeStamp) {
      pendingGoUntil = -1;
      const target = GO_TARGETS[key];
      if (target) {
        event.preventDefault();
        actions.go(target.path);
        return;
      }
    }
    pendingGoUntil = -1;

    if (key === 'g') {
      pendingGoUntil = event.timeStamp + SEQUENCE_WINDOW_MS;
      return;
    }
    if (key === 'n') {
      event.preventDefault();
      actions.openAdd();
    } else if (key === '/') {
      event.preventDefault();
      actions.focusSearch();
    } else if (key === '?') {
      event.preventDefault();
      actions.showHelp();
    }
  };
}
