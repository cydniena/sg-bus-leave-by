'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Trip } from '@/lib/types';

const KEY = 'busapp.trips.v1';

function load(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

/** Trips live per-device in localStorage; `shareLink` moves one to your phone. */
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTrips(load());
    setReady(true);
  }, []);

  const persist = useCallback((next: Trip[]) => {
    setTrips(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode — the session still works, it just won't be remembered */
    }
  }, []);

  const save = useCallback(
    (trip: Trip) => {
      const existing = trips.findIndex((t) => t.id === trip.id);
      const next = [...trips];
      if (existing >= 0) next[existing] = trip;
      else next.push(trip);
      persist(next);
    },
    [trips, persist],
  );

  const remove = useCallback(
    (id: string) => persist(trips.filter((t) => t.id !== id)),
    [trips, persist],
  );

  return { trips, ready, save, remove };
}

/** Encode a trip into a URL so it can be opened on another device. */
export function shareLink(trip: Trip): string {
  const data = btoa(encodeURIComponent(JSON.stringify(trip)));
  return `${location.origin}${location.pathname}#trip=${data}`;
}

/** Pull a trip out of the current URL hash, if one is there. */
export function tripFromHash(): Trip | null {
  const m = location.hash.match(/trip=([^&]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(m[1]))) as Trip;
  } catch {
    return null;
  }
}
