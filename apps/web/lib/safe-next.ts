// `?next=` return URLs (spec §12.1): honoured only when they point inside this app. A
// path must start with a single "/" and resolve to the same origin, so "//evil.example",
// "/\\evil.example", "https://evil.example" and "javascript:" are all refused.

const PROBE_ORIGIN = 'https://spendtogether.invalid';

export function safeNext(next: string | null | undefined, fallback = '/home'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  try {
    const url = new URL(next, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** `/?next=/goals%3Ftab%3Dours` for a redirect that should come back to `path`. */
export function withNext(target: string, path: string): string {
  if (path === '/' || path === '') return target;
  return `${target}?next=${encodeURIComponent(path)}`;
}
