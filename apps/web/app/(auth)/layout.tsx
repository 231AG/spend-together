import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { AuthGate } from '@/components/layout/auth-gate';
import { Splash } from '@/components/layout/session-gate';

// §14.1 AuthLayout: a centred card with a back link. Register, Log in and Forgot are
// guest-only (a session redirects to ?next= or /home, F5-02); Verify and Reset are open.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <AuthGate>
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
      </AuthGate>
    </Suspense>
  );
}
