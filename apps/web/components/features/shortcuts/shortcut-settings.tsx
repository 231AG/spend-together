'use client';

import { Keyboard } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { setShortcutsEnabled, useShortcutsEnabled } from '@/lib/preferences';
import { ShortcutHelpDialog } from './shortcut-layer';

// Profile setting (§12.2): turn every keyboard shortcut off, and open the list.

export function ShortcutSettings() {
  const enabled = useShortcutsEnabled();
  const [helpOpen, setHelpOpen] = useState(false);
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-card p-4"
    >
      <h2 id={`${id}-title`} className="type-h3">
        Keyboard shortcuts
      </h2>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setShortcutsEnabled(e.target.checked);
          }}
          className="mt-0.5 size-5 accent-primary-700"
        />
        <label htmlFor={id} className="flex flex-col">
          <span className="type-label text-fg-default">Use keyboard shortcuts</span>
          <span className="type-body-sm text-fg-muted">
            N to add, / to search, G then a letter to jump.
          </span>
        </label>
      </div>
      <Button
        variant="tertiary"
        size="sm"
        className="self-start"
        iconLeft={<Keyboard aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
        onClick={() => {
          setHelpOpen(true);
        }}
      >
        Show all shortcuts
      </Button>
      <ShortcutHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </section>
  );
}
