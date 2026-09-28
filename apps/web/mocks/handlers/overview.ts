import { activityItems, homeSummary, insights } from '../compute';
import { db } from '../db';
import { invalid } from '../errors';
import { route } from '../http';
import { page } from '../paging';

// Home summary, insights and the merged activity feed (§10.4, §16.3).

export const overviewHandlers = [
  route('getHomeSummary', ({ user, query }) => homeSummary(db, user, query.period)),

  route('insightsDaily', ({ user, query }) => insights(db, user, 'daily', query.date)),
  route('insightsWeekly', ({ user, query }) => insights(db, user, 'weekly', query.date)),
  route('insightsMonthly', ({ user, query }) => insights(db, user, 'monthly', query.date)),

  route('getActivity', ({ user, query }) => {
    if (query.from && query.to && query.from > query.to)
      throw invalid('from', 'Start date must be before the end date.');
    const q = query.q?.toLowerCase();
    const items = activityItems(db, user).filter(({ item, date }) => {
      if (query.from && date < query.from) return false;
      if (query.to && date > query.to) return false;
      if (item.kind === 'contribution') {
        if (query.kind && query.kind !== 'contribution') return false;
        if (query.category_id) return false;
        if (q && !`${item.note ?? ''} ${item.goal.name}`.toLowerCase().includes(q)) return false;
        return true;
      }
      if (query.kind && query.kind !== item.type) return false;
      if (query.category_id && item.category.id !== query.category_id) return false;
      if (q && !`${item.note ?? ''} ${item.category.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const result = page(items, query.limit, query.cursor);
    return { data: result.data.map((a) => a.item), next_cursor: result.next_cursor };
  }),
];
