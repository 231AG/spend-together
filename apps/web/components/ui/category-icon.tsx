import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { categoryVisual } from '@/lib/category-visuals';

// A category icon on a tile tinted by its §17.3 colour. Decorative: the category name is
// always rendered beside it (§18.2), so the icon is hidden from assistive technology.

export interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'md' | 'lg';
  className?: string;
}

export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const visual = categoryVisual(icon, color);
  const Icon = visual.icon;
  return (
    <span
      aria-hidden
      style={{ '--cat': `var(--${visual.token})` } as CSSProperties}
      className={cn(
        'cat-tile inline-grid shrink-0 place-items-center rounded-md',
        size === 'md' ? 'size-(--icon-tile)' : 'size-(--icon-tile-lg)',
        className,
      )}
    >
      <Icon className="size-(--icon-md)" strokeWidth={1.75} />
    </span>
  );
}
