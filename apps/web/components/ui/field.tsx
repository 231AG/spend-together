import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// The label / hint / error frame shared by every form control (§14.3, §20). The label is
// always visible; hint and error are linked to the control by aria-describedby.

export interface FieldIds {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export interface FieldProps {
  label: string;
  hint?: ReactNode | undefined;
  error?: ReactNode | undefined;
  /** Render the control with the ids it must carry. */
  children: (ids: FieldIds) => ReactNode;
  className?: string | undefined;
  /** Extra line under the control (e.g. the ≈ conversion). Announced politely. */
  footer?: ReactNode | undefined;
  optional?: boolean | undefined;
  /** A stable id for the control, e.g. so an error summary can link to it. */
  id?: string | undefined;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
  footer,
  optional,
  id: fixedId,
}: FieldProps) {
  const generated = useId();
  const id = fixedId ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const footerId = footer ? `${id}-footer` : undefined;
  const describedBy = [errorId, hintId, footerId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="type-label text-fg-default">
        {label}
        {optional && <span className="text-fg-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="type-body-sm text-fg-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {footer && (
        <div id={footerId} aria-live="polite" className="type-body-sm text-fg-muted">
          {footer}
        </div>
      )}
      {error && (
        <p id={errorId} className="type-body-sm text-fg-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared control styling: 16 px text so iOS never zooms, a visible border, 44 px tall. */
export const controlClass = cn(
  'w-full min-h-(--touch-min) rounded-md border border-border-input bg-bg-card px-3',
  'type-body-lg text-fg-default placeholder:text-fg-muted',
  'transition-colors duration-(--dur-fast) ease-standard',
  'hover:border-border-strong',
  'aria-invalid:border-fg-error aria-invalid:border-(length:--border-width-strong)',
  'disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:opacity-(--opacity-disabled)',
);
