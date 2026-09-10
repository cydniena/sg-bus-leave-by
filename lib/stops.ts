import type { BusStop } from './types';

/**
 * The bus stop list is ~480 KB, so it is a static asset rather than part of the
 * JS bundle, and it is only pulled when someone is actually picking a stop.
 * The watch screen never needs it.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

let cache: BusStop[] | null = null;
let inflight: Promise<BusStop[]> | null = null;

export class StopsError extends Error {}

export async function loadStops(): Promise<BusStop[]> {
  if (cache) return cache;
  // Coalesce concurrent callers onto one request.
  if (inflight) return inflight;

  inflight = (async () => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/bus-stops.json`);
    } catch {
      throw new StopsError('Could not load the bus stop list.');
    }
    if (!res.ok) throw new StopsError(`Bus stop list returned ${res.status}`);

    cache = (await res.json()) as BusStop[];
    return cache;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
