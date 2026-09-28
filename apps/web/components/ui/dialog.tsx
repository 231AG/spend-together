'use client';

import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';

// Spec §14.3 BottomSheet / Dialog on Radix Dialog: focus trap, Esc, focus returned to
// the trigger. `responsive` is a bottom sheet below md and a centred dialog from md.

export type DialogPresentation = 'responsive' | 'sheet' | 'dialog';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Optional trigger; without one, the caller controls `open` and focus returns to the opener. */
  trigger?: ReactNode;
  presentation?: DialogPresentation;
  children: ReactNode;
  footer?: ReactNode;
}

const PANEL: Record<DialogPresentation, string> = {
  sheet: 'inset-x-0 bottom-0 max-h-(--sheet-max-h) rounded-t-xl pb-[env(safe-area-inset-bottom)]',
  dialog:
    'left-1/2 top-1/2 w-(--dialog-width) max-w-(--dialog-max) max-h-(--dialog-max-h) -translate-x-1/2 -translate-y-1/2 rounded-xl',
  responsive: cn(
    'inset-x-0 bottom-0 max-h-(--sheet-max-h) rounded-t-xl pb-[env(safe-area-inset-bottom)]',
    'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-(--dialog-width) md:max-w-(--dialog-max)',
    'md:max-h-(--dialog-max-h) md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:pb-0',
  ),
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  presentation = 'responsive',
  children,
  footer,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-scrim" />
        <RadixDialog.Content
          className={cn(
            'fixed z-(--z-modal) flex flex-col overflow-hidden bg-bg-card shadow-elev-3 focus:outline-none',
            PANEL[presentation],
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-start gap-3 border-b border-border-default px-4 py-3">
            <div className="flex-1 pt-2">
              <RadixDialog.Title className="type-h3 text-fg-default">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 type-body-sm text-fg-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton icon={<X strokeWidth={1.75} />} label="Close" tooltip={false} />
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border-default px-4 py-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
