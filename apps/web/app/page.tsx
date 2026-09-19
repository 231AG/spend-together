import { apiMode } from '@/lib/api-client';

/**
 * Placeholder. The real route map (spec 12.1) arrives in phase F5; the screens
 * that fill it arrive in F6 through F11. This page exists only so F0 can prove
 * the app builds and the API-mode switch resolves.
 */
export default function Page() {
  return (
    <main>
      <h1>SpendTogether</h1>
      <p>Track. Save. Grow. Together.</p>
      <p>API mode: {apiMode()}</p>
    </main>
  );
}
