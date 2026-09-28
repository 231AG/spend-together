import { cn } from '@/lib/cn';

// Spec §14.3 LoadingSkeleton and §19.1: shapes match the final layout, appear only after
// 150 ms (the `skeleton` utility), and the shimmer stops under reduced motion. Hidden from
// assistive technology; the region announces loading once through `label`.

export type SkeletonShape = 'text' | 'row' | 'card' | 'hero' | 'metric' | 'goal-card';

export interface LoadingSkeletonProps {
  shape: SkeletonShape;
  count?: number;
  /** Announced once for the whole group, e.g. "Loading activity". */
  label?: string;
  className?: string;
}

function Line({ className }: { className?: string }) {
  return <span className={cn('skeleton block h-(--skeleton-line)', className)} />;
}

function Shape({ shape }: { shape: SkeletonShape }) {
  switch (shape) {
    case 'text':
      return <Line className="w-3/4" />;
    case 'row':
      return (
        <span className="flex items-center gap-3 px-2 py-3">
          <span className="skeleton size-(--icon-tile) rounded-md" />
          <span className="flex flex-1 flex-col gap-2">
            <Line className="w-1/3" />
            <Line className="w-1/2" />
          </span>
          <Line className="w-16" />
        </span>
      );
    case 'metric':
      return (
        <span className="flex flex-col gap-2">
          <Line className="w-1/2" />
          <Line className="h-6 w-3/4" />
        </span>
      );
    case 'goal-card':
      return (
        <span className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-card p-4">
          <Line className="w-1/2" />
          <Line className="w-1/3" />
          <span className="skeleton block h-(--progress-h) rounded-full" />
        </span>
      );
    case 'hero':
      return (
        <span className="flex flex-col gap-3 rounded-xl bg-bg-card p-6">
          <Line className="w-1/3" />
          <span className="skeleton block h-10 w-2/3" />
          <Line className="w-1/2" />
        </span>
      );
    case 'card':
      return <span className="skeleton block h-40 rounded-lg" />;
  }
}

export function LoadingSkeleton({ shape, count = 1, label, className }: LoadingSkeletonProps) {
  return (
    <div
      role={label ? 'status' : undefined}
      aria-busy={label ? true : undefined}
      className={cn('flex flex-col gap-2', className)}
    >
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: count }, (_, i) => (
        <span key={i} aria-hidden className="block">
          <Shape shape={shape} />
        </span>
      ))}
    </div>
  );
}
