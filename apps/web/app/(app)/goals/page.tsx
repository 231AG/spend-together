import { Suspense } from 'react';
import { GoalsView } from '@/components/features/goals/goals-view';
import { PageHeader } from '@/components/layout/page-header';

// SCR-15 Goals `/goals?tab=mine|ours`.
export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Goals" />
      <Suspense>
        <GoalsView />
      </Suspense>
    </>
  );
}
