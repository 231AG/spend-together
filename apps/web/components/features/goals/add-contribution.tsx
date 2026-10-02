'use client';

import { useRouter } from 'next/navigation';
import { useCloseRouteDialog } from '@/components/layout/route-dialog';
import { useToast } from '@/components/ui/toast';
import { ContributionForm } from './contribution-form';
import { GoalGate } from './goal-gate';

// SCR-18 in either presentation: inside the intercepted dialog it closes like Esc (back to
// the goal underneath, where any celebration plays); as a full page it goes to the goal,
// which then claims the celebration (lib/celebration). An archived goal can't take
// contributions (BR-18).

export function AddContribution({ goalId }: { goalId: string }) {
  const router = useRouter();
  const toast = useToast();
  const closeDialog = useCloseRouteDialog();
  return (
    <GoalGate id={goalId} writable>
      {(goal) => (
        <ContributionForm
          goal={goal}
          onSaved={({ completedNow }) => {
            if (!completedNow) toast({ message: 'Contribution added' });
            if (closeDialog) closeDialog();
            else router.replace(`/goals/${goalId}`);
          }}
        />
      )}
    </GoalGate>
  );
}
