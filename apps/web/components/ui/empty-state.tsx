import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 EmptyState and §19.1: answers what is missing (title), why it matters
// (body) and what to do next (one primary action).

export interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, illustration, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-input bg-bg-card px-6 py-8 text-center',
        className,
      )}
    >
      {illustration && (
        <div aria-hidden className="max-sm:hidden">
          {illustration}
        </div>
      )}
      <h2 className="type-h3">{title}</h2>
      <p className="max-w-(--measure-prose) type-body-lg text-fg-body">{body}</p>
      {action && <div className="pt-1">{action}</div>}
    </section>
  );
}
