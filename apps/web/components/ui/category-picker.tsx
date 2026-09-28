'use client';

import { CategoryIcon } from './category-icon';
import { Picker, type PickerOption } from './picker';

// Spec §14.3 CategoryPicker: icon + name, search, recent first; sheet on mobile, popover
// from md. Only categories of the transaction's type are offered.

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}

export interface CategoryPickerProps {
  type: 'income' | 'expense';
  value: string | null;
  onValueChange: (id: string) => void;
  categories: CategoryOption[];
  recent?: string[];
  label?: string;
  disabled?: boolean;
}

export function CategoryPicker({
  type,
  value,
  onValueChange,
  categories,
  recent = [],
  label = 'Category',
  disabled,
}: CategoryPickerProps) {
  const ofType = categories.filter((c) => c.type === type);
  const options: PickerOption[] = ofType.map((c) => ({
    value: c.id,
    label: c.name,
    leading: <CategoryIcon icon={c.icon} color={c.color} />,
  }));
  return (
    <Picker
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      pinned={recent}
      searchLabel="Search categories"
      placeholder="Choose a category"
      triggerClassName="w-full justify-between"
      renderValue={(option) =>
        option ? (
          <span className="flex flex-1 items-center gap-2">
            {option.leading}
            {option.label}
          </span>
        ) : (
          <span className="flex-1 text-left type-body-lg text-fg-muted">Choose a category</span>
        )
      }
      {...(disabled !== undefined ? { disabled } : {})}
    />
  );
}
