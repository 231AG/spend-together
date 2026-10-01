import Link from 'next/link';
import type { HomeSummaryResponse } from '@spendtogether/schemas';
import { CategoryIcon } from '@/components/ui/category-icon';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { categoryActivityHref, pctLabel } from '@/lib/insights';

// F8-03 (SCR-08, C-01 "Home: list only"): the top five expense categories with amount,
// share (F-09) and a bar, each opening Activity filtered by that category and period.

export interface CategoryLook {
  icon: string;
  color: string;
}

export function SpendingPreview({
  summary,
  money,
  looks,
}: {
  summary: HomeSummaryResponse;
  money: (amountMinor: number) => MoneyDisplay;
  looks: ReadonlyMap<string, CategoryLook>;
}) {
  const { categories, period } = summary;
  return (
    <section
      aria-labelledby="spending-title"
      className="flex flex-col gap-3 rounded-xl bg-bg-card p-5 shadow-elev-1"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="spending-title" className="type-h3 text-fg-default">
          Where your money went
        </h2>
        <Link href="/insights" className="type-label text-fg-link underline">
          Insights
        </Link>
      </div>
      {categories.length === 0 ? (
        <p className="type-body-sm text-fg-muted">No spending recorded in this period.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {categories.map((c) => {
            const look = looks.get(c.id) ?? { icon: 'circle-dashed', color: 'cat-other' };
            const amount = formatMoney(money(c.amount));
            const pct = pctLabel(c.pct);
            return (
              <li key={c.id}>
                <Link
                  href={categoryActivityHref(c.id, period.start, period.end)}
                  aria-label={`${c.name}: ${amount}, ${pct} of spending. Show these expenses`}
                  className="flex flex-col gap-1.5 rounded-md px-2 py-2 hover:bg-bg-subtle"
                >
                  <span aria-hidden className="flex items-center gap-3">
                    <CategoryIcon icon={look.icon} color={look.color} />
                    <span className="flex-1 type-label text-fg-default">{c.name}</span>
                    <span className="num type-label text-fg-default">{amount}</span>
                    <span className="num w-14 text-right type-body-sm text-fg-muted">{pct}</span>
                  </span>
                  <span
                    aria-hidden
                    className="block h-(--progress-h) w-full rounded-full bg-progress-track"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${String(Math.min(c.pct, 100))}%`,
                        background: `var(--${look.color})`,
                      }}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
