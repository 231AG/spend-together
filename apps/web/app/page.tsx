import { apiClient } from '@/lib/api-client';

// Foundation placeholder. The real routes (spec §12.1) arrive from F5.
export default function Page() {
  return (
    <main className="mx-auto max-w-(--measure-prose) p-8">
      <h1 className="type-h1">SpendTogether</h1>
      <p className="mt-2">Foundation build. Screens arrive in phase F5.</p>
      <p className="mt-2">
        API mode: <strong className="text-fg-link">{apiClient.mode}</strong>
      </p>
    </main>
  );
}
