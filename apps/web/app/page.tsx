import { apiClient } from '@/lib/api-client';

// Foundation placeholder. The real routes (spec §12.1) arrive from F5.
export default function Page() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold text-primary-700">SpendTogether</h1>
      <p className="mt-2">Foundation build. Screens arrive in phase F5.</p>
      <p className="mt-2">
        API mode: <strong>{apiClient.mode}</strong>
      </p>
    </main>
  );
}
