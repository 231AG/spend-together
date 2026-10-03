'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { ErrorSummary, FormNotice } from '@/components/ui/form-message';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { COPY, authProblem, clearPendingVerify, pendingVerify } from '@/lib/auth-copy';
import { identifierError, normaliseIdentifier } from '@/lib/auth-input';
import { useOnline } from '@/lib/connectivity';
import { queryKeys } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';
import { useBlurValidation } from '@/lib/use-blur-validation';
import { IdentifierInput } from './fields';

// Verification (§7.1, F6-07). A code from the SMS or email is entered here; a link opens
// this page with ?code= and submits itself. A code that is wrong or expired shows the
// resend screen (ADR-012), never an error page.

type FieldName = 'identifier' | 'code';

const noSubscribe = () => () => undefined;

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const online = useOnline();
  const linkCode = params.get('code');
  // The identifier typed at Register, remembered for this tab (read on the client only).
  const remembered = useSyncExternalStore(noSubscribe, pendingVerify, () => '');
  const [typed, setIdentifier] = useState<string | null>(null);
  const identifier = typed ?? params.get('identifier') ?? remembered;
  const [code, setCode] = useState(linkCode ?? '');
  const [view, setView] = useState<'form' | 'resend'>('form');
  const [resent, setResent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const validate = useCallback(
    (field: FieldName) =>
      field === 'identifier'
        ? identifierError(identifier)
        : /^\d{6}$/.test(code.trim())
          ? null
          : 'Enter the 6-digit code.',
    [identifier, code],
  );
  const { errorFor, blur, attempt, submitted } = useBlurValidation(validate);

  const verify = useMutation({
    mutationFn: () =>
      apiClient.call(endpoints.verify, {
        body: { identifier: normaliseIdentifier(identifier), code: code.trim(), purpose: 'signup' },
      }),
    onSuccess: async (session) => {
      clearPendingVerify();
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      // A new account sets up its currency first, then returns to `next` (e.g. an
      // invitation it came from, SCR-20).
      const next = params.get('next');
      router.replace(
        session.user.onboarded
          ? safeNext(next)
          : `/setup/currency${next ? `?next=${encodeURIComponent(safeNext(next))}` : ''}`,
      );
    },
    onError: (error) => {
      const p = authProblem(error);
      if (p.kind === 'offline') setProblem(COPY.offline);
      else if (p.kind === 'lockout') setProblem(COPY.lockout);
      else setView('resend');
    },
  });

  const resend = useMutation({
    mutationFn: () =>
      apiClient.call(endpoints.resendVerification, {
        body: { identifier: normaliseIdentifier(identifier) },
      }),
    onSuccess: () => {
      setResent(true);
    },
    onError: (error) => {
      const p = authProblem(error);
      setProblem(p.kind === 'lockout' ? COPY.lockout : p.kind === 'offline' ? COPY.offline : null);
      if (p.kind !== 'lockout' && p.kind !== 'offline') setResent(true);
    },
  });

  // A verification link submits itself once, if we know who it's for.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (autoSubmitted.current || !linkCode || identifierError(identifier) !== null) return;
    autoSubmitted.current = true;
    verify.mutate();
  }, [linkCode, identifier, verify]);

  if (view === 'resend') {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice tone="error">{COPY.verifyFailed}</FormNotice>
        <p className="type-body-lg text-fg-body">
          We can send you a new code. It replaces the old one.
        </p>
        {identifierError(identifier) !== null && (
          <IdentifierInput
            fieldId="resend-identifier"
            mode="signin"
            value={identifier}
            onValueChange={setIdentifier}
            onBlur={() => {
              blur('identifier');
            }}
            {...(errorFor('identifier') ? { error: errorFor('identifier') } : {})}
          />
        )}
        {resent && <FormNotice tone="success">{COPY.resendSent}</FormNotice>}
        {problem && (
          <FormNotice tone={problem === COPY.offline ? 'offline' : 'error'}>{problem}</FormNotice>
        )}
        <Button
          size="lg"
          block
          loading={resend.isPending}
          disabled={!online || identifierError(identifier) !== null}
          onClick={() => {
            setProblem(null);
            resend.mutate();
          }}
        >
          Send a new code
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setCode('');
            setView('form');
          }}
        >
          Enter a code
        </Button>
      </div>
    );
  }

  const fields: FieldName[] = ['identifier', 'code'];
  const ids: Record<FieldName, string> = { identifier: 'verify-identifier', code: 'verify-code' };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        setProblem(null);
        if (attempt(fields).length > 0 || !online) return;
        verify.mutate();
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
      <p className="type-body-lg text-fg-body">
        We sent a 6-digit code to your email or phone. Enter it to confirm it's you.
      </p>
      <IdentifierInput
        fieldId={ids.identifier}
        mode="signin"
        value={identifier}
        onValueChange={setIdentifier}
        onBlur={() => {
          blur('identifier');
        }}
        {...(errorFor('identifier') ? { error: errorFor('identifier') } : {})}
      />
      <Input
        fieldId={ids.code}
        label="Code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, ''));
        }}
        onBlur={() => {
          blur('code');
        }}
        {...(errorFor('code') ? { error: errorFor('code') } : {})}
      />
      {!online && <FormNotice tone="offline">{COPY.offline}</FormNotice>}
      {problem && online && <FormNotice tone="error">{problem}</FormNotice>}
      <Button type="submit" size="lg" block loading={verify.isPending} disabled={!online}>
        Confirm
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          setView('resend');
        }}
      >
        I didn't get a code
      </Button>
    </form>
  );
}
