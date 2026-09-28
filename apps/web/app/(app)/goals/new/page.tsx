import { Suspense } from 'react';
import { GoalTypeControl } from '@/components/features/route-views';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-16 Create goal `/goals/new?type=individual|couple`.
export default function NewGoalPage() {
  return (
    <>
      <PageHeader title="Create goal" back={{ href: '/goals', label: 'Goals' }} />
      <div className="flex flex-col gap-6">
        <Suspense>
          <GoalTypeControl />
        </Suspense>
        <ComingInPhase phase="F9" what="Name, target amount, goal currency and target date." />
      </div>
    </>
  );
}
