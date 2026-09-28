import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// F3-03: prove the palette's contrast (spec §17.1, WCAG 2.2 AA) from the token file itself,
// so a changed hex value fails here rather than in an audit.

const css = readFileSync(path.join(import.meta.dirname, 'tokens.css'), 'utf8');
const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const tokens = new Map(
  [...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
);

/** Resolve a token through `var()` aliases to a hex colour. */
function hex(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`No token --${name}`);
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  if (alias?.[1]) return hex(alias[1]);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`--${name} is not a colour: ${value}`);
  return value;
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(hex(fg)), luminance(hex(bg))].sort((a, b) => b - a);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

describe('§17.1 published ratios on white', () => {
  it.each([
    ['color-primary-500', 2.54],
    ['color-primary-600', 3.77],
    ['color-primary-700', 5.48],
    ['color-primary-800', 7.68],
    ['color-secondary-500', 4.47],
    ['color-secondary-600', 6.29],
    ['color-accent-500', 2.15],
    ['color-accent-700', 5.02],
    ['color-success-500', 2.28],
    ['color-error-500', 3.76],
    ['color-error-600', 4.83],
    ['color-error-700', 6.47],
    ['color-neutral-900', 17.74],
    ['color-neutral-700', 10.31],
    ['color-neutral-600', 4.83],
    ['color-neutral-400', 2.54],
  ] as const)('%s measures %s:1', (token, published) => {
    expect(round2(ratio(token, 'color-white'))).toBeCloseTo(published, 1);
  });

  it('accent-500 fill takes dark text at 8.26:1', () => {
    expect(round2(ratio('color-neutral-900', 'color-accent-500'))).toBeCloseTo(8.26, 1);
  });
});

// Every foreground/background pair components are allowed to use for text: ≥ 4.5:1.
const TEXT_PAIRS: [fg: string, bg: string][] = [
  ...['fg-default', 'fg-body', 'fg-muted', 'fg-link', 'fg-error', 'fg-warning'].flatMap((fg) =>
    ['bg-card', 'bg-app'].map((bg): [string, string] => [fg, bg]),
  ),
  ...['fg-default', 'fg-body', 'fg-link', 'fg-error', 'fg-warning'].map((fg): [string, string] => [
    fg,
    'bg-subtle',
  ]),
  ...['money-income', 'money-expense', 'money-saving'].flatMap((fg) =>
    ['bg-card', 'bg-app'].map((bg): [string, string] => [fg, bg]),
  ),
  ['action-primary-fg', 'action-primary-bg'],
  ['action-primary-fg', 'action-primary-bg-hover'],
  ['action-secondary-fg', 'action-secondary-bg'],
  ['action-danger-fg', 'action-danger-bg'],
  ['action-danger-fg', 'action-danger-bg-hover'],
  ['status-ontrack-fg', 'status-ontrack-bg'],
  ['status-atrisk-fg', 'status-atrisk-bg'],
  ['status-behind-fg', 'status-behind-bg'],
  ['fg-default', 'bg-selected'],
  ['fg-on-action', 'hero-from'],
  ['fg-on-hero-muted', 'hero-from'],
  ['chart-axis', 'bg-card'],
];

describe('text pairs meet WCAG AA (4.5:1)', () => {
  it.each(TEXT_PAIRS)('%s on %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

// Known-bad pair, kept as a test so nobody reintroduces it: muted text on the subtle grey
// (segmented-control track, skeleton areas) is 4.39:1. Use fg-body there (decision D-16).
it('fg-muted is forbidden on bg-subtle', () => {
  expect(ratio('fg-muted', 'bg-subtle')).toBeLessThan(4.5);
});

// Non-text UI (focus ring, input borders that identify a control, chart series): ≥ 3:1.
describe('non-text UI meets 3:1 (WCAG 1.4.11)', () => {
  it.each([
    ['focus-ring-color', 'bg-card'],
    ['focus-ring-color', 'bg-app'],
    ['progress-fill', 'bg-card'],
    ['chart-income', 'bg-card'],
    ['chart-expense', 'bg-card'],
    ['chart-saving', 'bg-card'],
    ['border-strong', 'bg-card'],
  ])('%s on %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('token file', () => {
  it('declares every §17.3 category colour', () => {
    for (const cat of [
      'food',
      'bills',
      'transport',
      'shopping',
      'health',
      'education',
      'entertainment',
      'family',
      'other',
    ]) {
      expect(() => hex(`cat-${cat}`)).not.toThrow();
    }
  });

  it('collapses every duration but the fade under reduced motion', () => {
    const reduced = /prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const durations = [...tokens.keys()].filter(
      (k) => k.startsWith('dur-') && k !== 'dur-fade' && k !== 'dur-toast',
    );
    for (const d of durations) expect(reduced).toContain(`--${d}: 0ms`);
  });
});
