import { cn } from '@/lib/cn';
import { goalVisual } from '@/lib/goals';

// A goal's icon on a saving-tinted tile. Decorative: the goal name is always beside it.
export function GoalIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = goalVisual(icon).Icon;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid size-(--icon-tile) shrink-0 place-items-center rounded-md bg-secondary-50 text-saving',
        className,
      )}
    >
      <Icon className="size-(--icon-md)" strokeWidth={1.75} />
    </span>
  );
}
