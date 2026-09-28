'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorSummary, FormNotice } from '@/components/ui/form-message';
import { PasswordInput } from '@/components/ui/password-input';
import { apiClient } from '@/lib/api-client';
import { COPY, authProblem, type AuthProblem } from '@/lib/auth-copy';
import {
  PASSWORD_MIN,
  identifierError,
  normaliseIdentifier,
  passwordError,
} from '@/lib/auth-input';
import { useOnline } from '@/lib/connectivity';
import { useBlurValidation } from '@/lib/use-blur-validation';
import { IdentifierInput } from './fields';

// SCR-06 (FR-04). Step 1 always confirms with the same sentence, whatever the answer, so
// nothing reveals whether an account exists. Step 2 sets the new password; success says
// that other sessions were signed out (§7.2).

export function ForgotPasswordForm() {
  const online = useOnline();
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const validate = useCallback(() => identifierError(identifier), [identifier]);
  const { errorFor, blur, attempt, submitted } = useBlurValidation<'identifier'>(validate);

  const send = useMutation({
    mutationFn: () =>
      apiClient.call(endpoints.forgotPassword, {
        body: { identifier: normaliseIdentifier(identifier) },
      }),
    // The confirmation is the UI's own fixed copy, never the server's words.
    onSuccess: () => {
      setSent(true);
    },
    onError: (error) => {
      const p = authProblem(error);
      // Only transport problems are shown; anything else still gets the same confirmation.
      if (p.kind === 'offline' || p.kind === 'lockout') setProblem(p);
      else setSent(true);
    },
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice tone="success">{COPY.forgotSent}</FormNotice>
        <p className="type-body-lg text-fg-body">
          Open the link in the email, or enter the code from the text message, to choose a new
          password.
        </p>
        <Link href="/login" className="self-start type-label text-fg-link underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        setProblem(null);
        if (attempt(['identifier']).length > 0 || !online) return;
        send.mutate();
      }}
    >
      <ErrorSummary
        problems={
          submitted > 0 && errorFor('identifier')
            ? [{ fieldId: 'forgot-identifier', message: errorFor('identifier') ?? '' }]
            : []
        }
        focusKey={submitted}
      />
      <p className="type-body-lg text-fg-body">
        Enter the email or phone you signed up with and we'll send a link or a code.
      </p>
      <IdentifierInput
        fieldId="forgot-identifier"
        mode="signin"
        value={identifier}
        onValueChange={setIdentifier}
        onBlur={() => {
          blur('identifier');
        }}
        {...(errorFor('identifier') ? { error: errorFor('identifier') } : {})}
      />
      {!online && <FormNotice tone="offline">{COPY.offline}</FormNotice>}
      {problem?.kind === 'lockout' && <FormNotice tone="error">{COPY.lockout}</FormNotice>}
      {problem?.kind === 'offline' && online && (
        <FormNotice tone="offline">{COPY.offline}</FormNotice>
      )}
      <Button type="submit" size="lg" block loading={send.isPending} disabled={!online}>
        Send instructions
      </Button>
    </form>
  );
}

type ResetField = 'password' | 'confirm';

export function ResetPasswordForm() {
  const params = useSearchParams();
  const online = useOnline();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<'form' | 'done' | 'expired'>(token ? 'form' : 'expired');
  const [problem, setProblem] = useState<AuthProblem | null>(null);

  const validate = useCallback(
    (field: ResetField) =>
      field === 'password'
        ? passwordError(password)
        : confirm === ''
          ? 'Enter your new password again.'
          : confirm === password
            ? null
            : COPY.mismatch,
    [password, confirm],
  );
  const { errorFor, blur, attempt, submitted } = useBlurValidation(validate);

  const reset = useMutation({
    mutationFn: () => apiClient.call(endpoints.resetPassword, { body: { token, password } }),
    onSuccess: () => {
      setState('done');
    },
    onError: (error) => {
      const p = authProblem(error);
      if (p.kind === 'rejected') setState('expired');
      else setProblem(p);
    },
  });

  if (state === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice tone="success">{COPY.resetDone}</FormNotice>
        <Link href="/login" className="self-start type-label text-fg-link underline">
          Log in with your new password
        </Link>
      </div>
    );
  }
  if (state === 'expired') {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice tone="error">{COPY.resetExpired}</FormNotice>
        <Link href="/forgot-password" className="self-start type-label text-fg-link underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const fields: ResetField[] = ['password', 'confirm'];
  const ids: Record<ResetField, string> = { password: 'reset-password', confirm: 'reset-confirm' };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        setProblem(null);
        if (attempt(fields).length > 0 || !online) return;
        reset.mutate();
      }}
    >
      <ErrorSummary
        problems={
          submitted > 0
            ? fields.flatMap((f) => {
                const m = errorFor(f);
                return m ? [{ fieldId: ids[f], message: m }] : [];
              })
            : []
        }
        focusKey={submitted}
      />
      <PasswordInput
        fieldId={ids.password}
        label="New password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        value={password}
        onValueChange={setPassword}
        onBlur={() => {
          blur('password');
        }}
        {...(errorFor('password') ? { error: errorFor('password') } : {})}
      />
      <PasswordInput
        fieldId={ids.confirm}
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onValueChange={setConfirm}
        onBlur={() => {
          blur('confirm');
        }}
        {...(errorFor('confirm') ? { error: errorFor('confirm') } : {})}
      />
      {!online && <FormNotice tone="offline">{COPY.offline}</FormNotice>}
      {problem && online && (
        <FormNotice tone="error">
          {problem.kind === 'lockout' ? COPY.lockout : COPY.generic}
        </FormNotice>
      )}
      <Button type="submit" size="lg" block loading={reset.isPending} disabled={!online}>
        Change password
      </Button>
    </form>
  );
}
