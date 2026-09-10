import type { Arrival, Load } from './types';

/**
 * How urgent the target departure is.
 *   ok   - plenty of time
 *   soon - inside the warning lead, should start wrapping up
 *   now  - past the comfortable deadline, eating into the safety buffer
 *   gone - can no longer be caught
 */
export type Urgency = 'ok' | 'soon' | 'now' | 'gone';

export type Option = {
  arrival: Date;
  /** Comfortable deadline: arrival - walk - buffer. */
  leaveBy: Date;
  /** Absolute deadline: arrival - walk. Past this the bus is unreachable. */
  lastChance: Date;
  /** now < lastChance */
  catchable: boolean;
  /** Seconds until leaveBy. Negative once inside the buffer. */
  leaveInSec: number;
  /**
   * leaveBy - plannedDeparture, in seconds. null when no planned time is set.
   * Negative => must leave this much EARLIER than planned.
   * Positive => this much extra time before leaving.
   */
  deltaSec: number | null;
  /** First catchable option. */
  isTarget: boolean;
  monitored: boolean;
  load: Load;
  type: string | null;
};

export type Plan = {
  /** First option still catchable, or null if none are. */
  target: Option | null;
  /** All arrivals, catchable or not, in time order. */
  options: Option[];
};

export type PlanArgs = {
  now: Date;
  arrivals: Arrival[];
  walkSec: number;
  bufferSec: number;
  /** A soft preference, not a filter — options before it are still shown. */
  plannedDeparture?: Date | null;
};

/**
 * Back-computes, for each upcoming bus, the latest moment you can walk out the
 * door and still catch it.
 *
 * Pure: no clock, no network. `now` is always injected.
 */
export function planDeparture({
  now,
  arrivals,
  walkSec,
  bufferSec,
  plannedDeparture,
}: PlanArgs): Plan {
  const nowMs = now.getTime();
  const planned = plannedDeparture ? plannedDeparture.getTime() : null;

  const sorted = [...arrivals]
    .filter((a) => Number.isFinite(a.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  let targetTaken = false;

  const options: Option[] = sorted.map((a) => {
    const arrivalMs = a.at.getTime();
    const lastChanceMs = arrivalMs - walkSec * 1000;
    const leaveByMs = lastChanceMs - bufferSec * 1000;
    const catchable = nowMs < lastChanceMs;

    // The first catchable option is the one we actively track.
    const isTarget = catchable && !targetTaken;
    if (isTarget) targetTaken = true;

    return {
      arrival: new Date(arrivalMs),
      leaveBy: new Date(leaveByMs),
      lastChance: new Date(lastChanceMs),
      catchable,
      leaveInSec: Math.round((leaveByMs - nowMs) / 1000),
      deltaSec: planned === null ? null : Math.round((leaveByMs - planned) / 1000),
      isTarget,
      monitored: a.monitored,
      load: a.load,
      type: a.type,
    };
  });

  return { target: options.find((o) => o.isTarget) ?? null, options };
}

/** Urgency of a single option at a given moment. */
export function urgencyOf(option: Option, now: Date, leadSec: number): Urgency {
  const nowMs = now.getTime();
  if (nowMs >= option.lastChance.getTime()) return 'gone';
  if (nowMs >= option.leaveBy.getTime()) return 'now';
  if (nowMs >= option.leaveBy.getTime() - leadSec * 1000) return 'soon';
  return 'ok';
}
