import { Suspense } from 'react';
import { WelcomeActions } from '@/components/features/public/welcome-actions';
import { SessionGate, Splash } from '@/components/layout/session-gate';

// SCR-02 Welcome `/`: redirects to /home when a session exists (§12.1). F6 adds the
// illustration and the split desktop layout.

export default function WelcomePage() {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate mode="guest">
        <main
          id="content"
          className="mx-auto flex min-h-dvh max-w-(--content-max) flex-col justify-center gap-6 p-6"
        >
          <p className="type-overline text-fg-muted">SpendTogether</p>
          <h1 className="type-display max-w-(--measure-prose)">
            Know where your money goes, and save for what matters, together.
          </h1>
          <ul className="flex max-w-(--measure-prose) list-disc flex-col gap-1 pl-5 type-body-lg text-fg-body">
            <li>Track income and expenses in any currency.</li>
            <li>See your daily, weekly and monthly patterns.</li>
            <li>Save alone, or with your partner, without sharing everything else.</li>
          </ul>
          <WelcomeActions />
        </main>
      </SessionGate>
    </Suspense>
  );
}
