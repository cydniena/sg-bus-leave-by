'use client';
import { useEffect, useState } from 'react';

/**
 * A ticking clock. Background tabs get timers throttled to roughly once a
 * minute, so nothing may depend on ticks arriving on schedule — every consumer
 * compares absolute timestamps. We also resync the moment the tab is shown
 * again, so a backgrounded tab snaps straight to the truth.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
