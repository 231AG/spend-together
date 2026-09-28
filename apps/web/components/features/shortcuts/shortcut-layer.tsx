'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { shortcutsEnabled } from '@/lib/preferences';
import { useAddSheet } from '../add-sheet';
import { SHORTCUT_HELP, createShortcutHandler } from './shortcuts';

// Wires the shortcut handler to the document and renders the "?" help dialog.

export const SEARCH_SELECTOR = '[data-shortcut-search]';

export function ShortcutLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const { openAdd } = useAddSheet();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handler = createShortcutHandler(
      {
        openAdd,
        showHelp: () => {
          setHelpOpen(true);
        },
        go: (path) => {
          router.push(path);
        },
        focusSearch: () => {
          const input = document.querySelector<HTMLInputElement>(SEARCH_SELECTOR);
          if (input && pathname.startsWith('/activity')) input.focus();
          else router.push('/activity?focus=search');
        },
      },
      shortcutsEnabled,
    );
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [router, pathname, openAdd]);

  return <ShortcutHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />;
}

export function ShortcutHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Shortcuts don't work while you're typing in a field. You can turn them off in Profile."
      presentation="dialog"
    >
      <table className="w-full border-collapse type-body-sm">
        <caption className="sr-only">Keyboard shortcuts</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-border-default py-2 text-left type-label text-fg-default"
            >
              Keys
            </th>
            <th
              scope="col"
              className="border-b border-border-default py-2 text-left type-label text-fg-default"
            >
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUT_HELP.map((row) => (
            <tr key={row.action}>
              <td className="border-b border-border-default py-2">
                <span className="inline-flex items-center gap-1">
                  {row.keys.map((k, i) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-fg-muted">then</span>}
                      <kbd className="inline-grid min-w-7 place-items-center rounded-sm border border-border-input bg-bg-subtle px-1.5 type-caption text-fg-default">
                        {k}
                      </kbd>
                    </span>
                  ))}
                </span>
              </td>
              <td className="border-b border-border-default py-2 text-fg-body">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
