'use client';

import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Form-level messages (§20 "errors summarised on submit", §19.1). An error summary lists
// every field problem as a link to that field and takes focus when it appears; a notice is
// a single message above the submit button (auth errors, lockout, offline, success).

export interface FieldProblem {
  /** The id of the input it refers to. */
  fieldId: string;
  message: string;
}

export function ErrorSummary({
  problems,
  focusKey,
}: {
  problems: FieldProblem[];
  focusKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (problems.length > 0) ref.current?.focus();
    // Re-focus on every submit attempt, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);
  if (problems.length === 0) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="rounded-lg border border-status-behind-fg bg-status-behind-bg p-4 focus:outline-none focus-visible:focus-ring"
    >
      <p id="error-summary-title" className="type-label text-fg-default">
        {problems.length === 1
          ? 'Fix 1 problem to continue'
          : `Fix ${problems.length} problems to continue`}
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 type-body-sm">
        {problems.map((p) => (
          <li key={p.fieldId}>
            <a href={`#${p.fieldId}`} className="text-fg-error underline">
              {p.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type NoticeTone = 'error' | 'offline' | 'success';

const TONES = {
  error: { Icon: AlertCircle, cls: 'border-status-behind-fg bg-status-behind-bg', role: 'alert' },
  offline: { Icon: WifiOff, cls: 'border-border-input bg-bg-subtle', role: 'alert' },
  success: {
    Icon: CheckCircle2,
    cls: 'border-status-ontrack-fg bg-status-ontrack-bg',
    role: 'status',
  },
} as const;

export function FormNotice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  const { Icon, cls, role } = TONES[tone];
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-4 py-3 type-body-sm text-fg-default',
        cls,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0" strokeWidth={1.75} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
