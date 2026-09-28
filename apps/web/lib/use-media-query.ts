'use client';

import { useSyncExternalStore } from 'react';

/** The §21 `md` breakpoint (768 px), from which pickers become popovers. */
export const MD_UP = '(min-width: 48rem)';

/** Subscribe to a media query. Renders mobile-first (false) on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
