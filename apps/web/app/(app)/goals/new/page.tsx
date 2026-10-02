import { Suspense } from 'react';
import { GoalForm } from '@/components/features/goals/goal-form';
import { PageHeader } from '@/components/layout/page-header';

// SCR-16 Create goal `/goals/new?type=individual|couple`.
export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { type } = await searchParams;
  return (
    <>
      <PageHeader title="Create goal" back={{ href: '/goals', label: 'Goals' }} />
      <div className="max-w-(--dialog-max)">
        <Suspense>
          <GoalForm preferCouple={type === 'couple'} />
        </Suspense>
      </div>
    </>
  );
}
