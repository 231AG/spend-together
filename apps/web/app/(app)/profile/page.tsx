import { Bell, Coins, HeartHandshake, ShieldCheck, Tags } from 'lucide-react';
import { ShortcutSettings } from '@/components/features/shortcuts/shortcut-settings';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';
import { SelectRow } from '@/components/ui/select-row';

// SCR-21 Profile & settings `/profile`.
const icon = 'size-(--icon-md)';

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <div className="flex flex-col gap-6">
        <nav
          aria-label="Settings"
          className="overflow-hidden rounded-lg border border-border-default bg-bg-card"
        >
          <ul className="divide-y divide-border-default">
            <li>
              <SelectRow
                label="Base currency"
                href="/profile/currency"
                icon={<Coins className={icon} strokeWidth={1.75} />}
              />
            </li>
            <li>
              <SelectRow
                label="Categories"
                href="/profile/categories"
                icon={<Tags className={icon} strokeWidth={1.75} />}
              />
            </li>
            <li>
              <SelectRow
                label="Notifications"
                href="/profile/notifications"
                icon={<Bell className={icon} strokeWidth={1.75} />}
              />
            </li>
            <li>
              <SelectRow
                label="Security"
                href="/profile/security"
                icon={<ShieldCheck className={icon} strokeWidth={1.75} />}
              />
            </li>
            <li>
              <SelectRow
                label="Couple"
                href="/couple"
                icon={<HeartHandshake className={icon} strokeWidth={1.75} />}
              />
            </li>
          </ul>
        </nav>
        <ShortcutSettings />
        <ComingInPhase phase="F11" what="Your name, email or phone, time zone and sign out." />
      </div>
    </>
  );
}
