import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_MODE: z.enum(['mock', 'live']),
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1).default('/api/v1'),
});

export type Env = z.infer<typeof schema>;
export type ApiMode = Env['NEXT_PUBLIC_API_MODE'];

/** Validate raw variables, throwing one readable error that names every bad variable. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  throw new Error(
    `Invalid environment variables:\n${lines.join('\n')}\nCopy apps/web/.env.example to apps/web/.env.local and fill it in.`,
  );
}

// Each variable is read by its full literal name so Next.js can inline it into the client bundle.
export const env = parseEnv({
  NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});
