import type { z } from 'zod';
import * as contract from '../src/index';
import { endpoints, errorCodesFor, type Endpoint } from '../src/endpoints';

// Renders docs/plans/00-shared/api-contract.md from the endpoint registry, naming each
// schema by the identifier it is exported under, so the doc cannot drift from the code.

const names = new Map<unknown, string>();
for (const [name, value] of Object.entries(contract)) {
  if (typeof value === 'object' && !names.has(value)) names.set(value, name);
}

const nameOf = (schema: z.ZodType | undefined): string => {
  if (schema === undefined) return '—';
  if (schema === contract.NoContent) return '— (204)';
  return `\`${names.get(schema) ?? 'inline'}\``;
};

export function renderContractDoc(): string {
  const rows = (Object.entries(endpoints) as [string, Endpoint][]).map(([key, e]) => {
    const request = [
      e.params && `params ${nameOf(e.params)}`,
      e.query && `query ${nameOf(e.query)}`,
      e.body && `body ${nameOf(e.body)}`,
    ]
      .filter(Boolean)
      .join('<br>');
    return `| \`${e.method} ${e.path}\` | ${e.summary} | ${request || '—'} | ${nameOf(e.response)} | ${e.status} | ${errorCodesFor(e).join(', ')} | ${e.auth}${e.idempotent ? ', idempotent' : ''} | ${e.source} | \`${key}\` |`;
  });
  const counts = (Object.values(endpoints) as Endpoint[]).reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.source] = (acc[e.source] ?? 0) + 1;
      return acc;
    },
    {},
  );
  return `# API contract (generated)

> **Generated from \`packages/schemas/src/endpoints.ts\`. Do not edit by hand.**
> Regenerate with \`pnpm --filter @spendtogether/schemas contract:doc\`. \`pnpm test\`
> fails when this file is out of date.

Base path \`/api/v1\`. JSON, snake_case, ISO 8601 dates, money as
\`{amount_minor, currency, formatted}\` (spec §10.1). Every error uses the envelope
\`ErrorEnvelope\` (§10.2). *Errors* lists every code an endpoint can return: its own
codes plus those implied by its shape (session → UNAUTHENTICATED, input →
VALIDATION_FAILED, path id → NOT_FOUND, writes and auth → RATE_LIMITED, always INTERNAL).

${Object.keys(endpoints).length} endpoints: ${Object.entries(counts)
    .map(([source, n]) => `${n} from ${source}`)
    .join(', ')}.

| Endpoint | Purpose | Request | Response | Status | Errors | Access | Source | Client key |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
}
