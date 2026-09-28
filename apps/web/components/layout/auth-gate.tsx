'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SessionGate } from './session-gate';

// Register, Log in and Forgot password are guest-only. Verify and Reset password open
// from a link or right after registering, when a session may already exist, so they
// never redirect (D-54).
const OPEN_TO_ALL = new Set(['/verify', '/reset-password']);

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <SessionGate mode={OPEN_TO_ALL.has(pathname) ? 'any' : 'guest'}>{children}</SessionGate>;
}
