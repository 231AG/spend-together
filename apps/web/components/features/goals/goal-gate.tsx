'use client';

import type { GoalDetail } from '@spendtogether/schemas';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ApiError } from '@/lib/api-client';
import { useGoal } from '@/lib/queries';
import { NotSavedOffline, waitingForNetwork } from '@/components/features/offline/offline-states';

// One place for a goal screen's loading, not-found, error and read-only states (F9-12,
// F9-13), shared by goal details, edit goal and add contribution.

export const ARCHIVED_COPY = 'This goal is read-only since you ended the connection.';

export function GoalGate({
  id,
  writable = false,
  children,
}: {
  id: string;
  /** Edit and contribute: an archived goal (BR-18) shows why instead of the form. */
  writable?: boolean;
  children: (goal: GoalDetail) => ReactNode;
}) {
  const goal = useGoal(id);
  if (waitingForNetwork(goal)) return <NotSavedOffline what="This goal" />;
  if (goal.isPending) {
    return writable ? (
      <LoadingSkeleton shape="row" count={4} label="Loading goal" />
    ) : (
      <div className="flex flex-col gap-4">
        <LoadingSkeleton shape="hero" label="Loading goal" />
        <LoadingSkeleton shape="card" count={2} />
      </div>
    );
  }
  if (goal.isError) {
    if (goal.error instanceof ApiError && goal.error.status === 404) {
      return (
        <EmptyState
          title="We couldn't find that"
          body="It may have been deleted."
          action={
            <Link href="/goals" className="type-label text-fg-link underline">
              Back to goals
            </Link>
          }
        />
      );
    }
    return (
      <ErrorState
        message="We couldn't load this goal."
        onRetry={() => void goal.refetch()}
        retrying={goal.isFetching}
      />
    );
  }
  if (writable && goal.data.archived_at !== null) {
    return (
      <EmptyState
        title="This goal is read-only"
        body={ARCHIVED_COPY}
        action={
          <Link href={`/goals/${id}`} className="type-label text-fg-link underline">
            Back to the goal
          </Link>
        }
      />
    );
  }
  return children(goal.data);
}
