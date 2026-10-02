import { Suspense } from 'react';
import { EditGoal } from '@/components/features/goals/edit-goal';
import { PageHeader } from '@/components/layout/page-header';

// Edit goal `/goals/[id]/edit` (name, target, date, icon; currency is fixed, BR-15).
export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Edit goal" back={{ href: `/goals/${id}`, label: 'Goal' }} />
      <div className="max-w-(--dialog-max)">
        <Suspense>
          <EditGoal id={id} />
        </Suspense>
      </div>
    </>
  );
}
