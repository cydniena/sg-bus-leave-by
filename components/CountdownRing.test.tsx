import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Hero } from './DepartureCard';
import { planDeparture, urgencyOf } from '@/lib/plan';
import type { Arrival } from '@/lib/types';

afterEach(cleanup);

const at = (hhmm: string): Arrival => ({
  at: new Date(`2026-09-10T${hhmm}:00+08:00`),
  monitored: true,
  load: 'SEA',
  type: 'SD',
});
/** Accepts HH:MM or HH:MM:SS. */
const sgt = (t: string) =>
  new Date(`2026-09-10T${t.length === 5 ? `${t}:00` : t}+08:00`);

const LEAD = 300;

/** Rendered ring offset at a given moment. Larger offset = emptier ring. */
function ringOffsetAt(nowHHMM: string) {
  const now = sgt(nowHHMM);
  const plan = planDeparture({
    now,
    arrivals: [at('18:01')],
    walkSec: 600,
    bufferSec: 120,
  });
  const urgency = urgencyOf(plan.target!, now, LEAD);
  const { container } = render(
    <Hero option={plan.target!} urgency={urgency} serviceNo="15" now={now} leadSec={LEAD} />,
  );
  const bar = container.querySelector('.ring-bar') as SVGCircleElement;
  const offset = Number(bar.getAttribute('stroke-dashoffset'));
  const dash = Number(bar.getAttribute('stroke-dasharray'));
  cleanup();
  return { offset, dash, urgency };
}

describe('countdown ring', () => {
  // leaveBy 17:49, lastChance 17:51, window = 5*3 + 2 = 17 min back from 17:51.
  it('depletes monotonically as the deadline approaches', () => {
    const marks = ['17:30', '17:40', '17:45', '17:49', '17:50'];
    const offsets = marks.map((m) => ringOffsetAt(m).offset);

    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    }
  });

  it('does not jump back to full when crossing into the buffer', () => {
    // 17:49 is the comfortable deadline; 17:49:30 is inside the buffer.
    const before = ringOffsetAt('17:49').offset;
    const after = ringOffsetAt('17:50').offset;
    expect(after).toBeGreaterThan(before);
  });

  it('sits full well before the window opens', () => {
    const early = ringOffsetAt('17:00');
    expect(early.offset).toBe(0); // clamped full
  });

  it('is all but empty a second before the point of no return', () => {
    // lastChance is 17:51 exactly; at 17:51 the bus is already uncatchable.
    const last = ringOffsetAt('17:50:59');
    expect(last.offset / last.dash).toBeGreaterThan(0.99);
  });

  it('carries the urgency class through to the ring for colour', () => {
    const now = sgt('17:45');
    const plan = planDeparture({
      now,
      arrivals: [at('18:01')],
      walkSec: 600,
      bufferSec: 120,
    });
    const { container } = render(
      <Hero option={plan.target!} urgency="soon" serviceNo="15" now={now} leadSec={LEAD} />,
    );
    expect(container.querySelector('.ring-soon')).not.toBeNull();
  });
});
