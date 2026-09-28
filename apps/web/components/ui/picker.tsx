'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { MD_UP, useMediaQuery } from '@/lib/use-media-query';
import { Dialog } from './dialog';

// The shared engine behind CurrencyPicker and CategoryPicker (§14.3): a searchable list
// in a bottom sheet on mobile and a popover from md. Options are buttons with
// aria-pressed; Up/Down move between them, Enter or Space chooses.

export interface PickerOption {
  value: string;
  label: string;
  /** Extra words that match the search, e.g. a currency's code. */
  keywords?: string;
  /** Leading visual, e.g. a category icon tile. */
  leading?: ReactNode;
  trailing?: ReactNode;
}

export interface PickerProps {
  label: string;
  value: string | null;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  /** Shown first under "Pinned" (e.g. base and recent currencies). */
  pinned?: string[];
  searchLabel: string;
  /** Trigger content for the current value. */
  renderValue: (option: PickerOption | undefined) => ReactNode;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

function OptionList({
  options,
  value,
  onChoose,
  heading,
}: {
  options: PickerOption[];
  value: string | null;
  onChoose: (value: string) => void;
  heading?: string;
}) {
  const headingId = useId();
  if (options.length === 0) return null;
  return (
    <section aria-labelledby={heading ? headingId : undefined}>
      {heading && (
        <h3 id={headingId} className="px-2 pb-1 pt-3 type-overline text-fg-muted">
          {heading}
        </h3>
      )}
      <ul className="flex flex-col">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <li key={option.value}>
              <button
                type="button"
                data-picker-option=""
                aria-pressed={selected}
                onClick={() => {
                  onChoose(option.value);
                }}
                className={cn(
                  'flex w-full min-h-(--touch-min) items-center gap-3 rounded-md px-2 text-left',
                  'type-body-lg text-fg-default hover:bg-bg-subtle',
                  selected && 'bg-bg-selected',
                )}
              >
                {option.leading}
                <span className="flex-1">{option.label}</span>
                {option.trailing}
                {selected && (
                  <Check aria-hidden className="size-(--icon-md) text-fg-link" strokeWidth={1.75} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PickerBody({
  options,
  pinned,
  value,
  onChoose,
  searchLabel,
}: Pick<PickerProps, 'options' | 'pinned' | 'value' | 'searchLabel'> & {
  onChoose: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      options.filter((o) =>
        q === '' ? true : `${o.label} ${o.keywords ?? ''}`.toLowerCase().includes(q),
      ),
    [options, q],
  );
  const pinnedSet = new Set(q === '' ? (pinned ?? []) : []);
  const pinnedOptions = (pinned ?? [])
    .map((v) => matches.find((o) => o.value === v))
    .filter((o): o is PickerOption => o !== undefined && pinnedSet.has(o.value));
  const rest = matches.filter((o) => !pinnedSet.has(o.value));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-picker-option]') ?? []),
    ];
    if (buttons.length === 0) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? buttons[Math.min(index + 1, buttons.length - 1)]
        : buttons[Math.max(index - 1, 0)];
    next?.focus();
  }

  return (
    <div className="flex flex-col gap-2" onKeyDown={onKeyDown}>
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {searchLabel}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-(--icon-md) -translate-y-1/2 text-fg-muted"
          strokeWidth={1.75}
        />
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          placeholder={searchLabel}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          className="w-full min-h-(--touch-min) rounded-md border border-border-input bg-bg-card pl-10 pr-3 type-body-lg text-fg-default placeholder:text-fg-muted"
        />
      </div>
      <div ref={listRef} className="overflow-y-auto">
        <OptionList options={pinnedOptions} value={value} onChoose={onChoose} heading="Pinned" />
        <OptionList
          options={rest}
          value={value}
          onChoose={onChoose}
          {...(pinnedOptions.length > 0 ? { heading: 'All' } : {})}
        />
        {matches.length === 0 && (
          <p role="status" className="px-2 py-4 type-body-sm text-fg-muted">
            Nothing matches “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}

export function Picker(props: PickerProps) {
  const { label, value, options, renderValue, triggerClassName, disabled } = props;
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery(MD_UP);
  const current = options.find((o) => o.value === value);

  function choose(next: string) {
    props.onValueChange(next);
    setOpen(false);
  }

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${label}: ${current?.label ?? props.placeholder ?? 'none'}`}
      aria-haspopup="dialog"
      className={cn(
        'inline-flex min-h-(--touch-min) items-center gap-2 rounded-md border border-border-input bg-bg-card px-3',
        'type-label text-fg-default hover:border-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)',
        triggerClassName,
      )}
    >
      {renderValue(current)}
      <ChevronDown aria-hidden className="size-(--icon-sm) text-fg-muted" strokeWidth={1.75} />
    </button>
  );

  const body = (
    <PickerBody
      options={options}
      value={value}
      onChoose={choose}
      searchLabel={props.searchLabel}
      {...(props.pinned ? { pinned: props.pinned } : {})}
    />
  );

  if (!desktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        trigger={trigger}
        presentation="sheet"
      >
        {body}
      </Dialog>
    );
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          aria-label={label}
          className="z-(--z-overlay) flex max-h-(--popover-max-h) w-(--popover-width) flex-col rounded-lg border border-border-default bg-bg-card p-2 shadow-elev-2"
        >
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
