'use client';

import { AlertDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 ConfirmationDialog on Radix AlertDialog: Cancel is focused by default, the
// confirming (often destructive) action sits on the right, and consequences are spelled
// out. Destructive actions never use the primary style (§18.2).

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequences: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  cancelLabel?: string;
  trigger?: ReactNode;
}

const base =
  'inline-flex min-h-(--touch-min) items-center justify-center rounded-md px-4 type-label transition-colors duration-(--dur-fast) ease-standard';

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  consequences,
  confirmLabel,
  onConfirm,
  destructive = false,
  cancelLabel = 'Cancel',
  trigger,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-scrim" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-(--z-modal) flex w-(--dialog-width) max-w-(--dialog-max) -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-bg-card p-6 shadow-elev-3">
          <AlertDialog.Title className="type-h3 text-fg-default">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="type-body-lg text-fg-body">{consequences}</div>
          </AlertDialog.Description>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel
              className={cn(
                base,
                'border border-border-input bg-bg-card text-fg-default hover:bg-bg-subtle',
              )}
            >
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className={cn(
                base,
                destructive
                  ? 'bg-action-danger-bg text-action-danger-fg hover:bg-action-danger-bg-hover'
                  : 'bg-action-primary-bg text-action-primary-fg hover:bg-action-primary-bg-hover',
              )}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
