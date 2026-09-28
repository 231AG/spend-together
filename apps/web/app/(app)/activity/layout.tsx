'use client';

import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { ActivityView } from '@/components/features/activity/activity-view';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

// SCR-12/13 split view (§21, F7-07): from 1024 px a record's details open beside the list;
// below that they are a pushed page and the list is hidden. The list keeps its place in
// the tree across both routes, so its scroll, filters and loaded pages survive.

export default function ActivityLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const selectedId = /^\/activity\/([^/]+)/.exec(pathname)?.[1];
  const detail = selectedId !== undefined;
  return (
    <div className={cn(detail && 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-8')}>
      <div className={cn(detail && 'hidden lg:block')}>
        {detail ? (
          <h2 className="mb-4 type-h3 text-fg-default">Activity</h2>
        ) : (
          <PageHeader title="Activity" />
        )}
        <Suspense>
          <ActivityView {...(selectedId ? { selectedId } : {})} />
        </Suspense>
      </div>
      {detail && <div className="min-w-0">{children}</div>}
    </div>
  );
}
