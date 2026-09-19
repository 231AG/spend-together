import { z } from 'zod';

/**
 * Environment validation, run at boot.
 *
 * A missing or malformed variable fails loudly here, naming the variable, rather
 * than surfacing as an undefined deep inside a request months later.
 *
 * NEXT_PUBLIC_API_MODE is the switch the whole contract-first strategy rests on
 * (ADR-002): `mock` runs the app against the MSW backend built in F4, `live`
 * against the real API built in B5. Both modes must always build.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_MODE: z.enum(['mock', 'live']).default('mock'),
  NEXT_PUBLIC_API_BASE_URL: z.string().default('/api/v1'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}

export const env: Env = parseEnv();

/** True when the app is running against the MSW mock backend. */
export const isMockMode = env.NEXT_PUBLIC_API_MODE === 'mock';
