'use client';

import { RotateCw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { isUnauthenticated, useMe } from '@/lib/queries';
import { safeNext, withNext } from '@/lib/safe-next';

// Session routing (SCR-01, F5-02). In mock mode the session lives in the MSW worker, so
// these gates run on the client; B4 adds the same checks server-side from the cookie.
//   app:   no session → "/" (keeping ?next=); not onboarded → /setup/currency
//   setup: no session → "/"; already onboarded → /home
//   guest: a session → ?next= (same-origin only) or /home

type Mode = 'app' | 'setup' | 'guest';

function currentPath(pathname: string, search: URLSearchParams): string {
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** SCR-01: brand mark; a thin progress bar only after 400 ms so fast loads never flash. */
export function Splash() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setSlow(true);
    }, 400);
    return () => {
      clearTimeout(t);
    };
  }, []);
  return (
    <div
      role="status"
      aria-label="Loading SpendTogether"
      className="grid min-h-dvh place-items-center bg-bg-app"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden
          className="inline-grid size-(--avatar-lg) place-items-center rounded-xl bg-action-primary-bg type-h2 text-action-primary-fg"
        >
          ST
        </span>
        <span aria-hidden className="block h-1 w-24 overflow-hidden rounded-full bg-progress-track">
          {slow && <span className="skeleton block h-full w-full rounded-full" />}
        </span>
      </div>
    </div>
  );
}

function Unreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg-app p-6">
      <div
        role="alert"
        className="flex max-w-(--dialog-max) flex-col items-center gap-3 text-center"
      >
        <h1 className="type-h2">Can't reach SpendTogether</h1>
        <p className="type-body-lg text-fg-body">Check your connection and try again.</p>
        <Button
          variant="tertiary"
          onClick={onRetry}
          iconLeft={<RotateCw aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
        >
          Retry
        </Button>
      </div>
    </main>
  );
}

export function SessionGate({ mode, children }: { mode: Mode; children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const signedOut = isUnauthenticated(me.error);
  const onboarded = me.data ? me.data.onboarded_at !== null : null;

  let redirect: string | null = null;
  if (mode === 'guest' && me.data) {
    redirect = onboarded ? safeNext(search.get('next')) : '/setup/currency';
  } else if (mode !== 'guest' && signedOut) {
    redirect = withNext('/', currentPath(pathname, search));
  } else if (mode === 'app' && onboarded === false) {
    redirect = '/setup/currency';
  } else if (mode === 'setup' && onboarded === true) {
    redirect = safeNext(search.get('next'));
  }

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (redirect) return <Splash />;
  if (mode === 'guest') {
    // Guests see the page as soon as we know there is no session (or can't tell).
    return me.isPending ? <Splash /> : children;
  }
  if (me.isPending) return <Splash />;
  if (me.isError) {
    return (
      <Unreachable
        onRetry={() => {
          void me.refetch();
        }}
      />
    );
  }
  return children;
}
