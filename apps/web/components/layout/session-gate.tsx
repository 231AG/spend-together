'use client';

import { RotateCw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { isUnauthenticated, useMe } from '@/lib/queries';
import { safeNext, withNext } from '@/lib/safe-next';
import { resetSignedOut, wasSignedOutOnPurpose } from '@/lib/session';

// Session routing (SCR-01, F5-02). In mock mode the session lives in the MSW worker, so
// these gates run on the client; B4 adds the same checks server-side from the cookie.
//   app:   no session → "/" (keeping ?next=); not onboarded → /setup/currency
//   setup: no session → "/"; already onboarded → /home
//   guest: a session → ?next= (same-origin only) or /home
//   any:   no redirect (verify and reset links work signed in or out)

type Mode = 'app' | 'setup' | 'guest' | 'any';

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
  if (mode === 'any') return children;
  return <GatedSession mode={mode}>{children}</GatedSession>;
}

function GatedSession({ mode, children }: { mode: Exclude<Mode, 'any'>; children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const signedOut = isUnauthenticated(me.error);
  const onboarded = me.data ? me.data.onboarded_at !== null : null;

  let redirect: string | null = null;
  // Not onboarded yet: currency setup first, then on to where they were going (e.g. an
  // invitation, SCR-20), so `next` survives every route into setup.
  const nextParam = search.get('next');
  if (mode === 'guest' && me.data) {
    redirect = onboarded
      ? safeNext(nextParam)
      : withNext('/setup/currency', nextParam ? safeNext(nextParam) : '');
  } else if (mode !== 'guest' && signedOut) {
    // After an on-purpose logout the next person starts fresh, not on this path.
    redirect = wasSignedOutOnPurpose() ? '/' : withNext('/', currentPath(pathname, search));
  } else if (mode === 'app' && onboarded === false) {
    redirect = withNext('/setup/currency', currentPath(pathname, search));
  } else if (mode === 'setup' && onboarded === true) {
    redirect = safeNext(search.get('next'));
  }

  const signedIn = me.data !== undefined;
  useEffect(() => {
    if (signedIn) resetSignedOut();
  }, [signedIn]);
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (redirect) return <Splash />;
  if (mode === 'guest') {
    // Guests see the page as soon as we know there is no session (or can't tell). A later
    // refetch (on reconnect) puts a data-less query back to pending; the form must stay
    // mounted then, or what the person typed is lost.
    return me.isPending && me.errorUpdatedAt === 0 ? <Splash /> : children;
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
