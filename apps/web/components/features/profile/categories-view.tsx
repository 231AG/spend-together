'use client';

import type { Category } from '@spendtogether/schemas';
import { Archive, ArchiveRestore, Lock, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { IconButton } from '@/components/ui/icon-button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { CategoryForm } from './category-form';
import { usePatchCategory, useSettingsCategories } from './use-category-mutations';

// SCR-22 Categories (F11-02, FR-23, BR-17). Defaults carry a lock and no edit control.
// Custom categories are edited or archived, never deleted: archiving hides one from
// pickers while every entry that used it keeps it. Archived ones can be restored.

const TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

const list = 'overflow-hidden rounded-lg border border-border-default bg-bg-card';
const row = 'flex min-h-14 items-center gap-3 px-4 py-2';

type Editing = { mode: 'add' } | { mode: 'edit'; category: Category } | null;

export function CategoriesView() {
  const categories = useSettingsCategories();
  const online = useOnline();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [editing, setEditing] = useState<Editing>(null);

  if (categories.isPending) {
    return <LoadingSkeleton shape="row" count={6} label="Loading categories" />;
  }
  if (categories.isError) {
    return (
      <ErrorState
        message="We couldn't load your categories."
        onRetry={() => void categories.refetch()}
        retrying={categories.isFetching}
      />
    );
  }

  const ofType = categories.data.filter((c) => c.type === type);
  const defaults = ofType.filter((c) => c.is_default);
  const custom = ofType.filter((c) => !c.is_default && c.archived_at === null);
  const archived = ofType.filter((c) => !c.is_default && c.archived_at !== null);
  const typeLabel = type === 'expense' ? 'expense' : 'income';

  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col gap-6">
      <SegmentedControl
        label="Category type"
        options={TYPES}
        value={type}
        onValueChange={setType}
        className="self-start"
      />
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}

      <section aria-labelledby="custom-title" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="custom-title" className="type-h3 text-fg-default">
            Your categories
          </h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={!online}
            onClick={() => {
              setEditing({ mode: 'add' });
            }}
          >
            <Plus aria-hidden className="size-(--icon-sm)" strokeWidth={2} />
            Add category
          </Button>
        </div>
        {custom.length === 0 ? (
          <p className="type-body-lg text-fg-body">
            No {typeLabel} categories of your own yet. Add one when the defaults don&apos;t fit.
          </p>
        ) : (
          <ul className={`${list} divide-y divide-border-default`}>
            {custom.map((c) => (
              <CustomRow
                key={c.id}
                category={c}
                onEdit={() => {
                  setEditing({ mode: 'edit', category: c });
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="default-title" className="flex flex-col gap-2">
        <h2 id="default-title" className="type-h3 text-fg-default">
          Default categories
        </h2>
        <p className="type-body-sm text-fg-muted">
          These come with SpendTogether and can&apos;t be changed.
        </p>
        <ul className={`${list} divide-y divide-border-default`}>
          {defaults.map((c) => (
            <li key={c.id} className={row}>
              <CategoryIcon icon={c.icon} color={c.color} />
              <span className="flex-1 type-body-lg text-fg-default">{c.name}</span>
              <Lock aria-hidden className="size-(--icon-sm) text-fg-muted" strokeWidth={1.75} />
              <span className="sr-only">Default, locked</span>
            </li>
          ))}
        </ul>
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="archived-title" className="flex flex-col gap-2">
          <h2 id="archived-title" className="type-h3 text-fg-default">
            Archived
          </h2>
          <p className="type-body-sm text-fg-muted">
            Hidden when you add an entry. Past entries still show them.
          </p>
          <ul className={`${list} divide-y divide-border-default`}>
            {archived.map((c) => (
              <ArchivedRow key={c.id} category={c} />
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={
          editing?.mode === 'edit' ? `Edit ${editing.category.name}` : `Add ${typeLabel} category`
        }
      >
        {editing && (
          <CategoryForm
            type={type}
            {...(editing.mode === 'edit' ? { initial: editing.category } : {})}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function CustomRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const online = useOnline();
  const toast = useToast();
  const patch = usePatchCategory();
  return (
    <li className={row}>
      <CategoryIcon icon={category.icon} color={category.color} />
      <span className="min-w-0 flex-1 break-words type-body-lg text-fg-default">
        {category.name}
        {patch.isError && (
          <span className="block type-body-sm text-fg-error">
            We couldn&apos;t archive it. Try again.
          </span>
        )}
      </span>
      <IconButton
        label={`Edit ${category.name}`}
        icon={<Pencil className="size-(--icon-sm)" strokeWidth={1.75} />}
        disabled={!online || patch.isPending}
        onClick={onEdit}
      />
      <IconButton
        label={`Archive ${category.name}`}
        icon={<Archive className="size-(--icon-sm)" strokeWidth={1.75} />}
        disabled={!online || patch.isPending}
        onClick={() => {
          patch.mutate(
            { id: category.id, body: { archived: true } },
            {
              onSuccess: () => {
                toast({
                  message: `${category.name} archived. Past entries keep it.`,
                });
              },
            },
          );
        }}
      />
    </li>
  );
}

function ArchivedRow({ category }: { category: Category }) {
  const online = useOnline();
  const toast = useToast();
  const patch = usePatchCategory();
  const clash = patch.error instanceof ApiError && patch.error.code === 'CONFLICT';
  return (
    <li className={row}>
      <CategoryIcon icon={category.icon} color={category.color} />
      <span className="min-w-0 flex-1 break-words type-body-lg text-fg-body">
        {category.name}
        {patch.isError && (
          <span className="block type-body-sm text-fg-error">
            {clash
              ? 'You already have a category with that name. Rename that one first.'
              : "We couldn't restore it. Try again."}
          </span>
        )}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        loading={patch.isPending}
        disabled={!online}
        aria-label={`Restore ${category.name}`}
        onClick={() => {
          patch.mutate(
            { id: category.id, body: { archived: false } },
            {
              onSuccess: () => {
                toast({ message: `${category.name} restored` });
              },
            },
          );
        }}
      >
        <ArchiveRestore aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
        Restore
      </Button>
    </li>
  );
}
