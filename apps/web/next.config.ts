import type { NextConfig } from 'next';
// Importing the env module validates every required variable at dev and build time, so a
// missing one fails loudly with its name instead of surfacing later as `undefined`.
import './lib/env';

const nextConfig: NextConfig = {
  // The repo's own CLAUDE.md is the one source of agent rules; don't generate others.
  agentRules: false,
  transpilePackages: ['@spendtogether/domain', '@spendtogether/schemas'],
};

export default nextConfig;
