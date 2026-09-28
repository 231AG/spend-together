import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// One h1 per page (§20). Pushed pages get a back link (§12.2 "pushed pages with back
// button").

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 pb-5 pt-2">
      {back && (
        <Link
          href={back.href}
          className="inline-flex min-h-(--touch-min) items-center gap-1 self-start type-label text-fg-link"
        >
          <ArrowLeft aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-h2 md:type-h1">{title}</h1>
          {subtitle && <p className="type-body-sm text-fg-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}

/** Stand-in body for a screen that a later phase builds (F5 route map). */
export function ComingInPhase({ phase, what }: { phase: string; what: string }) {
  return (
    <section className="rounded-lg border border-dashed border-border-input bg-bg-card p-6">
      <p className="type-label text-fg-default">Arrives in {phase}</p>
      <p className="mt-1 max-w-(--measure-prose) type-body-lg text-fg-body">{what}</p>
    </section>
  );
}
