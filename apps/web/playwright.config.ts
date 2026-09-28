import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Browser tests (F5 smoke now; the full matrix arrives in F13). They run against a
// production build in mock mode: `pnpm build` first, then `pnpm e2e`.

const PORT = 3200;
// Sandboxed environments ship their own Chromium; CI installs Playwright's.
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = process.env['CI']
  ? undefined
  : existsSync(LOCAL_CHROMIUM)
    ? LOCAL_CHROMIUM
    : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // Node directly, not through pnpm: a wrapper leaves next-server orphaned on shutdown.
    command: `node ./node_modules/next/dist/bin/next start -p ${PORT}`,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    url: `http://localhost:${PORT}/offline`,
    // Always a fresh server: a leftover one would serve a stale build.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
