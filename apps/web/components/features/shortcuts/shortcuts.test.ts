// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  SEQUENCE_WINDOW_MS,
  SHORTCUT_HELP,
  createShortcutHandler,
  type KeyLike,
} from './shortcuts';

// F5-07: N, /, G then H/A/G/I/P, ?; never while typing; all off when disabled (§12.2).

function key(
  k: string,
  at: number,
  target: EventTarget | null = document.body,
  mods: Partial<KeyLike> = {},
): KeyLike {
  return {
    key: k,
    timeStamp: at,
    target,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault: vi.fn(),
    ...mods,
  };
}

function setup(enabled = true) {
  const actions = { openAdd: vi.fn(), focusSearch: vi.fn(), go: vi.fn(), showHelp: vi.fn() };
  let on = enabled;
  const handle = createShortcutHandler(actions, () => on);
  return { actions, handle, disable: () => (on = false) };
}

describe('keyboard shortcuts', () => {
  it('N opens Add, / focuses search, ? opens help', () => {
    const { actions, handle } = setup();
    handle(key('n', 1));
    handle(key('/', 2));
    handle(key('?', 3));
    expect(actions.openAdd).toHaveBeenCalledOnce();
    expect(actions.focusSearch).toHaveBeenCalledOnce();
    expect(actions.showHelp).toHaveBeenCalledOnce();
  });

  it.each([
    ['h', '/home'],
    ['a', '/activity'],
    ['g', '/goals'],
    ['i', '/insights'],
    ['p', '/profile'],
  ])('G then %s goes to %s', (second, path) => {
    const { actions, handle } = setup();
    handle(key('g', 100));
    handle(key(second, 100 + SEQUENCE_WINDOW_MS - 1));
    expect(actions.go).toHaveBeenCalledWith(path);
  });

  it('the G sequence expires, and an unknown second key cancels it', () => {
    const { actions, handle } = setup();
    handle(key('g', 0));
    handle(key('h', SEQUENCE_WINDOW_MS + 1));
    handle(key('g', 5000));
    handle(key('x', 5001));
    handle(key('h', 5002));
    expect(actions.go).not.toHaveBeenCalled();
  });

  it('never fires while typing in a field', () => {
    const { actions, handle } = setup();
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    for (const target of [input, textarea, editable]) {
      handle(key('n', 1, target));
      handle(key('/', 2, target));
    }
    expect(actions.openAdd).not.toHaveBeenCalled();
    expect(actions.focusSearch).not.toHaveBeenCalled();
  });

  it('a checkbox is not a text field', () => {
    const { actions, handle } = setup();
    const box = document.createElement('input');
    box.type = 'checkbox';
    handle(key('n', 1, box));
    expect(actions.openAdd).toHaveBeenCalledOnce();
  });

  it('ignores modified keys and already-handled events', () => {
    const { actions, handle } = setup();
    handle(key('n', 1, document.body, { ctrlKey: true }));
    handle(key('n', 2, document.body, { metaKey: true }));
    handle(key('n', 3, document.body, { defaultPrevented: true }));
    expect(actions.openAdd).not.toHaveBeenCalled();
  });

  it('turning shortcuts off in Profile stops all of them', () => {
    const { actions, handle, disable } = setup();
    disable();
    for (const k of ['n', '/', '?', 'g', 'h']) handle(key(k, 1));
    expect(Object.values(actions).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it('the help lists every shortcut', () => {
    expect(SHORTCUT_HELP.map((r) => r.keys.join(' '))).toEqual([
      'N',
      '/',
      'G H',
      'G A',
      'G G',
      'G I',
      'G P',
      '?',
    ]);
  });
});
