'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

// Filter and view state lives in the URL (spec §12.1: shareable, reload- and Back-safe).
// Defaults are left out of the URL so `/home` and `/home?period=month` are the same view.

export function useUrlParam<V extends string>(
  name: string,
  allowed: readonly V[],
  fallback: V,
): [V, (next: V) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get(name);
  const value = allowed.find((v) => v === raw) ?? fallback;
  const set = useCallback(
    (next: V) => {
      const copy = new URLSearchParams(params.toString());
      if (next === fallback) copy.delete(name);
      else copy.set(name, next);
      const query = copy.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, router, pathname, name, fallback],
  );
  return [value, set];
}

/** A free-text or date parameter; empty removes it. */
export function useUrlText(name: string): [string, (next: string) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get(name) ?? '';
  const set = useCallback(
    (next: string) => {
      const copy = new URLSearchParams(params.toString());
      if (next.trim() === '') copy.delete(name);
      else copy.set(name, next);
      const query = copy.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, router, pathname, name],
  );
  return [value, set];
}
