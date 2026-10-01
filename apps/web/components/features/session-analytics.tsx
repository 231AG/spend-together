'use client';

import { useEffect } from 'react';
import { trackDailySession } from '@/lib/analytics';
import { useMe, useToday } from '@/lib/queries';

// §16.4 `session_start`, once per local day, from inside the signed-in app.
export function SessionAnalytics() {
  const today = useToday();
  const userId = useMe().data?.id;
  useEffect(() => {
    if (!today || !userId) return;
    let storage: Storage | null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    trackDailySession(today, userId, storage);
  }, [today, userId]);
  return null;
}
