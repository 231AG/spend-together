import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, type ButtonSize, type ButtonVariant } from './button';
import { IconButton } from './icon-button';

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Save expense', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', children: 'Add contribution' } };
export const Tertiary: Story = { args: { variant: 'tertiary', children: 'Cancel' } };
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete expense',
    iconLeft: <Trash2 aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />,
  },
};
export const Ghost: Story = { args: { variant: 'ghost', children: 'View all' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = {
  args: {
    children: 'Add',
    iconLeft: <Plus aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />,
  },
};

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'tertiary', 'destructive', 'ghost'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

/** Every variant × size, plus disabled and loading. Hover and focus: use the keyboard. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          {SIZES.map((size) => (
            <Button key={size} variant={variant} size={size}>
              {variant} {size}
            </Button>
          ))}
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex gap-3">
      <IconButton icon={<X strokeWidth={1.75} />} label="Close" />
      <IconButton icon={<Plus strokeWidth={1.75} />} label="Add transaction" variant="primary" />
      <IconButton icon={<Trash2 strokeWidth={1.75} />} label="Delete" variant="tertiary" />
      <IconButton icon={<Trash2 strokeWidth={1.75} />} label="Delete (disabled)" disabled />
    </div>
  ),
};
