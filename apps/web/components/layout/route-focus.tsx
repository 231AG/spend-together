'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
    const heading = document.querySelector<HTMLElement>(`#${containerId} h1`);
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [pathname, containerId]);

  return null;
}
