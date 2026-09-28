import { CloudOff } from 'lucide-react';

// F5-09: the page the service worker (F12) serves when an uncached route is requested
// offline. Static, and it makes no network call of any kind.

export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-bg-app p-6">
      <div className="flex max-w-(--dialog-max) flex-col items-center gap-3 text-center">
        <span
          aria-hidden
          className="inline-grid size-(--avatar-lg) place-items-center rounded-full bg-bg-subtle text-fg-body"
        >
          <CloudOff className="size-(--icon-lg)" strokeWidth={1.75} />
        </span>
        <h1 className="type-h2">You're offline</h1>
        <p className="type-body-lg text-fg-body">
          This page isn't saved on your device yet. Expenses and contributions you add offline are
          kept and synced when you reconnect.
        </p>
        {/* A plain link: a full reload is exactly what should happen once back online. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload intended */}
        <a href="/home" className="type-label text-fg-link underline">
          Try again
        </a>
      </div>
    </main>
  );
}
