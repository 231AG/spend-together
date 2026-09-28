import { Suspense } from 'react';
import { ActivityFilters } from '@/components/features/route-views';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-12 Activity `/activity?type=&category=&from=&to=&q=` — filters live in the URL.
export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Activity" />
      <div className="flex flex-col gap-6">
        <Suspense>
          <ActivityFilters />
        </Suspense>
        <ComingInPhase
          phase="F7"
          what="Your income, expenses and contributions grouped by date, with details alongside on desktop."
        />
      </div>
    </>
  );
}
