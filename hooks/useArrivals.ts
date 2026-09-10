'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Arrival } from '@/lib/types';
import type { WireService } from '@/lib/api';

const FAST_MS = 20_000; // LTA refreshes about every 20s
const SLOW_MS = 180_000; // nothing imminent — back off
const IMMINENT_MS = 45 * 60 * 1000;

export type ArrivalsState = {
  arrivals: Arrival[];
  error: string | null;
  loading: boolean;
  fetchedAt: Date | null;
  refresh: () => void;
};

/**
 * Polls a single service at a single stop.
 *
 * Only runs while the tab is visible, and backs off when the next bus is far
 * away — that keeps us well inside DataMall's rate limits instead of hammering
 * it all day for a trip you take once.
 */
export function useArrivals(stopCode: string | null, serviceNo: string | null): ArrivalsState {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  const fetchOnce = useCallback(async (): Promise<Arrival[]> => {
    if (!stopCode || !serviceNo) return [];
    setLoading(true);
    try {
      const res = await fetch(
        `/api/arrivals?stop=${encodeURIComponent(stopCode)}&service=${encodeURIComponent(serviceNo)}`,
      );
      const body = (await res.json()) as { services?: WireService[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);

      const service = body.services?.find((s) => s.serviceNo === serviceNo) ?? body.services?.[0];
      const next: Arrival[] = (service?.arrivals ?? []).map((a) => ({
        at: new Date(a.at),
        monitored: a.monitored,
        load: a.load as Arrival['load'],
        type: a.type,
      }));

      if (!cancelled.current) {
        setArrivals(next);
        setError(null);
        setFetchedAt(new Date());
      }
      return next;
    } catch (err) {
      if (!cancelled.current) setError((err as Error).message);
      return [];
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, [stopCode, serviceNo]);

  useEffect(() => {
    cancelled.current = false;
    if (!stopCode || !serviceNo) return;

    const schedule = (next: Arrival[]) => {
      const soonest = next[0]?.at.getTime();
      const imminent = soonest !== undefined && soonest - Date.now() < IMMINENT_MS;
      timer.current = setTimeout(run, imminent ? FAST_MS : SLOW_MS);
    };

    const run = async () => {
      if (cancelled.current) return;
      if (document.visibilityState !== 'visible') {
        // Paused: re-armed by the visibilitychange listener below.
        return;
      }
      schedule(await fetchOnce());
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (timer.current) clearTimeout(timer.current);
        void run();
      }
    };

    void run();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled.current = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [stopCode, serviceNo, fetchOnce]);

  return { arrivals, error, loading, fetchedAt, refresh: () => void fetchOnce() };
}
