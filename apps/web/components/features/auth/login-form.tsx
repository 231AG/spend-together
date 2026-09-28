'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorSummary, FormNotice } from '@/components/ui/form-message';
import { PasswordInput } from '@/components/ui/password-input';
import { apiClient } from '@/lib/api-client';
import { COPY, authProblem, type AuthProblem } from '@/lib/auth-copy';
import { identifierError, normaliseIdentifier } from '@/lib/auth-input';
import { useOnline } from '@/lib/connectivity';
import { queryKeys } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';
import { useBlurValidation } from '@/lib/use-blur-validation';
import { IdentifierInput } from './fields';

// SCR-05 Login (FR-02, §7.2). The error sits above the button and never says which field
// was wrong; unknown account and wrong password read identically. After five failures the
// API answers 429 and the lockout message shows. On success the session gate sends the
// person to ?next= (same-origin only) or /home.

type FieldName = 'identifier' | 'password';
const FIELDS: FieldName[] = ['identifier', 'password'];
const ID: Record<FieldName, string> = {
  identifier: 'login-identifier',
  password: 'login-password',
};

export function LoginForm() {
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const online = useOnline();
  const next = params.get('next');
  const nextSuffix = next ? `?next=${encodeURIComponent(safeNext(next))}` : '';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<AuthProblem | null>(null);

  const validate = useCallback(
    (field: FieldName) =>
      field === 'identifier'
        ? identifierError(identifier)
        : password === ''
          ? 'Enter your password.'
          : null,
    [identifier, password],
  );
  const { errorFor, blur, attempt, submitted } = useBlurValidation(validate);

  const login = useMutation({
    mutationFn: () =>
      apiClient.call(endpoints.login, {
        body: { identifier: normaliseIdentifier(identifier), password },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
    onError: (error) => {
      setProblem(authProblem(error));
    },
  });

  function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setProblem(null);
    if (attempt(FIELDS).length > 0 || !online) return;
    login.mutate();
  }

  const problems =
    submitted > 0
      ? FIELDS.flatMap((f) => {
          const message = errorFor(f);
          return message ? [{ fieldId: ID[f], message }] : [];
        })
      : [];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <ErrorSummary problems={problems} focusKey={submitted} />
      <IdentifierInput
        fieldId={ID.identifier}
        mode="signin"
        value={identifier}
        onValueChange={setIdentifier}
        onBlur={() => {
          blur('identifier');
        }}
        {...(errorFor('identifier') ? { error: errorFor('identifier') } : {})}
      />
      <PasswordInput
        fieldId={ID.password}
        label="Password"
        autoComplete="current-password"
        value={password}
        onValueChange={setPassword}
        onBlur={() => {
          blur('password');
        }}
        {...(errorFor('password') ? { error: errorFor('password') } : {})}
      />
      <Link href="/forgot-password" className="self-start type-label text-fg-link underline">
        Forgot password?
      </Link>

      {!online && <FormNotice tone="offline">{COPY.offline}</FormNotice>}
      {problem && online && (
        <FormNotice tone={problem.kind === 'offline' ? 'offline' : 'error'}>
          {problem.kind === 'lockout'
            ? COPY.lockout
            : problem.kind === 'offline'
              ? COPY.offline
              : problem.kind === 'rejected' || problem.kind === 'fields'
                ? COPY.credentials
                : COPY.generic}
        </FormNotice>
      )}

      <Button type="submit" size="lg" block loading={login.isPending} disabled={!online}>
        Log in
      </Button>
      <p className="type-body-sm text-fg-body">
        New to SpendTogether?{' '}
        <Link href={`/register${nextSuffix}`} className="type-label text-fg-link underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
