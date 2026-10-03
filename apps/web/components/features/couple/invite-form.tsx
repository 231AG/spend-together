'use client';

import { useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FormNotice } from '@/components/ui/form-message';
import { ApiError } from '@/lib/api-client';
import { identifierError, normaliseIdentifier } from '@/lib/auth-input';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { IdentifierInput } from '../auth/fields';
import { useInvitePartner } from './use-couple-actions';

// F10-02 (FR-19): invite by email or phone, format detected as it's typed. Inviting
// yourself is refused; any other refusal gets one message that reveals nothing about
// whether the person has an account or a partner (§7.8).

export function InviteForm({ onSent }: { onSent?: () => void }) {
  const online = useOnline();
  const invite = useInvitePartner();
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const formatError = identifierError(value);
  const shownError = fieldError ?? (touched ? formatError : null);

  function submit() {
    setTouched(true);
    if (formatError || !online) return;
    setProblem(null);
    setFieldError(null);
    invite.mutate(normaliseIdentifier(value), {
      onSuccess: () => {
        setValue('');
        setTouched(false);
        onSent?.();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
          setFieldError(error.fields['invitee'] ?? "You can't invite yourself.");
        } else if (error instanceof ApiError && error.code === 'CONFLICT') {
          setProblem('You already have a partner or an open invitation.');
        } else if (error instanceof TypeError) {
          setProblem(OFFLINE_BLOCKED);
        } else {
          setProblem("We couldn't send that. Try again.");
        }
      },
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        submit();
      }}
    >
      <IdentifierInput
        fieldId="invite-identifier"
        mode="signup"
        label="Partner's email or phone"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setFieldError(null);
        }}
        onBlur={() => {
          setTouched(true);
        }}
        {...(shownError ? { error: shownError } : {})}
      />
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {problem && online && <FormNotice tone="error">{problem}</FormNotice>}
      <Button
        type="submit"
        size="lg"
        loading={invite.isPending}
        disabled={!online || invite.isPending}
      >
        Send invitation
      </Button>
    </form>
  );
}
