import { Suspense, type ReactNode } from 'react';
import { SessionGate, Splash } from '@/components/layout/session-gate';

// First-run setup (§7.1): signed in but not yet onboarded. Onboarded users go to /home.
export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate mode="setup">
        <main
          id="content"
          className="mx-auto flex min-h-dvh w-full max-w-(--dialog-max) flex-col justify-center gap-6 p-6"
        >
          {children}
        </main>
      </SessionGate>
    </Suspense>
  );
}
