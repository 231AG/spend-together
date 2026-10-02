'use client';

import Link from 'next/link';
import { PeriodSelector, type HomePeriod } from '@/components/ui/segmented-control';
import { useUrlParam } from '@/lib/url-state';

// URL-bound view state for the route map (F5-01): every filter and view switch lives in
// the query string, so it survives reload, Back and sharing. The screens that own these
// controls (F7–F9) reuse the same hooks.

export function HomePeriodControl() {
  const [period, setPeriod] = useUrlParam<HomePeriod>(
    'period',
    ['today', 'week', 'month'],
    'month',
  );
  return <PeriodSelector value={period} onValueChange={setPeriod} />;
}

export function CancelLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-(--touch-min) items-center rounded-md border border-border-input bg-bg-card px-4 type-label text-fg-default hover:bg-bg-subtle"
    >
      Cancel
    </Link>
  );
}
