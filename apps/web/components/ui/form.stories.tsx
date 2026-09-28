import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { previewConversion } from '@/lib/conversion-preview';
import { AmountInput } from './amount-input';
import { CategoryPicker } from './category-picker';
import { CurrencyPicker } from './currency-picker';
import { DatePicker } from './date-picker';
import { CATEGORIES, CURRENCIES, TODAY } from './fixtures';
import { Input, Textarea } from './input';

const meta = { title: 'Forms/Controls' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  render: () => <Input label="Note" placeholder="What was it for?" />,
};
export const WithHint: Story = {
  render: () => <Input label="Goal name" hint="Something you'll recognise, like “New laptop”." />,
};
export const WithError: Story = {
  render: () => (
    <Input
      label="Email"
      defaultValue="alex@"
      error="Enter a full email address, like name@example.com."
    />
  ),
};
export const DisabledInput: Story = {
  render: () => <Input label="Base currency" value="USD" disabled readOnly />,
};
export const TextareaWithCount: Story = {
  render: function Render() {
    const [value, setValue] = useState('Lunch at Waterside market');
    return (
      <Textarea
        label="Note"
        maxLength={140}
        value={value}
        required={false}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
    );
  },
};

const USD = { code: 'USD', exponent: 2, symbol: '$' };
const LRD = { code: 'LRD', exponent: 2, symbol: 'L$' };

/** Base currency: no conversion line. */
export const AmountBase: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(1200);
    return <AmountInput label="Amount" value={value} onValueChange={setValue} currency={USD} />;
  },
};

/** Foreign currency: the ≈ line comes from the same domain conversion the server uses (T-11). */
export const AmountForeign: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(500000);
    const preview =
      value === null
        ? undefined
        : previewConversion({
            amountMinor: value,
            from: LRD,
            base: USD,
            rate: '0.005280110887586462',
          });
    return (
      <AmountInput
        label="Amount"
        value={value}
        onValueChange={setValue}
        currency={LRD}
        {...(preview ? { preview } : {})}
      />
    );
  },
};

export const AmountEstimatedRate: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(500000);
    return (
      <AmountInput
        label="Amount"
        value={value}
        onValueChange={setValue}
        currency={LRD}
        preview={{
          status: 'ok',
          estimated: true,
          base: { amountMinor: 2640, currency: 'USD', exponent: 2 },
        }}
      />
    );
  },
};

/** ADR-005: 0.01 LRD rounds below one cent, so the message shows before Save. */
export const AmountTooSmall: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(1);
    return (
      <AmountInput
        label="Amount"
        value={value}
        onValueChange={setValue}
        currency={LRD}
        preview={{ status: 'too-small', baseCurrency: 'USD' }}
      />
    );
  },
};

export const AmountYen: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(1000);
    return (
      <AmountInput
        label="Amount"
        value={value}
        onValueChange={setValue}
        currency={{ code: 'JPY', exponent: 0 }}
      />
    );
  },
};

export const AmountDinar: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(1234);
    return (
      <AmountInput
        label="Amount"
        value={value}
        onValueChange={setValue}
        currency={{ code: 'KWD', exponent: 3 }}
      />
    );
  },
};

export const AmountError: Story = {
  render: () => (
    <AmountInput
      label="Amount"
      value={null}
      onValueChange={() => undefined}
      currency={USD}
      error="Enter an amount greater than 0."
    />
  ),
};

export const Currency: Story = {
  render: function Render() {
    const [value, setValue] = useState('LRD');
    return (
      <CurrencyPicker
        value={value}
        onValueChange={setValue}
        currencies={CURRENCIES}
        baseCurrency="USD"
        recent={['LRD', 'EUR']}
      />
    );
  },
};

export const Category: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div className="max-w-(--dialog-max)">
        <CategoryPicker
          type="expense"
          value={value}
          onValueChange={setValue}
          categories={[...CATEGORIES]}
          recent={[CATEGORIES[0].id, CATEGORIES[2].id]}
        />
      </div>
    );
  },
};

export const CategorySelected: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>(CATEGORIES[0].id);
    return (
      <div className="max-w-(--dialog-max)">
        <CategoryPicker
          type="expense"
          value={value}
          onValueChange={setValue}
          categories={[...CATEGORIES]}
        />
      </div>
    );
  },
};

/** max = today (BR-09); tomorrow cannot be chosen. */
export const DateField: Story = {
  render: function Render() {
    const [value, setValue] = useState(TODAY);
    return <DatePicker label="Date" value={value} onValueChange={setValue} today={TODAY} />;
  },
};
