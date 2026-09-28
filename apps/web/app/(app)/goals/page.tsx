import { Suspense } from 'react';
import { GoalsTabs } from '@/components/features/route-views';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-15 Goals `/goals?tab=mine|ours`.
export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Goals" />
      <div className="flex flex-col gap-6">
        <Suspense>
          <GoalsTabs />
        </Suspense>
        <ComingInPhase
          phase="F9"
          what="Your goals and your shared goals, with progress and status."
        />
      </div>
    </>
  );
}
