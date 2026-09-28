import { Suspense, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SessionGate, Splash } from '@/components/layout/session-gate';

// The authenticated app (§14.1). `modal` is the @modal parallel slot that intercepted
// form routes render into, so Back and Forward open and close them (§12.2, F5-05).

export default function AppLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate mode="app">
        <AppShell modal={modal}>{children}</AppShell>
      </SessionGate>
    </Suspense>
  );
}
