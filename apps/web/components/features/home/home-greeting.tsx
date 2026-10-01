'use client';

import { formatDay } from '@/lib/format-date';
import { useMe, useToday } from '@/lib/queries';

// SCR-08 header line: greeting, today's date and the base currency (§11.4).
export function HomeGreeting() {
  const me = useMe();
  const today = useToday();
  if (!me.data || !today) return null;
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${today}T00:00:00Z`),
  );
  return (
    <span>
      Hi {me.data.name} · {weekday} {formatDay(today)} · {me.data.base_currency}
    </span>
  );
}
