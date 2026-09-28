import type { ReactNode } from 'react';

// Public pages (§14.1 PublicLayout): onboarding and the invitation landing. No session
// needed; nothing personal is rendered.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="content"
      className="mx-auto flex min-h-dvh w-full max-w-(--content-max) flex-col gap-6 p-6"
    >
      {children}
    </main>
  );
}
