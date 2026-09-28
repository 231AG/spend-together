import { Suspense } from 'react';
import { WelcomeIllustration } from '@/components/features/public/illustrations';
import { WelcomeActions } from '@/components/features/public/welcome-actions';
import { SessionGate, Splash } from '@/components/layout/session-gate';

// SCR-02 Welcome `/` (W-08): brand, tagline, illustration, the three-line promise,
// Create account and Log in. Desktop splits text left, illustration right. A session
// redirects to /home (§12.1, SCR-01).

export default function WelcomePage() {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate mode="guest">
        <main
          id="content"
          className="mx-auto grid min-h-dvh w-full max-w-(--content-max) items-center gap-8 p-6 lg:grid-cols-2 lg:gap-12 lg:px-8"
        >
          <div className="flex flex-col gap-6">
            <p className="inline-flex items-center gap-2 type-label text-fg-default">
              <span
                aria-hidden
                className="inline-grid size-(--icon-tile) place-items-center rounded-md bg-action-primary-bg type-label text-action-primary-fg"
              >
                ST
              </span>
              SpendTogether
            </p>
            <h1 className="type-display">
              <span className="block">Know what you earn.</span>
              <span className="block">Know what you spend.</span>
              <span className="block text-fg-link">Know what you can save.</span>
            </h1>
            <p className="max-w-(--measure-prose) type-body-lg text-fg-body">
              Track money in any currency, see your patterns, and reach your goals, alone or with
              your partner, without sharing everything else.
            </p>
            <WelcomeActions />
          </div>
          <WelcomeIllustration className="order-first mx-auto w-full max-w-(--dialog-max) max-xs:hidden lg:order-none" />
        </main>
      </SessionGate>
    </Suspense>
  );
}
