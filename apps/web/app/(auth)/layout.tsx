import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { SessionGate, Splash } from '@/components/layout/session-gate';

// §14.1 AuthLayout: a centred card with a back link. Guests only: with a session these
// pages redirect to ?next= (same-origin) or /home (F5-02).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate mode="guest">
        <main id="content" className="grid min-h-dvh place-items-center bg-bg-app p-4">
          <div className="flex w-full max-w-(--dialog-max) flex-col gap-4 rounded-xl border border-border-default bg-bg-card p-6 shadow-elev-1">
            <Link
              href="/"
              className="inline-flex min-h-(--touch-min) items-center gap-1 self-start type-label text-fg-link"
            >
              <ArrowLeft aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
              Back
            </Link>
            {children}
          </div>
        </main>
      </SessionGate>
    </Suspense>
  );
}
