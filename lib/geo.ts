import type { BusStop } from './types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export type NearbyStop = BusStop & { distanceM: number };

/** Stops within `radiusM` of a point, nearest first. */
export function nearbyStops(
  origin: { lat: number; lng: number },
  stops: BusStop[],
  radiusM = 800,
  limit = 12,
): NearbyStop[] {
  return stops
    .map((s) => ({ ...s, distanceM: Math.round(haversine(origin, s)) }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}
