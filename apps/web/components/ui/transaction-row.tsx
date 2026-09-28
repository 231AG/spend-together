import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatDay } from '@/lib/format-date';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { CategoryIcon } from './category-icon';
import { MoneyText } from './money-text';

// Spec §14.3 TransactionRow. Icon, title, note, signed amount with a type icon. The
// whole row is one button whose accessible name reads as a sentence (§20):
// "minus $12.00, expense, Food, 17 September".

export type RowKind = 'income' | 'expense' | 'contribution';

export interface TransactionRowData {
  kind: RowKind;
  /** Category name, or the goal name for a contribution. */
  title: string;
  note?: string;
  category?: { icon: string; color: string };
  amount: MoneyDisplay;
  /** Base-currency equivalent when `amount` is not in base. */
  base?: MoneyDisplay;
  estimated?: boolean;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Shown for couple-goal contributions by the partner. */
  byName?: string;
  pending?: boolean;
}

export interface TransactionRowProps {
  row: TransactionRowData;
  baseCurrency: string;
  onPress?: () => void;
  href?: string;
  locale?: string;
}

const KIND = {
  income: { Icon: ArrowDownLeft, word: 'income', tone: 'income', iconClass: 'text-income' },
  expense: { Icon: ArrowUpRight, word: 'expense', tone: 'expense', iconClass: 'text-expense' },
  contribution: {
    Icon: PiggyBank,
    word: 'savings contribution',
    tone: 'saving',
    iconClass: 'text-saving',
  },
} as const;

export function accessibleRowName(row: TransactionRowData, baseCurrency: string, locale?: string) {
  const amount = formatMoney(row.amount, { baseCurrency });
  const signed =
    row.kind === 'expense'
      ? `minus ${amount}`
      : row.kind === 'income'
        ? `plus ${amount}`
        : `${amount} saved`;
  const parts = [signed, KIND[row.kind].word, row.title];
  if (row.note) parts.push(row.note);
  if (row.byName) parts.push(`by ${row.byName}`);
  parts.push(formatDay(row.date, locale));
  if (row.pending) parts.push('sync pending');
  return parts.join(', ');
}

export function TransactionRow({ row, baseCurrency, onPress, href, locale }: TransactionRowProps) {
  const kind = KIND[row.kind];
  const TypeIcon = kind.Icon;
  const name = accessibleRowName(row, baseCurrency, locale);
  const content = (
    <>
      {row.category ? (
        <CategoryIcon icon={row.category.icon} color={row.category.color} />
      ) : (
        <span
          aria-hidden
          className="inline-grid size-(--icon-tile) shrink-0 place-items-center rounded-md bg-secondary-50 text-saving"
        >
          <PiggyBank className="size-(--icon-md)" strokeWidth={1.75} />
        </span>
      )}
      <span aria-hidden className="flex min-w-0 flex-1 flex-col">
        <span className="type-label text-fg-default">{row.title}</span>
        <span className="type-body-sm text-fg-muted">
          {[row.note, row.byName && `by ${row.byName}`, formatDay(row.date, locale)]
            .filter(Boolean)
            .join(' · ')}
          {row.pending && ' · Sync pending'}
        </span>
      </span>
      <span aria-hidden className="flex items-start gap-1">
        <MoneyText
          money={row.amount}
          baseCurrency={baseCurrency}
          kind={kind.tone}
          {...(row.base ? { base: row.base } : {})}
          {...(row.estimated ? { estimated: true } : {})}
        />
        <TypeIcon className={cn('mt-0.5 size-(--icon-sm)', kind.iconClass)} strokeWidth={2} />
      </span>
    </>
  );
  const classes = 'flex w-full items-start gap-3 rounded-md px-2 py-3 text-left hover:bg-bg-subtle';
  if (href) {
    return (
      <Link href={href} aria-label={name} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={name} onClick={onPress} className={classes}>
      {content}
    </button>
  );
}
