'use client';

import { useRouter } from 'next/navigation';
import { useCloseRouteDialog } from '@/components/layout/route-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { useGoal } from '@/lib/queries';
import { ContributionForm } from './contribution-form';

// SCR-18 in either presentation: inside the intercepted dialog it closes like Esc (back to
// the goal, where any celebration plays); as a full page it goes to the goal. An archived
// goal can't take contributions (BR-18), so the form isn't offered.

export function AddContribution({ goalId }: { goalId: string }) {
  const router = useRouter();
  const toast = useToast();
  const closeDialog = useCloseRouteDialog();
  const goal = useGoal(goalId);
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
  return (
    <ContributionForm
      goal={goal.data}
      onSaved={({ completedNow }) => {
        if (!completedNow) toast({ message: 'Contribution added' });
        if (closeDialog) closeDialog();
        else router.replace(`/goals/${goalId}`);
      }}
    />
  );
}
