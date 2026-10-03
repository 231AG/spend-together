'use client';

import { Bell, Coins, Globe, HeartHandshake, KeyRound, Pencil, Tags } from 'lucide-react';
import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Field, controlClass } from '@/components/ui/field';
import { FormNotice } from '@/components/ui/form-message';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { SelectRow } from '@/components/ui/select-row';
import { useToast } from '@/components/ui/toast';
import { allTimeZones, detectTimeZone } from '@/lib/auth-input';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED, firstName } from '@/lib/couple';
import { useCategories, useCouple, useCurrencies, useMe, usePatchMe } from '@/lib/queries';
import { ShortcutSettings } from '../shortcuts/shortcut-settings';
import { initials } from '../navigation/navigation';
import { LogOutButton } from './log-out-button';

// SCR-21 Profile & settings (F11-01, F11-08; FR-22). W-09's grouping with live values:
// "USD · US Dollar", the time zone, "14 categories", "Email: on", the partner. Rows stack
// label over value below 768 px (SelectRow). Name and time zone change in place.

const icon = 'size-(--icon-md)';
const group = 'overflow-hidden rounded-lg border border-border-default bg-bg-card';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-1 type-overline text-fg-muted">
        {title}
      </h2>
      <ul className={`${group} divide-y divide-border-default`}>{children}</ul>
    </section>
  );
}

export function ProfileView() {
  const me = useMe();
  const currencies = useCurrencies();
  const categories = useCategories('all');
  const couple = useCouple();
  const [editing, setEditing] = useState<'name' | 'timezone' | null>(null);

  if (me.isPending) return <LoadingSkeleton shape="card" count={2} label="Loading your profile" />;
  if (me.isError) {
    return (
      <ErrorState message="We couldn't load your profile." onRetry={() => void me.refetch()} />
    );
  }
  const profile = me.data;
  const currency = currencies.byCode.get(profile.base_currency);
  const notify = profile.notify_email.invite_accepted || profile.notify_email.goal_completed;
  const partner =
    couple.data?.status === 'active' && couple.data.partner
      ? `${firstName(couple.data.partner.name)} · connected`
      : couple.data?.status === 'pending'
        ? 'Invitation pending'
        : 'Not connected';

  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col gap-6">
      <section
        aria-labelledby="profile-summary"
        className="flex items-center gap-4 rounded-lg border border-border-default bg-bg-card p-4"
      >
        <span
          aria-hidden
          className="inline-grid size-(--icon-tile-lg) shrink-0 place-items-center rounded-full bg-action-secondary-bg type-label text-action-secondary-fg"
        >
          {initials(profile.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="profile-summary" className="type-h3 text-fg-default">
            {profile.name}
          </h2>
          <span className="break-all type-body-sm text-fg-muted">
            {profile.email ?? profile.phone}
          </span>
        </div>
        <Button
          variant="tertiary"
          onClick={() => {
            setEditing('name');
          }}
        >
          <Pencil aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
          Edit profile
        </Button>
      </section>

      <Section id="profile-preferences" title="Preferences">
        <li>
          <SelectRow
            label="Base currency"
            value={currency ? `${currency.code} · ${currency.name}` : profile.base_currency}
            href="/profile/currency"
            icon={<Coins className={icon} strokeWidth={1.75} />}
          />
        </li>
        <li>
          <SelectRow
            label="Time zone"
            value={profile.timezone}
            onClick={() => {
              setEditing('timezone');
            }}
            icon={<Globe className={icon} strokeWidth={1.75} />}
          />
        </li>
        <li>
          <SelectRow
            label="Categories"
            {...(categories.data ? { value: `${String(categories.data.length)} categories` } : {})}
            href="/profile/categories"
            icon={<Tags className={icon} strokeWidth={1.75} />}
          />
        </li>
        <li>
          <SelectRow
            label="Notifications"
            value={`Email: ${notify ? 'on' : 'off'}`}
            href="/profile/notifications"
            icon={<Bell className={icon} strokeWidth={1.75} />}
          />
        </li>
      </Section>

      <Section id="profile-couple" title="Couple">
        <li>
          <SelectRow
            label="Partner"
            value={partner}
            href="/couple"
            icon={<HeartHandshake className={icon} strokeWidth={1.75} />}
          />
        </li>
      </Section>

      <Section id="profile-security" title="Security & account">
        <li>
          <SelectRow
            label="Change password"
            href="/profile/security"
            icon={<KeyRound className={icon} strokeWidth={1.75} />}
          />
        </li>
        <li className="p-3">
          <LogOutButton />
        </li>
      </Section>

      <ShortcutSettings />

      <Dialog
        open={editing === 'name'}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit profile"
      >
        {editing === 'name' && (
          <NameForm
            initial={profile.name}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={editing === 'timezone'}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Time zone"
      >
        {editing === 'timezone' && (
          <TimeZoneForm
            initial={profile.timezone}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function NameForm({ initial, onDone }: { initial: string; onDone: () => void }) {
  const [name, setName] = useState(initial);
  const patch = usePatchMe();
  const online = useOnline();
  const toast = useToast();
  const error = name.trim() === '' ? 'Enter your name.' : null;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        if (error || !online) return;
        if (name.trim() === initial) {
          onDone();
          return;
        }
        patch.mutate(
          { name: name.trim() },
          {
            onSuccess: () => {
              toast({ message: 'Profile updated' });
              onDone();
            },
          },
        );
      }}
    >
      <Input
        label="Name"
        autoComplete="name"
        maxLength={80}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        {...(error ? { error } : {})}
      />
      <p className="type-body-sm text-fg-muted">
        Your email or phone number can't be changed here.
      </p>
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {patch.isError && <FormNotice tone="error">We couldn't save that. Try again.</FormNotice>}
      <Button type="submit" loading={patch.isPending} disabled={!!error || !online}>
        Save
      </Button>
    </form>
  );
}

/** F11-08: detected zone offered first; changing it moves "today" and every period (BR-16). */
function TimeZoneForm({ initial, onDone }: { initial: string; onDone: () => void }) {
  const [zone, setZone] = useState(initial);
  const patch = usePatchMe();
  const online = useOnline();
  const toast = useToast();
  const detected = detectTimeZone();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        if (!online) return;
        if (zone === initial) {
          onDone();
          return;
        }
        patch.mutate(
          { timezone: zone },
          {
            onSuccess: () => {
              toast({ message: `Time zone set to ${zone}` });
              onDone();
            },
          },
        );
      }}
    >
      <Field label="Time zone" hint="Days, weeks and months follow this time zone.">
        {({ id, describedBy }) => (
          <select
            id={id}
            value={zone}
            aria-describedby={describedBy}
            onChange={(e) => {
              setZone(e.target.value);
            }}
            className={controlClass}
          >
            {allTimeZones(zone).map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        )}
      </Field>
      {detected !== zone && (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            setZone(detected);
          }}
        >
          Use this device's time zone ({detected})
        </Button>
      )}
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {patch.isError && <FormNotice tone="error">We couldn't save that. Try again.</FormNotice>}
      <Button type="submit" loading={patch.isPending} disabled={!online}>
        Save
      </Button>
    </form>
  );
}
