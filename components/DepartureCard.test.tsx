import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Hero, DepartureRow } from './DepartureCard';
import { Journey } from './Journey';
import { planDeparture, urgencyOf } from '@/lib/plan';
import type { Arrival } from '@/lib/types';

afterEach(cleanup);

const at = (hhmm: string, monitored = true): Arrival => ({
  at: new Date(`2026-09-10T${hhmm}:00+08:00`),
  monitored,
  load: 'SEA',
  type: 'SD',
});
const sgt = (hhmm: string) => new Date(`2026-09-10T${hhmm}:00+08:00`);

const LEAD = 300; // 5 min

/** The office scenario: 10 min walk, 2 min buffer, buses 18:01 / 18:15 / 18:28. */
function scenarioAt(nowHHMM: string) {
  const now = sgt(nowHHMM);
  const plan = planDeparture({
    now,
    arrivals: [at('18:01'), at('18:15'), at('18:28')],
    walkSec: 600,
    bufferSec: 120,
    plannedDeparture: sgt('18:00'),
  });
  return { now, plan, urgency: urgencyOf(plan.target!, now, LEAD) };
}

const renderHero = (nowHHMM: string) => {
  const { now, plan, urgency } = scenarioAt(nowHHMM);
  render(
    <Hero option={plan.target!} urgency={urgency} serviceNo="15" now={now} leadSec={LEAD} />,
  );
  return { plan, urgency };
};

describe('Hero', () => {
  it('leads with the leave-by time and the bus it buys you', () => {
    renderHero('17:45');
    // Once in the ring, once as the first leg of the journey.
    expect(screen.getAllByText('17:49')).toHaveLength(2);
    expect(screen.getByText(/Bus 15 departs/)).toBeDefined();
    expect(screen.getByText('18:01')).toBeDefined();
  });

  it('shows what catching it costs against the planned departure', () => {
    renderHero('17:45');
    expect(screen.getByText('11 min earlier than planned')).toBeDefined();
  });

  it('reads "Leave soon" inside the 5 min lead', () => {
    const { urgency } = renderHero('17:45');
    expect(urgency).toBe('soon');
    expect(screen.getByText('Leave soon')).toBeDefined();
  });

  it('flips to a live countdown once inside the buffer', () => {
    const { urgency } = renderHero('17:50');
    expect(urgency).toBe('now');
    expect(screen.getByText('Leave now')).toBeDefined();
    // One minute of buffer left before 17:51, the point of no return.
    expect(screen.getByText('1:00')).toBeDefined();
    expect(screen.getByText('left to catch it')).toBeDefined();
  });

  it('flags a timetable-only estimate', () => {
    const now = sgt('17:00');
    const plan = planDeparture({
      now,
      arrivals: [at('18:01', false)],
      walkSec: 600,
      bufferSec: 120,
    });
    render(
      <Hero option={plan.target!} urgency="ok" serviceNo="15" now={now} leadSec={LEAD} />,
    );
    expect(screen.getByText('estimated')).toBeDefined();
  });
});

describe('Journey', () => {
  it('breaks the deadline into leave, walk, wait and departure', () => {
    const { plan } = scenarioAt('17:45');
    render(<Journey option={plan.target!} serviceNo="15" />);

    expect(screen.getByText('17:49')).toBeDefined();
    expect(screen.getByText('Stop working, head out')).toBeDefined();
    expect(screen.getByText('10 min walk')).toBeDefined();
    expect(screen.getByText('17:59')).toBeDefined(); // leaveBy + walk
    expect(screen.getByText('At the stop')).toBeDefined();
    expect(screen.getByText('2 min spare')).toBeDefined();
    expect(screen.getByText('18:01')).toBeDefined();
    expect(screen.getByText('Bus 15 departs')).toBeDefined();
  });

  it('omits the spare-time leg when the buffer is negligible', () => {
    const now = sgt('17:00');
    const plan = planDeparture({
      now,
      arrivals: [at('18:01')],
      walkSec: 600,
      bufferSec: 0,
    });
    render(<Journey option={plan.target!} serviceNo="15" />);
    expect(screen.queryByText(/spare/)).toBeNull();
  });
});

describe('DepartureRow', () => {
  it('presents a later bus as extra time rather than a deadline', () => {
    const { plan } = scenarioAt('17:45');
    render(<DepartureRow option={plan.options[1]} serviceNo="15" />);
    expect(screen.getByText('18:15')).toBeDefined();
    expect(screen.getByText('18:03')).toBeDefined();
    expect(screen.getByText('+3 min')).toBeDefined();
  });

  it('marks a bus you can no longer reach', () => {
    const now = sgt('17:55');
    const plan = planDeparture({
      now,
      arrivals: [at('18:01')],
      walkSec: 600,
      bufferSec: 120,
    });
    render(<DepartureRow option={plan.options[0]} serviceNo="15" />);
    expect(screen.getByText('out of reach')).toBeDefined();
  });
});
