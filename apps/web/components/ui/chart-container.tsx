'use client';

import { BarChart3, Table2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 ChartContainer and §20: a <figure> with a <figcaption>, a "View as table"
// toggle that renders a real <table> with the same data, and the chart hidden from
// assistive technology while the table is shown.

export interface ChartTable {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface ChartContainerProps {
  title: string;
  description: string;
  table: ChartTable;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  table,
  children,
  actions,
  className,
}: ChartContainerProps) {
  const [showTable, setShowTable] = useState(false);
  const captionId = useId();
  return (
    <figure
      aria-labelledby={captionId}
      className={cn(
        'm-0 flex flex-col gap-3 rounded-lg border border-border-default bg-bg-card p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <figcaption id={captionId} className="flex flex-col">
          <span className="type-h3 text-fg-default">{title}</span>
          <span className="type-body-sm text-fg-muted">{description}</span>
        </figcaption>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => {
              setShowTable((v) => !v);
            }}
            className="inline-flex min-h-(--touch-min) items-center gap-1.5 rounded-md px-3 type-label text-fg-link hover:bg-bg-selected"
          >
            {showTable ? (
              <BarChart3 aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
            ) : (
              <Table2 aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
            )}
            {showTable ? 'View as chart' : 'View as table'}
          </button>
        </div>
      </div>
      <div aria-hidden={showTable || undefined} className={cn(showTable && 'hidden')}>
        {children}
      </div>
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse num type-body-sm">
            <caption className="sr-only">{table.caption}</caption>
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={cn(
                      'border-b border-border-default py-2 type-label text-fg-default',
                      i === 0 ? 'text-left' : 'text-right',
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={String(row[0])}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th
                        key={i}
                        scope="row"
                        className="border-b border-border-default py-2 text-left font-[inherit] text-fg-body"
                      >
                        {cell}
                      </th>
                    ) : (
                      <td
                        key={i}
                        className="border-b border-border-default py-2 text-right text-fg-default"
                      >
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
