import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './button';
import { ConfirmationDialog } from './confirmation-dialog';
import { Dialog } from './dialog';
import { Input } from './input';
import { ToastProvider, useToast } from './toast';

const meta = { title: 'Overlays/Components' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Bottom sheet below 768 px, centred dialog above. Focus is trapped and returns to the trigger. */
export const DialogOrSheet: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add expense"
        description="Record money you spent."
        trigger={<Button>Add expense</Button>}
        footer={
          <>
            <Button
              variant="tertiary"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Save expense
            </Button>
          </>
        }
      >
        <Input label="Note" />
      </Dialog>
    );
  },
};

/** Destructive action on the right; Cancel is focused by default. */
export const Confirmation: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<Button variant="destructive">Delete goal</Button>}
        title="Delete “New Laptop”?"
        consequences={<p>Its 5 contributions ($600.00) are deleted too. This can’t be undone.</p>}
        confirmLabel="Delete goal"
        destructive
        onConfirm={() => undefined}
      />
    );
  },
};

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex gap-3">
      <Button
        variant="tertiary"
        onClick={() => {
          toast({ message: 'Expense saved' });
        }}
      >
        Show toast
      </Button>
      <Button
        variant="tertiary"
        onClick={() => {
          toast({
            message: 'Expense deleted',
            action: { label: 'Undo', altText: 'Undo delete expense', onAction: () => undefined },
          });
        }}
      >
        Delete with Undo
      </Button>
    </div>
  );
}

/** role="status", 5 s, pauses on hover/focus; F8 moves focus to the toast so Undo is reachable. */
export const Toasts: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
};
