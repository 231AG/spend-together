'use client';

import { useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormNotice } from '@/components/ui/form-message';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { confirmsName, firstName } from '@/lib/couple';
import { useEndCouple } from './use-couple-actions';

// F10-07 (§7.9, FR-21, BR-18): consequences in plain words, then type the partner's
// first name to confirm. Ending is irreversible, so the friction is deliberate.

export function EndConnectionDialog({ partnerName }: { partnerName: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const end = useEndCouple();
  const toast = useToast();
  const name = firstName(partnerName);
  const confirmed = confirmsName(typed, partnerName);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped('');
      }}
      title={`End your connection with ${name}?`}
      presentation="responsive"
      trigger={
        <Button variant="tertiary" className="self-start">
          End connection
        </Button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event: SyntheticEvent) => {
          event.preventDefault();
          if (!confirmed) return;
          end.mutate(undefined, {
            onSuccess: () => {
              setOpen(false);
              toast({ message: `You and ${name} are no longer connected.` });
            },
          });
        }}
      >
        <ul className="flex list-disc flex-col gap-2 pl-5 type-body-lg text-fg-body">
          <li>Your shared goals become read-only for both of you. No new contributions.</li>
          <li>Their history stays visible to both of you.</li>
          <li>Nothing else is shared or moved — your own records were always private.</li>
          <li>This can't be undone. You can connect with someone again later.</li>
        </ul>
        <Input
          label={`Type ${name} to confirm`}
          hint={`Enter ${name}'s first name exactly as shown.`}
          autoComplete="off"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
          }}
        />
        {end.isError && (
          <FormNotice tone="error">We couldn't end the connection. Try again.</FormNotice>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="tertiary"
            onClick={() => {
              setOpen(false);
            }}
          >
            Keep connection
          </Button>
          <Button type="submit" variant="destructive" loading={end.isPending} disabled={!confirmed}>
            End connection
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
