import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Node.js runtime, per spec 8.1 — financial queries stay on the server.
  reactStrictMode: true,
};

export default nextConfig;
