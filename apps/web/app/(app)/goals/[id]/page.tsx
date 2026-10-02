import { Suspense } from 'react';
import { GoalDetails } from '@/components/features/goals/goal-details';
import { PageHeader } from '@/components/layout/page-header';

// SCR-17 Goal details `/goals/[id]`.
export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Goal" back={{ href: '/goals', label: 'Goals' }} />
      <Suspense>
        <GoalDetails id={id} />
      </Suspense>
    </>
  );
}
