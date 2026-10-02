'use client';

import { Star, X } from 'lucide-react';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { celebrationFor, clearCelebration, subscribeCelebration } from '@/lib/celebration';
import { readToken } from '@/components/features/charts/chart-kit';
import { useMediaQuery } from '@/lib/use-media-query';

// F9-11 (FR-17, WAC-11): a restrained celebration when a save completes the goal —
// a few confetti pieces for dur-celebrate (≤ 1.2 s), a short haptic where supported, and
// an announced message. Never under reduced motion (the message alone remains), never
// blocking (pointer-events: none on the pieces), and skippable.

const PIECES = [
  'chart-income',
  'chart-saving',
  'cat-food',
  'cat-bills',
  'cat-health',
  'cat-family',
];

export function CompletionCelebration({ goalId, goalName }: { goalId: string; goalName: string }) {
  // A stable identity for this screen: only screens open when the goal completed qualify.
  const [owner] = useState(() => ({}));
  const subscribe = useCallback(
    (listener: () => void) => subscribeCelebration(owner, listener),
    [owner],
  );
  const pending = useSyncExternalStore(
    subscribe,
    () => celebrationFor(owner),
    () => null,
  );
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const active = pending?.goalId === goalId;

  useEffect(() => {
    if (!active) return;
    if (!reduced && typeof navigator.vibrate === 'function') navigator.vibrate(40);
    // The message stays for the toast's reading time; the motion ends at dur-celebrate.
    const ms = Math.max(readToken('dur-celebrate'), readToken('dur-toast'));
    const timer = setTimeout(clearCelebration, ms || 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [active, reduced]);

  if (!active) return null;
  return (
    <>
      {!reduced && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-(--z-toast) flex justify-center overflow-visible"
        >
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className="confetti absolute top-0 block size-2 rounded-sm"
              style={
                {
                  left: `${String(10 + ((i * 47) % 80))}%`,
                  background: `var(--${PIECES[i % PIECES.length] ?? 'chart-saving'})`,
                  '--confetti-x': `${String(((i % 5) - 2) * 4)}vw`,
                  '--confetti-delay': `${String((i % 6) * 40)}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl bg-status-ontrack-bg p-4 text-status-ontrack-fg"
      >
        <Star aria-hidden className="size-(--icon-md) shrink-0" strokeWidth={2} />
        <p className="flex-1 type-label">Goal reached! {goalName} is complete.</p>
        <button
          type="button"
          onClick={clearCelebration}
          aria-label="Dismiss celebration"
          className="inline-grid size-(--touch-min) place-items-center rounded-full hover:bg-bg-card"
        >
          <X aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
        </button>
      </div>
    </>
  );
}
