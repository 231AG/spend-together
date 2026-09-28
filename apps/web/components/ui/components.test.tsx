// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AmountInput } from './amount-input';
import { Button } from './button';
import { ChartContainer } from './chart-container';
import { ConfirmationDialog } from './confirmation-dialog';
import { CurrencyPicker } from './currency-picker';
import { DatePicker } from './date-picker';
import { Dialog } from './dialog';
import { CURRENCIES, TODAY, usd } from './fixtures';
import { IconButton } from './icon-button';
import { MetricCard } from './metric-card';
import { ProgressBar } from './progress-bar';
import { SegmentedControl } from './segmented-control';
import { StatusChip } from './status-chip';
import { ToastProvider, useToast } from './toast';
import { TransactionRow } from './transaction-row';

// F3 behaviour: keyboard paths, focus management and ARIA wiring (§20).

async function noBlockingViolations(node: Element) {
  const result = await axe.run(node, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

describe('Button (F3-06)', () => {
  it('activates with Enter and Space', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('loading keeps the label for width, disables and sets aria-busy', () => {
    render(<Button loading>Save expense</Button>);
    const button = screen.getByRole('button', { name: 'Save expense' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button).toHaveProperty('disabled', true);
  });

  it('IconButton label is the accessible name', () => {
    render(<IconButton icon={<span />} label="Close" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });
});

describe('AmountInput (F3-07)', () => {
  const LRD = { code: 'LRD', exponent: 2 };

  it('uses a decimal keypad and reports minor units', async () => {
    const onValueChange = vi.fn();
    render(
      <AmountInput label="Amount" value={null} onValueChange={onValueChange} currency={LRD} />,
    );
    const input = screen.getByLabelText('Amount');
    expect(input.getAttribute('inputmode')).toBe('decimal');
    await userEvent.type(input, '0,01');
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it('shows the too-small message before Save, linked to the input', () => {
    render(
      <AmountInput
        label="Amount"
        value={1}
        onValueChange={() => undefined}
        currency={LRD}
        preview={{ status: 'too-small', baseCurrency: 'USD' }}
      />,
    );
    const input = screen.getByLabelText('Amount');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const text = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' ');
    expect(text).toContain('too small to record in USD');
  });

  it('rejects decimal entry for exponent-0 currencies', async () => {
    const onValueChange = vi.fn();
    render(
      <AmountInput
        label="Amount"
        value={null}
        onValueChange={onValueChange}
        currency={{ code: 'JPY', exponent: 0 }}
      />,
    );
    await userEvent.type(screen.getByLabelText('Amount'), '10.5');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('JPY has no decimal places.')).toBeDefined();
  });
});

describe('DatePicker (F3-08, BR-09)', () => {
  it('caps at today and offers Today / Yesterday', async () => {
    function Harness() {
      const [value, setValue] = useState(TODAY);
      return <DatePicker label="Date" value={value} onValueChange={setValue} today={TODAY} />;
    }
    render(<Harness />);
    const input = screen.getByLabelText<HTMLInputElement>('Date');
    expect(input.max).toBe(TODAY);
    await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
    expect(input.value).toBe('2026-09-16');
    expect(screen.getByRole('button', { name: 'Yesterday' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('ignores a typed future date', () => {
    const onValueChange = vi.fn();
    render(<DatePicker label="Date" value={TODAY} onValueChange={onValueChange} today={TODAY} />);
    const input = screen.getByLabelText<HTMLInputElement>('Date');
    fireEvent.change(input, { target: { value: '2026-09-18' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('CurrencyPicker (F3-08)', () => {
  it('searches, pins base and recent, and chooses by keyboard', async () => {
    const onValueChange = vi.fn();
    render(
      <CurrencyPicker
        value="USD"
        onValueChange={onValueChange}
        currencies={CURRENCIES}
        baseCurrency="USD"
        recent={['LRD']}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Currency: USD · US Dollar' }));
    const dialog = screen.getByRole('dialog', { name: 'Currency' });
    const pinned = within(dialog).getByRole('region', { name: 'Pinned' });
    expect(
      within(pinned)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['USD · US DollarBase', 'LRD · Liberian Dollar']);
    await user.type(within(dialog).getByLabelText('Search currencies'), 'yen');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('JPY');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SegmentedControl (F3-09)', () => {
  it('is a radiogroup; arrow keys move the selection and Tab leaves', async () => {
    function Harness() {
      const [value, setValue] = useState<'a' | 'b' | 'c'>('a');
      return (
        <>
          <SegmentedControl
            label="Period"
            value={value}
            onValueChange={setValue}
            options={[
              { value: 'a', label: 'Today' },
              { value: 'b', label: 'This week' },
              { value: 'c', label: 'This month' },
            ]}
          />
          <button type="button">After</button>
        </>
      );
    }
    render(<Harness />);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Today' }));
    // Hold the key as a person does: Radix moves focus on a timer and checks on focus
    // while an arrow key is down.
    await user.keyboard('{ArrowRight>}');
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'This week' }).getAttribute('aria-checked')).toBe(
        'true',
      );
    });
    await user.keyboard('{/ArrowRight}');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
  });
});

describe('data display (F3-10)', () => {
  it('a transaction row is one button that reads as a sentence (§20)', () => {
    render(
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'expense',
          title: 'Food',
          category: { icon: 'utensils', color: 'cat-food' },
          amount: usd(1200),
          date: TODAY,
        }}
      />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'minus $12.00, expense, Food, 17 September',
    );
  });

  it('progress bar exposes value and spoken text', () => {
    render(
      <ProgressBar
        value={50}
        label="New Laptop progress"
        valueText="50% saved, $600.00 of $1,200.00"
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'New Laptop progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(bar.getAttribute('aria-valuetext')).toBe('50% saved, $600.00 of $1,200.00');
  });

  it('status and deltas are text, not colour alone', () => {
    render(
      <>
        <StatusChip status="at_risk" />
        <StatusChip status="behind" overdue />
        <MetricCard label="Savings rate" value={{ kind: 'pct', value: null }} />
        <MetricCard
          label="Expenses"
          value={{ kind: 'money', money: usd(57000) }}
          delta={{ value: -4.2017, unit: 'pct', comparedTo: 'vs Aug', increaseIs: 'bad' }}
        />
      </>,
    );
    expect(screen.getByText('At risk')).toBeDefined();
    expect(screen.getByText('Overdue')).toBeDefined();
    expect(screen.getByText('N/A')).toBeDefined();
    expect(screen.getByText(/−4\.2% vs Aug/).textContent).toBe('Down −4.2% vs Aug');
  });
});

describe('overlays (F3-11)', () => {
  it('dialog traps focus, closes on Esc and returns focus to the trigger', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Add expense"
          trigger={<button type="button">Open</button>}
        >
          <input aria-label="Note" />
        </Dialog>
      );
    }
    render(<Harness />);
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Add expense' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(await noBlockingViolations(document.body)).toEqual([]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('confirmation dialog focuses Cancel first', () => {
    render(
      <ConfirmationDialog
        open
        onOpenChange={() => undefined}
        title="Delete expense?"
        consequences="It is removed from every total."
        confirmLabel="Delete"
        destructive
        onConfirm={() => undefined}
      />,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('toast is a status with a keyboard-reachable Undo', async () => {
    const onUndo = vi.fn();
    function Trigger() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast({
              message: 'Expense deleted',
              action: { label: 'Undo', altText: 'Undo delete', onAction: onUndo },
            });
          }}
        >
          Delete
        </button>
      );
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    // Radix announces through its own role="status" live region, filled after a tick.
    await waitFor(() => {
      expect(
        screen.getAllByRole('status').some((s) => s.textContent.includes('Expense deleted')),
      ).toBe(true);
    });
    const undo = screen.getByRole('button', { name: 'Undo' });
    undo.focus();
    await user.keyboard('{Enter}');
    expect(onUndo).toHaveBeenCalledOnce();
  });
});

describe('ChartContainer (F3-13)', () => {
  it('toggles to a real table with the same data and hides the chart', async () => {
    render(
      <ChartContainer
        title="Where your money went"
        description="Expenses by category"
        table={{
          caption: 'Expenses by category',
          columns: ['Category', 'Amount'],
          rows: [
            ['Bills', '$150.00'],
            ['Food', '$140.00'],
          ],
        }}
      >
        <svg data-testid="chart" />
      </ChartContainer>,
    );
    expect(screen.getByRole('figure', { name: /Where your money went/ })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table', { name: 'Expenses by category' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByTestId('chart').parentElement?.getAttribute('aria-hidden')).toBe('true');
  });
});
