import type { Place } from './types';

/**
 * Address and postal-code lookup via OneMap's public search.
 *
 * The response carries a nag about a missing API token, but results come back
 * regardless — so no registration is needed. There is a short-window burst
 * limit: a few calls in the same second get a 429, while anything at human
 * typing speed is fine. We cache results and retry a 429 once, which covers
 * realistic use. If the limit ever tightens, registering for a free OneMap
 * token and sending it as an `Authorization` header is the one change needed.
 */
const ENDPOINT = 'https://www.onemap.gov.sg/api/common/elastic/search';

export class GeocodeError extends Error {}

type RawResult = {
  SEARCHVAL: string;
  ADDRESS?: string;
  POSTAL?: string;
  LATITUDE: string;
  LONGITUDE: string;
};

/** Addresses don't move, so results are worth keeping. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; places: Place[] }>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parse(body: { results?: RawResult[] }): Place[] {
  return (body.results ?? [])
    .map((r) => ({
      name: r.ADDRESS && r.ADDRESS !== 'NIL' ? r.ADDRESS : r.SEARCHVAL,
      lat: Number(r.LATITUDE),
      lng: Number(r.LONGITUDE),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** Geocode a building name, street address or 6-digit postal code. */
export async function search(query: string): Promise<Place[]> {
  const key = query.trim().toLowerCase();

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.places;

  const qs = new URLSearchParams({
    searchVal: query,
    returnGeom: 'Y',
    getAddrDetails: 'Y',
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}?${qs}`, { cache: 'no-store' });
    } catch {
      throw new GeocodeError('Could not reach the address lookup service.');
    }

    if (res.status === 429) {
      if (attempt === 0) {
        await sleep(1200);
        continue;
      }
      throw new GeocodeError('Address lookup is rate-limited right now — try again in a moment.');
    }
    if (!res.ok) throw new GeocodeError(`Address lookup returned ${res.status}`);

    const places = parse((await res.json()) as { results?: RawResult[] });

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), places });
    return places;
  }

  throw new GeocodeError('Address lookup failed');
}
