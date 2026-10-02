'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGoal } from '@/lib/queries';
import { GoalForm } from './goal-form';

// F9-04 (FR-18): name, target, date and icon; never currency (BR-15). An archived goal
// is read-only (BR-18).
export function EditGoal({ id }: { id: string }) {
  const goal = useGoal(id);
  if (goal.isPending) return <LoadingSkeleton shape="row" count={4} label="Loading goal" />;
  if (goal.isError) {
    return <ErrorState message="We couldn't load this goal." onRetry={() => void goal.refetch()} />;
  }
  if (goal.data.archived_at !== null) {
    return (
      <EmptyState
        title="This goal is read-only"
        body="This goal is read-only since you ended the connection."
      />
    );
  }
  return <GoalForm initial={goal.data} />;
}
