'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { GLOBAL_ADD_ATTR } from '@/components/features/add-sheet';

// F5-06: after a client-side navigation, move focus to the new page's h1 so screen
// reader and keyboard users start at the top of the new content (the first load keeps
// the browser's default). Query-string changes (filters) do not move focus.

export function RouteFocus({ containerId = 'content' }: { containerId?: string }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const container = document.getElementById(containerId);
    const heading = container?.querySelector<HTMLElement>('h1');
    if (!container || !heading) return;
    // Focus already placed deliberately: inside the new page (e.g. Activity's search via
    // `/`), or on the global Add after a route dialog closed (F5-06). Without the second
    // check, a Back that lands after the dialog's focus return would steal it.
    const active = document.activeElement;
    if (active && active !== document.body && container.contains(active)) return;
    if (active?.hasAttribute(GLOBAL_ADD_ATTR)) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [pathname, containerId]);

  return null;
}
