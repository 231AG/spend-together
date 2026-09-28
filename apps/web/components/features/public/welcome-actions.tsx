'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { onboardingSeen } from '@/lib/auth-copy';
import { safeNext } from '@/lib/safe-next';

// Create account (primary) and Log in (secondary), carrying a same-origin ?next= through
// (§12.1). First-time visitors see onboarding before registering (§7.1); the seen-once
// flag skips it on return.

const primary =
  'inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary-bg px-6 type-label text-action-primary-fg hover:bg-action-primary-bg-hover';
const secondary =
  'inline-flex min-h-12 items-center justify-center rounded-md border border-border-input bg-bg-card px-6 type-label text-fg-default hover:bg-bg-subtle';

export function WelcomeActions() {
  const params = useSearchParams();
  const raw = params.get('next');
  const next = raw ? safeNext(raw, '') : '';
  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
  // Read on the client; the server renders as if seen (the link target is all that differs).
  const seen = useSyncExternalStore(
    () => () => undefined,
    onboardingSeen,
    () => true,
  );
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href={seen || next ? `/register${suffix}` : '/onboarding'} className={primary}>
        Create account
      </Link>
      <Link href={`/login${suffix}`} className={secondary}>
        Log in
      </Link>
    </div>
  );
}
