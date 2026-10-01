'use client';

import type { ReactNode } from 'react';
import { useMediaQuery } from '@/lib/use-media-query';

// Shared chart rules (§16.2, F8-12): entry animation at most 300 ms and none under
// reduced motion; tooltips with formatted money and the bucket's date range; the
// minimum-data message instead of an empty axis. Colours are design tokens read through
// CSS variables, so light and dark themes follow automatically.

/** Plot sizes in px: Recharts lays out in numbers; the card around it is token-sized. */
export const CHART_HEIGHT = 240;
export const DONUT_SIZE = 200;

export const MIN_DATA_MESSAGE = 'Your trends appear as you record more activity';

/**
 * A design token as a number of px or ms, for Recharts props that will not take a CSS
 * variable (D-70). `rem` resolves against the root font size. 0 when the token is unset.
 */
export function readToken(name: string): number {
  if (typeof window === 'undefined') return 0;
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(`--${name}`).trim();
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  if (raw.endsWith('rem')) return value * Number.parseFloat(getComputedStyle(root).fontSize);
  if (raw.endsWith('s') && !raw.endsWith('ms')) return value * 1000;
  return value;
}

/** §16.2 entry animation: the dur-chart token (≤ 300 ms, 0 under reduced motion). */
export function useChartMotion(): { isAnimationActive: boolean; animationDuration: number } {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const duration = readToken('dur-chart');
  return { isAnimationActive: !reduced && duration > 0, animationDuration: duration };
}

/** Bar corner radius and tick size from tokens. */
export function chartMetrics(): { barRadius: [number, number, number, number]; tickSize: number } {
  const r = readToken('chart-bar-radius');
  return { barRadius: [r, r, 0, 0], tickSize: readToken('chart-tick-size') };
}

/** A CSS variable as an SVG paint (fill/stroke) value. */
export const cssVar = (token: string) => `var(--${token})`;

export function axisProps(tickSize: number) {
  return {
    stroke: cssVar('chart-axis'),
    tick: { fill: cssVar('chart-axis'), fontSize: tickSize },
    tickLine: false,
  } as const;
}

export function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; swatch?: string }[];
}) {
  return (
    <div className="flex min-w-40 flex-col gap-1 rounded-md border border-border-default bg-bg-card px-3 py-2 shadow-elev-2">
      <span className="type-label text-fg-default">{title}</span>
      {rows.map((r) => (
        <span key={r.label} className="flex items-center gap-2 type-body-sm text-fg-body">
          {r.swatch && (
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full"
              style={{ background: r.swatch }}
            />
          )}
          <span className="flex-1">{r.label}</span>
          <span className="num text-fg-default">{r.value}</span>
        </span>
      ))}
    </div>
  );
}

/** Two series need a legend; a swatch beside text, never colour alone. */
export function SeriesLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <ul className="flex flex-wrap gap-4 type-body-sm text-fg-body">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-2">
          {i.dashed ? (
            <span
              aria-hidden
              className="inline-block w-4 border-t-2 border-dashed"
              style={{ borderColor: i.color }}
            />
          ) : (
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full"
              style={{ background: i.color }}
            />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** C-02/C-03 with fewer than two buckets holding data (§16.2): totals, no empty axis. */
export function MinimumData({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-bg-subtle p-4">
      <p className="type-body-lg text-fg-default">{MIN_DATA_MESSAGE}.</p>
      {children}
    </div>
  );
}
