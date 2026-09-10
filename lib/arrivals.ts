import type { Arrival, Load } from './types';

/**
 * Live bus arrivals via arrivelah — a community-run proxy in front of LTA
 * DataMall, so this needs no API key and no registration.
 *
 * Being someone else's free service, we poll politely: only while the tab is
 * visible, and backing off when nothing is imminent (see hooks/useArrivals.ts).
 */
const ENDPOINT = 'https://arrivelah2.busrouter.sg/';

export class ArrivalsError extends Error {}

type RawBus = {
  time?: string;
  monitored?: number;
  load?: string;
  type?: string;
} | null;

type RawService = {
  no: string;
  operator?: string;
  next?: RawBus;
  next2?: RawBus;
  next3?: RawBus;
};

export type ServiceArrivals = {
  serviceNo: string;
  operator: string | null;
  arrivals: Arrival[];
};

const LOADS = new Set(['SEA', 'SDA', 'LSD']);

function toArrival(raw: RawBus | undefined): Arrival | null {
  if (!raw?.time) return null;
  const at = new Date(raw.time);
  if (!Number.isFinite(at.getTime())) return null;
  return {
    at,
    // monitored 0 means the time came from the timetable, not a tracked bus.
    monitored: raw.monitored === 1,
    load: raw.load && LOADS.has(raw.load) ? (raw.load as Load) : null,
    type: raw.type ?? null,
  };
}

function normalize(service: RawService): ServiceArrivals {
  return {
    serviceNo: service.no,
    operator: service.operator ?? null,
    arrivals: [service.next, service.next2, service.next3]
      .map(toArrival)
      .filter((a): a is Arrival => a !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime()),
  };
}

/**
 * Arrivals at a stop. Omit `serviceNo` for every service there.
 * Only ever three buses ahead per service — that's LTA's ceiling.
 */
export async function fetchArrivals(
  stopCode: string,
  serviceNo?: string,
): Promise<ServiceArrivals[]> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(stopCode)}`, {
      cache: 'no-store',
    });
  } catch {
    throw new ArrivalsError('Could not reach the arrivals service. Check your connection.');
  }

  if (!res.ok) {
    throw new ArrivalsError(`Arrivals service returned ${res.status} for stop ${stopCode}`);
  }

  const body = (await res.json()) as { services?: RawService[] };
  const all = (body.services ?? []).map(normalize);
  return serviceNo ? all.filter((s) => s.serviceNo === serviceNo) : all;
}
