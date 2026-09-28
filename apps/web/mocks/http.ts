import type { Endpoint, EndpointName, ErrorEnvelope } from '@spendtogether/schemas';
import { endpoints } from '@spendtogether/schemas';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import type { z } from 'zod';
import { db, type UserRecord } from './db';
import { ApiFailure } from './errors';
import { scenario } from './scenarios';

// Turns one registry endpoint into an MSW handler (F4-11). Input is parsed with the same
// schemas the server uses; output is parsed against the response schema before it is
// sent, so the mock cannot answer outside the frozen contract.

export interface Ctx<E extends Endpoint> {
  params: E['params'] extends z.ZodType ? z.output<E['params']> : undefined;
  query: E['query'] extends z.ZodType ? z.output<E['query']> : undefined;
  body: E['body'] extends z.ZodType ? z.output<E['body']> : undefined;
  /** The signed-in user; guaranteed for session endpoints. */
  user: UserRecord;
  request: Request;
}

/** A response with a non-default status or extra headers. */
export class Reply {
  constructor(
    readonly body: unknown,
    readonly status?: number,
    readonly headers?: Record<string, string>,
  ) {}
}

type Resolver<E extends Endpoint> = (ctx: Ctx<E>) => unknown;

let requestSeq = 0;
const requestId = () => {
  requestSeq += 1;
  return `mock-req-${String(requestSeq).padStart(6, '0')}`;
};

function envelope(failure: ApiFailure): Response {
  const body: ErrorEnvelope = {
    error: {
      code: failure.code,
      message: failure.message,
      ...(failure.fields ? { fields: failure.fields } : {}),
      request_id: requestId(),
    },
  };
  return HttpResponse.json(body, { status: failure.status, headers: failure.headers ?? {} });
}

function fieldsOf(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

function parse(schema: z.ZodType | undefined, value: unknown): unknown {
  if (schema === undefined) return undefined;
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiFailure('VALIDATION_FAILED', 'Check the highlighted fields.', {
      fields: fieldsOf(result.error),
    });
  }
  return result.data;
}

/** The scope idempotency keys are remembered under: one user, one endpoint. */
export const idempotencyScope = (name: EndpointName, userId: string) => `${userId}:${name}`;

export function route<N extends EndpointName>(name: N, resolve: Resolver<(typeof endpoints)[N]>) {
  const endpoint: Endpoint = endpoints[name];
  const path = `*/api/v1${endpoint.path}`;
  const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete';

  return http[method](path, async ({ request, params }) => {
    const s = scenario();
    if (s.latencyMs > 0) await delay(s.latencyMs);
    if (s.offline) return HttpResponse.error();
    if (s.failing === 'all' || s.failing.includes(name)) {
      return envelope(new ApiFailure('INTERNAL', 'Something went wrong on our side. Try again.'));
    }
    try {
      let user: UserRecord | null = null;
      if (db.sessionUserId !== null) user = db.users.find((u) => u.id === db.sessionUserId) ?? null;
      if (endpoint.auth === 'session' && user === null) {
        throw new ApiFailure('UNAUTHENTICATED', 'Your session has ended. Sign in again.');
      }
      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams.entries());
      let rawBody: unknown = undefined;
      if (endpoint.body !== undefined) {
        const text = await request.text();
        try {
          rawBody = text === '' ? undefined : JSON.parse(text);
        } catch {
          throw new ApiFailure('VALIDATION_FAILED', 'The request body is not valid JSON.');
        }
      }
      // The leading `*` in the path pattern captures the origin as param "0"; drop it.
      const named = Object.fromEntries(Object.entries(params).filter(([k]) => !/^\d+$/.test(k)));
      const ctx = {
        params: parse(endpoint.params, named),
        query: parse(endpoint.query, query),
        body: parse(endpoint.body, rawBody),
        user: user as UserRecord,
        request,
      } as Ctx<(typeof endpoints)[N]>;

      // Idempotency (§10.1): a replayed key returns the first response, not a new record.
      const key = endpoint.idempotent ? request.headers.get('idempotency-key') : null;
      const scope = idempotencyScope(name, user?.id ?? 'anonymous');
      const hit = db.replay(scope, key);
      if (hit) return HttpResponse.json(hit.body as JsonBodyType, { status: hit.status });

      const result = resolve(ctx);
      const reply = result instanceof Reply ? result : new Reply(result);
      const status = reply.status ?? endpoint.status;
      if (status === 204)
        return new HttpResponse(null, { status: 204, headers: reply.headers ?? {} });
      const checked = endpoint.response.safeParse(reply.body);
      if (!checked.success) {
        throw new Error(`Mock ${name} broke the contract: ${checked.error.message}`);
      }
      db.remember(scope, key, status, checked.data);
      return HttpResponse.json(checked.data as JsonBodyType, {
        status,
        headers: reply.headers ?? {},
      });
    } catch (error) {
      if (error instanceof ApiFailure) return envelope(error);
      throw error;
    }
  });
}
