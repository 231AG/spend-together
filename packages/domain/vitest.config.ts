import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      // 100% line and branch gate (CLAUDE.md). Enforced from F2, when the formulas land.
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
