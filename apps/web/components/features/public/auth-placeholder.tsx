import { ComingInPhase } from '@/components/layout/page-header';

/** An auth screen's heading and stand-in body until F6 builds the form. */
export function AuthPlaceholder({ title, what }: { title: string; what: string }) {
  return (
    <>
      <h1 className="type-h2">{title}</h1>
      <ComingInPhase phase="F6" what={what} />
    </>
  );
}
