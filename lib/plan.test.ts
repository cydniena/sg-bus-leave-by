import { describe, it, expect } from 'vitest';
import { planDeparture, urgencyOf } from './plan';
import { formatTime, plannedDepartureAt, formatDelta } from './format';
import type { Arrival } from './types';

/** Build an arrival from a Singapore wall-clock time on 2026-09-10. */
const at = (hhmm: string, monitored = true): Arrival => ({
  at: new Date(`2026-09-10T${hhmm}:00+08:00`),
  monitored,
  load: 'SEA',
  type: 'SD',
});

const sgt = (hhmm: string) => new Date(`2026-09-10T${hhmm}:00+08:00`);

const WALK_10_MIN = 600;
const BUFFER_2_MIN = 120;

describe('planDeparture — the office scenario', () => {
  // 17:45. Walk is 10 min. Buses at 18:01 / 18:15 / 18:28. Wanted to leave 18:00.
  const plan = planDeparture({
    now: sgt('17:45'),
    arrivals: [at('18:01'), at('18:15'), at('18:28')],
    walkSec: WALK_10_MIN,
    bufferSec: BUFFER_2_MIN,
    plannedDeparture: sgt('18:00'),
  });

  it('targets the 18:01 bus', () => {
    expect(plan.target).not.toBeNull();
    expect(formatTime(plan.target!.arrival)).toBe('18:01');
  });

  it('says leave by 17:49 — buffer included', () => {
    expect(formatTime(plan.target!.leaveBy)).toBe('17:49');
    // Without the safety margin you have until 17:51.
    expect(formatTime(plan.target!.lastChance)).toBe('17:51');
  });

  it('flags that catching it means leaving 11 min earlier than planned', () => {
    expect(plan.target!.deltaSec).toBe(-11 * 60);
    expect(formatDelta(plan.target!.deltaSec!)).toBe('11 min earlier than planned');
  });

  it('offers the 18:15 as extra working time instead', () => {
    const second = plan.options[1];
    expect(formatTime(second.leaveBy)).toBe('18:03');
    expect(second.deltaSec).toBe(3 * 60);
    expect(formatDelta(second.deltaSec!)).toBe('+3 min of extra time');
  });

  it('lists all three buses with only the first as target', () => {
    expect(plan.options).toHaveLength(3);
    expect(plan.options.map((o) => o.isTarget)).toEqual([true, false, false]);
  });
});

describe('planDeparture — edge cases', () => {
  it('skips buses already unreachable and targets the next one', () => {
    // 17:55: the 18:01 needs departure by 17:51, that moment has passed.
    const plan = planDeparture({
      now: sgt('17:55'),
      arrivals: [at('18:01'), at('18:15')],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.options[0].catchable).toBe(false);
    expect(formatTime(plan.target!.arrival)).toBe('18:15');
  });

  it('returns no target when every bus is out of reach', () => {
    const plan = planDeparture({
      now: sgt('18:20'),
      arrivals: [at('18:01'), at('18:15')],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.target).toBeNull();
    expect(plan.options.every((o) => !o.catchable)).toBe(true);
  });

  it('handles an empty arrival list (service finished)', () => {
    const plan = planDeparture({
      now: sgt('23:55'),
      arrivals: [],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.target).toBeNull();
    expect(plan.options).toEqual([]);
  });

  it('is still catchable inside the buffer, before last chance', () => {
    // 17:50 is past leaveBy (17:49) but before lastChance (17:51).
    const plan = planDeparture({
      now: sgt('17:50'),
      arrivals: [at('18:01')],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.target).not.toBeNull();
    expect(plan.target!.leaveInSec).toBeLessThan(0);
  });

  it('carries the monitored flag through for the estimate badge', () => {
    const plan = planDeparture({
      now: sgt('17:00'),
      arrivals: [at('18:01', false)],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.target!.monitored).toBe(false);
  });

  it('sorts out-of-order arrivals', () => {
    const plan = planDeparture({
      now: sgt('17:00'),
      arrivals: [at('18:15'), at('18:01'), at('18:28')],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.options.map((o) => formatTime(o.arrival))).toEqual([
      '18:01',
      '18:15',
      '18:28',
    ]);
  });

  it('drops unparseable arrival times', () => {
    const bad: Arrival = { at: new Date('nonsense'), monitored: true, load: null, type: null };
    const plan = planDeparture({
      now: sgt('17:00'),
      arrivals: [bad, at('18:01')],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.options).toHaveLength(1);
  });

  it('leaves deltaSec null when no departure time is planned', () => {
    const plan = planDeparture({
      now: sgt('17:00'),
      arrivals: [at('18:01')],
      walkSec: WALK_10_MIN,
      bufferSec: BUFFER_2_MIN,
    });
    expect(plan.target!.deltaSec).toBeNull();
  });
});

describe('urgencyOf', () => {
  const plan = planDeparture({
    now: sgt('17:00'),
    arrivals: [at('18:01')],
    walkSec: WALK_10_MIN,
    bufferSec: BUFFER_2_MIN,
  });
  const opt = plan.options[0]; // leaveBy 17:49, lastChance 17:51
  const LEAD = 300; // 5 min

  it('is ok well ahead of the deadline', () => {
    expect(urgencyOf(opt, sgt('17:40'), LEAD)).toBe('ok');
  });

  it('turns soon inside the 5 min lead', () => {
    expect(urgencyOf(opt, sgt('17:45'), LEAD)).toBe('soon');
  });

  it('turns now once past leaveBy, while the buffer lasts', () => {
    expect(urgencyOf(opt, sgt('17:50'), LEAD)).toBe('now');
  });

  it('is gone past last chance', () => {
    expect(urgencyOf(opt, sgt('17:52'), LEAD)).toBe('gone');
  });
});

describe('timezone safety', () => {
  it('formats in Singapore time even though the test process is not', () => {
    // 10:01 UTC is 18:01 SGT. A naive local format under TZ=UTC would say 10:01.
    expect(formatTime(new Date('2026-09-10T10:01:00Z'))).toBe('18:01');
  });

  it('builds planned departure on the Singapore calendar date', () => {
    // 23:00 UTC on the 9th is already 07:00 on the 10th in Singapore.
    const now = new Date('2026-09-09T23:00:00Z');
    const planned = plannedDepartureAt(18 * 60, now);
    expect(planned.toISOString()).toBe('2026-09-10T10:00:00.000Z');
    expect(formatTime(planned)).toBe('18:00');
  });
});
