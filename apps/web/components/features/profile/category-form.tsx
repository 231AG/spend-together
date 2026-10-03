'use client';

import type { Category } from '@spendtogether/schemas';
import { useId, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { FormNotice } from '@/components/ui/form-message';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';
import {
  CATEGORY_COLOR_CHOICES,
  CATEGORY_ICONS,
  CATEGORY_ICON_CHOICES,
  type CategoryToken,
} from '@/lib/category-visuals';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { useCreateCategory, usePatchCategory } from './use-category-mutations';

// SCR-22 add / edit a custom category: name, icon and colour (F11-02). Every icon and
// colour has a name, so neither is told apart by appearance alone (§18.2). A duplicate
// name within the type is the server's call (FR-23) and is shown on the name field.

export const CATEGORY_NAME_MAX = 40;

const choice = cn(
  'inline-grid size-(--touch-min) cursor-pointer place-items-center rounded-md border border-border-input bg-bg-card text-fg-body',
  'has-[:focus-visible]:focus-ring',
);
const chosen = 'border-action-primary-bg bg-bg-selected text-fg-link';

export function CategoryForm({
  type,
  initial,
  onDone,
}: {
  type: 'income' | 'expense';
  initial?: Category;
  onDone: () => void;
}) {
  const ids = { icons: useId(), colors: useId() };
  const toast = useToast();
  const online = useOnline();
  const create = useCreateCategory();
  const patch = usePatchCategory();
  const mutation = initial ? patch : create;

  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'circle-dashed');
  const [color, setColor] = useState<CategoryToken>(initial?.color ?? 'cat-other');
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const empty = trimmed === '' ? 'Enter a name.' : null;
  const conflict =
    mutation.error instanceof ApiError &&
    (mutation.error.code === 'CONFLICT' || mutation.error.fields['name'] !== undefined)
      ? 'You already have a category with that name.'
      : null;
  const nameError = (touched && empty) || conflict;
  const failed = mutation.isError && !conflict;

  function submit(event: SyntheticEvent) {
    event.preventDefault();
    setTouched(true);
    if (empty || !online) return;
    const done = (message: string) => () => {
      toast({ message });
      onDone();
    };
    if (initial) {
      const body = {
        ...(trimmed !== initial.name ? { name: trimmed } : {}),
        ...(icon !== initial.icon ? { icon } : {}),
        ...(color !== initial.color ? { color } : {}),
      };
      if (Object.keys(body).length === 0) {
        onDone();
        return;
      }
      patch.mutate({ id: initial.id, body }, { onSuccess: done(`${trimmed} saved`) });
    } else {
      create.mutate({ name: trimmed, type, icon, color }, { onSuccess: done(`${trimmed} added`) });
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <span className="type-body-lg text-fg-default">{trimmed || 'New category'}</span>
      </div>
      <Input
        label="Name"
        value={name}
        maxLength={CATEGORY_NAME_MAX}
        autoComplete="off"
        onChange={(e) => {
          setName(e.target.value);
          if (conflict) mutation.reset();
        }}
        onBlur={() => {
          setTouched(true);
        }}
        {...(nameError ? { error: nameError } : {})}
      />

      <fieldset className="flex flex-col gap-2">
        <legend id={ids.icons} className="mb-2 type-label text-fg-default">
          Icon
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ICON_CHOICES.map(({ key, label }) => {
            const Glyph = CATEGORY_ICONS[key];
            if (!Glyph) return null;
            return (
              <label key={key} title={label} className={cn(choice, icon === key && chosen)}>
                <input
                  type="radio"
                  name={`${ids.icons}-choice`}
                  value={key}
                  checked={icon === key}
                  onChange={() => {
                    setIcon(key);
                  }}
                  aria-label={label}
                  className="sr-only"
                />
                <Glyph aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend id={ids.colors} className="mb-2 type-label text-fg-default">
          Colour
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_CHOICES.map(({ token, label }) => (
            <label
              key={token}
              className={cn(
                'inline-flex min-h-(--touch-min) cursor-pointer items-center gap-2 rounded-full border border-border-input bg-bg-card px-3 type-body-sm text-fg-body',
                'has-[:focus-visible]:focus-ring',
                color === token && chosen,
              )}
            >
              <input
                type="radio"
                name={`${ids.colors}-choice`}
                value={token}
                checked={color === token}
                onChange={() => {
                  setColor(token);
                }}
                className="sr-only"
              />
              <span
                aria-hidden
                style={{ '--cat': `var(--${token})` } as CSSProperties}
                className="size-(--icon-sm) rounded-full bg-(--cat)"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {failed && <FormNotice tone="error">We couldn't save that. Try again.</FormNotice>}
      <Button type="submit" loading={mutation.isPending} disabled={!online}>
        {initial ? 'Save' : 'Add category'}
      </Button>
    </form>
  );
}
