import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-22 Categories `/profile/categories`.
export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" back={{ href: '/profile', label: 'Profile' }} />
      <ComingInPhase
        phase="F11"
        what="The default categories, and your own: create, rename, change the icon, or archive."
      />
    </>
  );
}
