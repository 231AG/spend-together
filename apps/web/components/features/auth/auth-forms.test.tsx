// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { ApiError, apiClient } from '@/lib/api-client';
import { COPY } from '@/lib/auth-copy';
import { CurrencySetup } from './currency-setup';
import { LoginForm } from './login-form';
import { ForgotPasswordForm } from './password-reset';
import { RegisterForm } from './register-form';

// F6: blur-timed validation, the error summary, autocomplete hints, enumeration-safe copy
// (FR-02, FR-04), lockout, and the locale-based currency default (FR-05).

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/register',
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const fail = (status: number, code: string) =>
  new ApiError(status, { error: { code, message: 'server words', request_id: 'r' } } as never);

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

async function noSeriousViolations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
}

let call: MockInstance<(...args: unknown[]) => Promise<unknown>>;
beforeEach(() => {
  call = vi.spyOn(apiClient, 'call') as unknown as typeof call;
  replace.mockReset();
});
afterEach(() => {
  call.mockRestore();
});

describe('Register (SCR-04, FR-01)', () => {
  it('validates after blur, not while typing', async () => {
    const user = userEvent.setup();
    render(wrap(<RegisterForm />));
    const email = screen.getByLabelText('Email or phone');
    await user.type(email, 'ada@');
    expect(screen.queryByText(/full email address/)).toBeNull();
    await user.tab();
    expect(screen.getByText(/full email address/)).toBeTruthy();
    expect(email.getAttribute('aria-invalid')).toBe('true');
    // Fixing it clears the message as the person types.
    await user.click(email);
    await user.type(email, 'example.com');
    expect(screen.queryByText(/full email address/)).toBeNull();
  });

  it('uses the right autocomplete hints and switches the keyboard for phones', async () => {
    const user = userEvent.setup();
    render(wrap(<RegisterForm />));
    expect(screen.getByLabelText('Name').getAttribute('autocomplete')).toBe('name');
    const id = screen.getByLabelText('Email or phone');
    expect(id.getAttribute('autocomplete')).toBe('email');
    await user.type(id, '+231');
    expect(id.getAttribute('autocomplete')).toBe('tel');
    expect(id.getAttribute('inputmode')).toBe('tel');
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('Confirm password').getAttribute('autocomplete')).toBe(
      'new-password',
    );
  });

  it('on submit lists every problem in a focused summary and sends nothing', async () => {
    const user = userEvent.setup();
    const { container } = render(wrap(<RegisterForm />));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const summary = screen.getByRole('alert');
    expect(document.activeElement === summary || summary.contains(document.activeElement)).toBe(
      true,
    );
    expect(summary.textContent).toMatch(/Enter your name/);
    expect(summary.textContent).toMatch(/Enter a password/);
    expect(call).not.toHaveBeenCalled();
    await noSeriousViolations(container);
  });

  it('shows the generic duplicate message with a Log in link and keeps the values', async () => {
    call.mockRejectedValue(fail(409, 'CONFLICT'));
    const user = userEvent.setup();
    render(wrap(<RegisterForm />));
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email or phone'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-1');
    await user.type(screen.getByLabelText('Confirm password'), 'long-enough-1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(COPY.duplicate)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Log in instead?' })).toBeTruthy();
    expect(screen.getByLabelText('Email or phone')).toHaveProperty('value', 'ada@example.com');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('Login (SCR-05, FR-02)', () => {
  async function attempt(identifier: string) {
    const user = userEvent.setup();
    const view = render(wrap(<LoginForm />));
    await user.type(screen.getByLabelText('Email or phone'), identifier);
    await user.type(screen.getByLabelText('Password'), 'whatever-123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    return view;
  }

  it('says the same thing for an unknown account and a wrong password', async () => {
    call.mockRejectedValueOnce(fail(401, 'UNAUTHENTICATED'));
    const first = await attempt('nobody@example.com');
    const unknown = (await screen.findByText(COPY.credentials)).textContent;
    first.unmount();

    call.mockRejectedValueOnce(fail(401, 'UNAUTHENTICATED'));
    await attempt('ada@example.com');
    expect((await screen.findByText(COPY.credentials)).textContent).toBe(unknown);
    expect(screen.queryByText('server words')).toBeNull();
  });

  it('shows the lockout message on 429', async () => {
    call.mockRejectedValueOnce(fail(429, 'RATE_LIMITED'));
    await attempt('ada@example.com');
    expect(await screen.findByText(COPY.lockout)).toBeTruthy();
  });

  it('uses username/current-password so password managers fill it', () => {
    render(wrap(<LoginForm />));
    expect(screen.getByLabelText('Email or phone').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
  });
});

describe('Forgot password (SCR-06, FR-04)', () => {
  it.each([
    ['accepted', () => Promise.resolve({ acknowledged: true })],
    ['unknown account', () => Promise.reject(fail(404, 'NOT_FOUND'))],
  ])('%s: the same confirmation', async (_name, answer) => {
    call.mockImplementation(answer);
    const user = userEvent.setup();
    render(wrap(<ForgotPasswordForm />));
    await user.type(screen.getByLabelText('Email or phone'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByText(COPY.forgotSent)).toBeTruthy();
  });
});

describe('Currency setup (SCR-07, FR-05)', () => {
  const currencies = ['USD', 'LRD', 'EUR'].map((code) => ({
    code,
    name: code,
    minor_units: 2,
    symbol: code,
    is_active: true,
  }));

  it('pre-selects the currency from the browser locale', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-LR');
    call.mockResolvedValue({ data: currencies });
    const { container } = render(wrap(<CurrencySetup />));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /LRD/ })).toHaveProperty('checked', true);
    });
    await noSeriousViolations(container);
  });
});
