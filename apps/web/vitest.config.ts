import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['{app,components,lib,src}/**/*.test.{ts,tsx}'] },
});
