// Deterministic ids. Fixtures name records by key ("category:food", "tx:sep-lunch"), never
// by literal UUID; `uid(key)` always maps a key to the same RFC 4122 v4-shaped UUID, so the
// mock, the tests and B5's contract tests agree on ids without copying them around.

function fnv1a(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const hex = (n: number) => n.toString(16).padStart(8, '0');

export function uid(key: string): string {
  const h = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map((s) => hex(fnv1a(key, s)));
  const all = h.join('');
  // Set version 4 and the RFC 4122 variant so z.uuid() accepts it.
  const variant = ((parseInt(all.charAt(16), 16) & 0x3) | 0x8).toString(16);
  return `${all.slice(0, 8)}-${all.slice(8, 12)}-4${all.slice(13, 16)}-${variant}${all.slice(17, 20)}-${all.slice(20, 32)}`;
}

let sequence = 0;

/** A fresh id for a record created at runtime; deterministic within a session. */
export function nextId(kind: string): string {
  sequence += 1;
  return uid(`runtime:${kind}:${sequence}`);
}

export function resetIds(): void {
  sequence = 0;
}
