import { AlertTriangle, ArrowDown, Check, Star } from 'lucide-react';
import { cn } from '@/lib/cn';

// Spec §14.3 StatusChip and §17.2: always icon + text, never colour alone.
// ✓ On track, ! At risk, ↓ Behind, ★ Completed; an overdue goal reads "Overdue".

export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';

const STATUS = {
  on_track: {
    label: 'On track',
    Icon: Check,
    className: 'bg-status-ontrack-bg text-status-ontrack-fg',
  },
  at_risk: {
    label: 'At risk',
    Icon: AlertTriangle,
    className: 'bg-status-atrisk-bg text-status-atrisk-fg',
  },
  behind: {
    label: 'Behind',
    Icon: ArrowDown,
    className: 'bg-status-behind-bg text-status-behind-fg',
  },
  completed: {
    label: 'Completed',
    Icon: Star,
    className: 'bg-status-ontrack-bg text-status-ontrack-fg',
  },
} as const;

export interface StatusChipProps {
  status: GoalStatus;
  /** An overdue goal is `behind` with required_pace.overdue (F-15): label it so. */
  overdue?: boolean;
  className?: string;
}

export function StatusChip({ status, overdue = false, className }: StatusChipProps) {
  const { label, Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-caption',
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-(--icon-sm)" strokeWidth={2} />
      {status === 'behind' && overdue ? 'Overdue' : label}
    </span>
  );
}
