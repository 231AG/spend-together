import { cn } from '@/lib/cn';

// Spec §14.3 ProgressBar: role="progressbar" with aria-valuenow and a spoken
// aria-valuetext ("50% saved, $600.00 of $1,200.00"). 8 px, rounded (C-04).

export interface ProgressBarProps {
  /** 0–100, already capped by the domain (F-13). */
  value: number;
  label: string;
  /** Spoken value, e.g. "50% saved, $600.00 of $1,200.00". */
  valueText?: string;
  tone?: 'income' | 'saving';
  className?: string;
}

export function ProgressBar({
  value,
  label,
  valueText,
  tone = 'income',
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText ?? `${Math.round(clamped)}%`}
      className={cn(
        'h-(--progress-h) w-full overflow-hidden rounded-full bg-progress-track',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-(--dur-slow) ease-standard',
          tone === 'income' ? 'bg-progress-fill' : 'bg-chart-saving',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
