'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorSummary, FormNotice } from '@/components/ui/form-message';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { apiClient } from '@/lib/api-client';
import { COPY, authProblem, rememberPendingVerify, type AuthProblem } from '@/lib/auth-copy';
import {
  PASSWORD_MIN,
  identifierError,
  identifierKind,
  normaliseIdentifier,
  passwordError,
} from '@/lib/auth-input';
import { useOnline } from '@/lib/connectivity';
import { safeNext } from '@/lib/safe-next';
import { useBlurValidation } from '@/lib/use-blur-validation';
import { IdentifierInput } from './fields';

// SCR-04 Register (FR-01). Validates after blur; submit shows a spinner and disables;
// a duplicate identifier gets the one generic message with a Log in link. Values are
// kept through every failure.

type FieldName = 'name' | 'identifier' | 'password' | 'confirm';
const FIELDS: FieldName[] = ['name', 'identifier', 'password', 'confirm'];
const ID: Record<FieldName, string> = {
  name: 'register-name',
  identifier: 'register-identifier',
  password: 'register-password',
  confirm: 'register-confirm',
};

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const online = useOnline();
  const next = params.get('next');
  const nextSuffix = next ? `?next=${encodeURIComponent(safeNext(next))}` : '';
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: '',
    identifier: '',
    password: '',
    confirm: '',
  });
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<AuthProblem | null>(null);

  const validate = useCallback(
    (field: FieldName): string | null => {
      if (serverFields[field]) return serverFields[field] ?? null;
      switch (field) {
        case 'name':
          return values.name.trim() === '' ? 'Enter your name.' : null;
        case 'identifier':
          return identifierError(values.identifier);
        case 'password':
          return passwordError(values.password);
        case 'confirm':
          if (values.confirm === '') return 'Enter your password again.';
          return values.confirm === values.password ? null : COPY.mismatch;
      }
    },
    [values, serverFields],
  );
  const { errorFor, blur, attempt, submitted } = useBlurValidation(validate);

  const register = useMutation({
    mutationFn: () => {
      const identifier = normaliseIdentifier(values.identifier);
      const base = { name: values.name.trim(), password: values.password };
      const body =
        identifierKind(identifier) === 'phone'
          ? { ...base, phone: identifier }
          : { ...base, email: identifier };
      return apiClient.call(endpoints.register, { body });
    },
    onSuccess: () => {
      rememberPendingVerify(normaliseIdentifier(values.identifier));
      router.replace(`/verify${nextSuffix}`);
    },
    onError: (error) => {
      const p = authProblem(error);
      setProblem(p);
      if (p.kind === 'fields') {
        setServerFields({
          ...(p.fields['name'] ? { name: p.fields['name'] } : {}),
          ...(p.fields['email'] || p.fields['phone']
            ? { identifier: p.fields['email'] ?? p.fields['phone'] ?? '' }
            : {}),
          ...(p.fields['password'] ? { password: p.fields['password'] } : {}),
        });
      }
    },
  });

  function set(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (serverFields[field]) {
      setServerFields((f) => Object.fromEntries(Object.entries(f).filter(([k]) => k !== field)));
    }
  }

  function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setProblem(null);
    if (attempt(FIELDS).length > 0 || !online) return;
    register.mutate();
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
      <Input
        fieldId={ID.name}
        label="Name"
        autoComplete="name"
        value={values.name}
        onChange={(e) => {
          set('name', e.target.value);
        }}
        onBlur={() => {
          blur('name');
        }}
        {...(errorFor('name') ? { error: errorFor('name') } : {})}
      />
      <IdentifierInput
        fieldId={ID.identifier}
        mode="signup"
        value={values.identifier}
        onValueChange={(v) => {
          set('identifier', v);
        }}
        onBlur={() => {
          blur('identifier');
        }}
        {...(errorFor('identifier') ? { error: errorFor('identifier') } : {})}
      />
      <PasswordInput
        fieldId={ID.password}
        label="Password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        value={values.password}
        onValueChange={(v) => {
          set('password', v);
        }}
        onBlur={() => {
          blur('password');
        }}
        {...(errorFor('password') ? { error: errorFor('password') } : {})}
      />
      <PasswordInput
        fieldId={ID.confirm}
        label="Confirm password"
        autoComplete="new-password"
        value={values.confirm}
        onValueChange={(v) => {
          set('confirm', v);
        }}
        onBlur={() => {
          blur('confirm');
        }}
        {...(errorFor('confirm') ? { error: errorFor('confirm') } : {})}
      />

      {!online && <FormNotice tone="offline">{COPY.offline}</FormNotice>}
      {problem?.kind === 'duplicate' && (
        <FormNotice tone="error">
          {COPY.duplicate}{' '}
          <Link href={`/login${nextSuffix}`} className="underline">
            Log in instead?
          </Link>
        </FormNotice>
      )}
      {problem?.kind === 'offline' && online && (
        <FormNotice tone="offline">{COPY.offline}</FormNotice>
      )}
      {problem?.kind === 'lockout' && <FormNotice tone="error">{COPY.lockout}</FormNotice>}
      {(problem?.kind === 'generic' || problem?.kind === 'rejected') && (
        <FormNotice tone="error">{COPY.generic}</FormNotice>
      )}

      <Button type="submit" size="lg" block loading={register.isPending} disabled={!online}>
        Create account
      </Button>
      <p className="type-body-sm text-fg-body">
        Already have an account?{' '}
        <Link href={`/login${nextSuffix}`} className="type-label text-fg-link underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
