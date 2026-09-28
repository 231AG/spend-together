import { invalid } from './errors';

// Cursor pagination (§10.1): an opaque cursor the client passes back unchanged.

export function page<T>(items: T[], limit: number, cursor: string | undefined) {
  let offset = 0;
  if (cursor !== undefined) {
    const decoded = /^o:(\d+)$/.exec(atob(cursor));
    if (!decoded?.[1]) throw invalid('cursor', 'This page link has expired. Start again.');
    offset = Number.parseInt(decoded[1], 10);
  }
  const data = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? btoa(`o:${offset + limit}`) : null;
  return { data, next_cursor: next };
}
