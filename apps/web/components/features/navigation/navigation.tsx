'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from 'radix-ui';
import { cn } from '@/lib/cn';
import { useMe } from '@/lib/queries';
import { AddButton } from '../add-sheet';
import { NAV_ITEMS, isCurrent } from './nav-items';

// F5-03: bottom tab bar below 768 px, a 72 px icon rail at 768–1023 px and a 240 px
// sidebar with a user card from 1024 px (§12.2, §21). All three are rendered and CSS
// shows exactly one, so the server and client agree and nothing jumps on hydration.
// Hidden treatments are display:none, so assistive technology meets one nav only.

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-(--z-nav) h-(--tabbar-total) border-t border-border-default bg-bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-full grid-cols-5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-(--touch-min) flex-col items-center justify-center gap-1 type-caption',
                  current ? 'text-fg-link' : 'text-fg-muted',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-grid h-7 w-12 place-items-center rounded-full',
                    current && 'bg-bg-selected',
                  )}
                >
                  <Icon className="size-(--icon-lg)" strokeWidth={1.75} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function IconRail() {
  const pathname = usePathname();
  return (
    <Tooltip.Provider delayDuration={300}>
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-(--z-nav) hidden w-(--rail) flex-col items-center gap-4 border-r border-border-default bg-bg-card py-4 md:flex lg:hidden"
      >
        <Brand compact />
        <AddButton variant="rail" />
        <ul className="flex flex-col gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const current = isCurrent(pathname, href);
            return (
              <li key={href}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Link
                      href={href}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'inline-grid size-12 place-items-center rounded-md',
                        current ? 'bg-bg-selected text-fg-link' : 'text-fg-body hover:bg-bg-subtle',
                      )}
                    >
                      <Icon aria-hidden className="size-(--icon-lg)" strokeWidth={1.75} />
                      <span className="sr-only">{label}</span>
                    </Link>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    {/* §12.2: labels on hover and on focus. */}
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="z-(--z-toast) rounded-sm bg-neutral-900 px-2 py-1 type-caption text-fg-on-action shadow-elev-2"
                    >
                      {label}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </li>
            );
          })}
        </ul>
      </nav>
    </Tooltip.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const me = useMe();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-(--z-nav) hidden w-(--sidebar) flex-col gap-6 border-r border-border-default bg-bg-card p-4 lg:flex"
    >
      <Brand />
      <AddButton variant="sidebar" />
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex min-h-(--touch-min) items-center gap-3 rounded-md px-3 type-label',
                  current ? 'bg-bg-selected text-fg-link' : 'text-fg-body hover:bg-bg-subtle',
                )}
              >
                <Icon aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      {me.data && (
        <Link
          href="/profile"
          className="mt-auto flex items-center gap-3 rounded-md p-2 hover:bg-bg-subtle"
        >
          <span
            aria-hidden
            className="inline-grid size-(--avatar) shrink-0 place-items-center rounded-full bg-bg-selected type-label text-fg-link"
          >
            {initials(me.data.name)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate type-label text-fg-default">{me.data.name}</span>
            <span className="truncate type-caption text-fg-muted">
              {me.data.email ?? me.data.phone ?? ''}
            </span>
          </span>
        </Link>
      )}
    </nav>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/home" className="inline-flex items-center gap-2 rounded-md px-1 text-fg-default">
      <span
        aria-hidden
        className="inline-grid size-(--icon-tile) place-items-center rounded-md bg-action-primary-bg type-label text-action-primary-fg"
      >
        ST
      </span>
      <span className={cn('type-h3', compact && 'sr-only')}>SpendTogether</span>
    </Link>
  );
}
