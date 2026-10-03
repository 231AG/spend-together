import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 SelectRow: a settings row with a chevron. It is one control whose accessible
// name includes both the label and the current value.

export interface SelectRowProps {
  label: string;
  value?: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function SelectRow({ label, value, icon, href, onClick, className }: SelectRowProps) {
  const content = (
    <>
      {icon && (
        <span
          aria-hidden
          className="inline-grid size-(--icon-tile) place-items-center rounded-md bg-bg-subtle text-fg-default"
        >
          {icon}
        </span>
      )}
      {/* Label over value below 768 px, side by side above (§21, W-09). */}
      <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-3">
        <span className="flex-1 type-body-lg text-fg-default">{label}</span>
        {value && <span className="break-words type-body-sm text-fg-muted">{value}</span>}
      </span>
      <ChevronRight aria-hidden className="size-(--icon-md) text-fg-muted" strokeWidth={1.75} />
    </>
  );
  const classes = cn(
    'flex w-full min-h-12 items-center gap-3 px-4 py-2 text-left hover:bg-bg-subtle',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
