import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Spec 23: 100% line AND branch coverage for packages/domain blocks merge.
      // Enforced from F2, when the first formulas land. Declared here so the gate
      // exists before the code it guards.
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
