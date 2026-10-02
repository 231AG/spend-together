'use client';

import { GoalForm } from './goal-form';
import { GoalGate } from './goal-gate';

// F9-04 (FR-18): name, target, date and icon; never currency (BR-15). An archived goal
// is read-only (BR-18).
export function EditGoal({ id }: { id: string }) {
  return (
    <GoalGate id={id} writable>
      {(goal) => <GoalForm initial={goal} />}
    </GoalGate>
  );
}
