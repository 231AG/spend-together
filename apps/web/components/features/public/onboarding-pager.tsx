'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { markOnboardingSeen } from '@/lib/auth-copy';
import { cn } from '@/lib/cn';
import { PatternsIllustration, TogetherIllustration, TrackIllustration } from './illustrations';

// SCR-03 Onboarding: three pages, each an illustration, a headline and one sentence; dots,
// Skip, Next / Get started. Left and right arrow keys or a horizontal swipe move between
// pages. Finishing or skipping sets the seen-once flag (§12.1, not security state).

const PAGES = [
  {
    title: 'Track income and expenses',
    body: 'Record money in and money out in seconds, in any currency. Your totals stay in the one you choose.',
    Art: TrackIllustration,
  },
  {
    title: 'Understand your patterns',
    body: 'See where your money goes each day, week and month, and how it compares with before.',
    Art: PatternsIllustration,
  },
  {
    title: 'Save alone or together',
    body: 'Set goals and see the pace you need. Save with your partner without sharing the rest of your finances.',
    Art: TogetherIllustration,
  },
] as const;

const SWIPE_PX = 60;

export function OnboardingPager() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const page = PAGES[index] ?? PAGES[0];
  const last = index === PAGES.length - 1;

  function go(next: number) {
    setIndex(Math.min(Math.max(next, 0), PAGES.length - 1));
  }
  function finish() {
    markOnboardingSeen();
    router.push('/register');
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
  }
  function onPointerUp(event: PointerEvent) {
    const s = start.current;
    start.current = null;
    if (s === null) return;
    const dx = event.clientX - s;
    if (dx < -SWIPE_PX) go(index + 1);
    else if (dx > SWIPE_PX) go(index - 1);
  }

  const Art = page.Art;
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Introduction"
      className="mx-auto flex w-full max-w-(--dialog-max) flex-1 flex-col gap-6"
    >
      <div className="flex justify-end">
        <Link
          href="/register"
          onClick={markOnboardingSeen}
          className="inline-flex min-h-(--touch-min) items-center px-2 type-label text-fg-link"
        >
          Skip
        </Link>
      </div>
      <div
        // Focusable so arrow keys work without first tabbing to a dot.
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          start.current = e.clientX;
        }}
        onPointerUp={onPointerUp}
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${PAGES.length}`}
        className="flex flex-col items-center gap-4 rounded-lg text-center touch-pan-y"
      >
        <Art className="w-full max-w-(--dialog-max) max-xs:hidden" />
        <h1 className="type-h1" aria-live="polite">
          {page.title}
        </h1>
        <p className="max-w-(--measure-prose) type-body-lg text-fg-body">{page.body}</p>
      </div>
      <div className="flex justify-center gap-1" role="group" aria-label="Pages">
        {PAGES.map((p, i) => (
          <button
            key={p.title}
            type="button"
            aria-label={`Page ${i + 1} of ${PAGES.length}: ${p.title}`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => {
              go(i);
            }}
            className="inline-grid size-(--touch-min) place-items-center"
          >
            <span
              aria-hidden
              className={cn(
                'block h-2 rounded-full transition-[width] duration-(--dur-base) ease-standard',
                i === index ? 'w-6 bg-action-primary-bg' : 'w-2 bg-border-strong',
              )}
            />
          </button>
        ))}
      </div>
      <div className="mt-auto flex gap-3">
        {index > 0 && (
          <Button
            variant="tertiary"
            size="lg"
            onClick={() => {
              go(index - 1);
            }}
          >
            Back
          </Button>
        )}
        <Button
          size="lg"
          block
          onClick={() => {
            if (last) finish();
            else go(index + 1);
          }}
        >
          {last ? 'Get started' : 'Next'}
        </Button>
      </div>
    </section>
  );
}
