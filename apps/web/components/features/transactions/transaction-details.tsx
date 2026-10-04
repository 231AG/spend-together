'use client';

import { NotSavedOffline, waitingForNetwork } from '@/components/features/offline/offline-states';

import { endpoints, type Transaction } from '@spendtogether/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { MoneyText } from '@/components/ui/money-text';
import { useToast } from '@/components/ui/toast';
import { ApiError, apiClient } from '@/lib/api-client';
import { formatDay } from '@/lib/format-date';
import { ESTIMATED_RATE_NOTE, formatMoney } from '@/lib/format-money';
import { queryKeys, useCurrencies } from '@/lib/queries';
import { describeRate, display } from '@/lib/transactions';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { restoreTransaction, useDeleteTransaction } from './use-transaction-mutations';

// SCR-13 (F7-07, F7-09): the full record, with the original amount, the converted one,
// and the rate and date that produced it (W-04). Delete asks first, then offers Undo for
// the 5 seconds the server keeps the window open (ADR-003).

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: () => apiClient.call(endpoints.getTransaction, { params: { id } }),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

/** Loading, missing and failed states shared by details and edit. */
export function TransactionGate({
  id,
  children,
}: {
  id: string;
  children: (t: Transaction) => ReactNode;
}) {
  const query = useTransaction(id);
  if (waitingForNetwork(query)) return <NotSavedOffline what="This entry" />;
  if (query.isPending) return <LoadingSkeleton shape="card" label="Loading transaction" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          title="This transaction isn't here"
          body="It may have been deleted. Your other records are unaffected."
          action={
            <Link href="/activity" className="type-label text-fg-link underline">
              Back to Activity
            </Link>
          }
        />
      );
    }
    return (
      <ErrorState
        message="We couldn't load this transaction."
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  return children(query.data);
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-default py-3 last:border-b-0">
      <dt className="type-body-sm text-fg-muted">{term}</dt>
      <dd className="type-body-lg text-fg-default">{children}</dd>
    </div>
  );
}

export function TransactionDetails({ id }: { id: string }) {
  return <TransactionGate id={id}>{(t) => <Details t={t} />}</TransactionGate>;
}

function Details({ t }: { t: Transaction }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { byCode } = useCurrencies();
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const remove = useDeleteTransaction();
  const online = useOnline();
  const search = params.toString();
  const suffix = search ? `?${search}` : '';

  const base = t.base_amount.currency;
  const foreign = t.amount.currency !== base;
  const amount = display(t.amount, byCode);
  const converted = display(t.base_amount, byCode);
  const TypeIcon = t.type === 'income' ? ArrowDownLeft : ArrowUpRight;
  const word = t.type === 'income' ? 'Income' : 'Expense';

  function confirmDelete() {
    remove.mutate(t.id, {
      onSuccess: () => {
        toast({
          message: `${word} deleted. Totals updated.`,
          action: {
            label: 'Undo',
            altText: `Undo: restore the deleted ${word.toLowerCase()}`,
            onAction: () => {
              restoreTransaction(queryClient, t.id).then(
                (done) => {
                  if (done) toast({ message: `${word} restored.` });
                },
                () => {
                  toast({ message: `We couldn't restore the ${word.toLowerCase()}.` });
                },
              );
            },
          },
        });
        router.replace(`/activity${suffix}`);
      },
    });
  }

  return (
    <article className="flex flex-col gap-6" aria-label={`${word} details`}>
      <div className="flex flex-col items-start gap-2 rounded-lg bg-bg-card p-5 shadow-elev-1">
        <p className="inline-flex items-center gap-1.5 type-label text-fg-body">
          <TypeIcon
            aria-hidden
            className={
              t.type === 'income' ? 'size-(--icon-sm) text-income' : 'size-(--icon-sm) text-expense'
            }
            strokeWidth={2}
          />
          {word}
        </p>
        <MoneyText
          money={amount}
          baseCurrency={base}
          kind={t.type}
          className="items-start type-h2"
          {...(foreign ? { base: converted } : {})}
          {...(foreign && t.fx.estimated ? { estimated: true } : {})}
        />
      </div>

      <dl className="flex flex-col rounded-lg bg-bg-card px-5 shadow-elev-1">
        {foreign && (
          <>
            <Row term="Entered as">{formatMoney(amount, { baseCurrency: base })}</Row>
            <Row term={`In ${base}`}>{formatMoney(converted)}</Row>
            <Row term="Rate used">
              <span className="num">
                {describeRate(t.fx.rate, t.amount.currency, base)}, {formatDay(t.fx.rate_date)}
              </span>
              {t.fx.estimated && (
                <span className="mt-1 flex items-center gap-1 type-body-sm text-fg-muted">
                  <Info aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
                  {ESTIMATED_RATE_NOTE}
                </span>
              )}
            </Row>
          </>
        )}
        <Row term="Category">
          <span className="inline-flex items-center gap-2">
            <CategoryIcon icon={t.category.icon} color={t.category.color} />
            {t.category.name}
          </span>
        </Row>
        <Row term="Date">{formatDay(t.transaction_date, 'en-GB', true)}</Row>
        <Row term="Note">{t.note ?? <span className="text-fg-muted">No note</span>}</Row>
      </dl>

      {remove.isError && (
        <FormNotice tone="error">
          We couldn't delete this. Nothing was changed; try again.
        </FormNotice>
      )}
      {/* §19.1: a synced record can't change offline; say so rather than fail later. */}
      {!online ? (
        <div className="flex flex-col gap-3">
          <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>
          <div className="flex flex-wrap gap-3">
            <Button disabled>Edit</Button>
            <Button variant="tertiary" disabled>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/activity/${t.id}/edit${suffix}`}
            className="inline-flex min-h-(--touch-min) items-center rounded-md bg-action-primary-bg px-5 type-label text-action-primary-fg hover:bg-action-primary-bg-hover"
          >
            Edit
          </Link>
          <ConfirmationDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={`Delete this ${word.toLowerCase()}?`}
            consequences="Your totals and insights will be recalculated. You can undo for 5 seconds."
            confirmLabel="Delete"
            destructive
            onConfirm={confirmDelete}
            trigger={
              <Button variant="tertiary" loading={remove.isPending}>
                Delete
              </Button>
            }
          />
        </div>
      )}
    </article>
  );
}
