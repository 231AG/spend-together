import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'storybook-static'],
    env: { NEXT_PUBLIC_API_MODE: 'mock' },
    // Component tests opt in with `// @vitest-environment jsdom`; lib tests stay on Node.
    setupFiles: ['./test/setup.ts'],
  },
});
