import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// F2 exit criteria 6 and 7: decimal.js is the only runtime dependency (a second needs an
// ADR), and no source file reads the ambient clock.

const root = path.resolve(import.meta.dirname, '..');

describe('package purity', () => {
  it('depends on decimal.js only', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['decimal.js']);
  });

  it('imports nothing else and never reads the clock', () => {
    const src = path.join(root, 'src');
    for (const file of readdirSync(src)) {
      const text = readFileSync(path.join(src, file), 'utf8');
      const imports = [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
      for (const spec of imports)
        expect(spec === 'decimal.js' || spec?.startsWith('./')).toBe(true);
      expect(text).not.toMatch(/Date\.now\(|new Date\(\)|Math\.random\(/);
    }
  });
});
