import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PWA_COLORS } from './pwa-colors.generated';

// The manifest's colours are generated from the tokens; this fails if a token changes and
// scripts/generate-pwa-assets.mjs wasn't run again.

const css = readFileSync(
  path.join(import.meta.dirname, '..', '..', '..', 'packages', 'config', 'tailwind', 'tokens.css'),
  'utf8',
);
const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const tokens = new Map(
  [...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
);
function token(name: string): string {
  const value = tokens.get(name) ?? '';
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  return alias?.[1] ? token(alias[1]) : value;
}

describe('PWA colours (F12-02)', () => {
  it('match the design tokens', () => {
    expect(PWA_COLORS).toEqual({
      theme: token('action-primary-bg'),
      background: token('bg-app'),
      mark: token('action-primary-fg'),
    });
  });
});
