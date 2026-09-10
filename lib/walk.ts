import { haversine } from './geo';

/**
 * Estimated walking time between two points.
 *
 * There is no free, keyless pedestrian router worth using — OSRM's public
 * server silently answers `foot` requests with car timings (38 km/h), which
 * would be worse than no estimate at all. So this is straight-line distance
 * with a detour allowance, which lands close enough for a short walk to a bus
 * stop and is meant to be adjusted once you've walked the route.
 */

/** Street network vs. crow-flies. Denser grids trend lower, ~1.2-1.5 is typical. */
const DETOUR_FACTOR = 1.35;

/** Unhurried pace, ~4.5 km/h. */
const WALK_SPEED_MPS = 1.25;

export type WalkEstimate = {
  seconds: number;
  metres: number;
  estimated: true;
};

export function estimateWalk(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): WalkEstimate {
  const straight = haversine(from, to);
  const metres = Math.round(straight * DETOUR_FACTOR);
  return {
    seconds: Math.round(metres / WALK_SPEED_MPS),
    metres,
    estimated: true,
  };
}
