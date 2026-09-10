'use client';
import type { Option, Urgency } from '@/lib/plan';
import { formatTime, formatDuration, formatCountdown, formatDelta } from '@/lib/format';
import { LOAD_LABEL } from '@/lib/types';
import { CountdownRing } from './CountdownRing';
import { Journey } from './Journey';

const HERO_LABEL: Record<Urgency, string> = {
  ok: 'Leave by',
  soon: 'Leave soon',
  now: 'Leave now',
  gone: 'Missed',
};

function EstimateBadge({ monitored }: { monitored: boolean }) {
  if (monitored) return null;
  return (
    <span className="badge warn" title="Timetable estimate — this bus isn't being tracked">
      estimated
    </span>
  );
}

/**
 * The target departure. Two display modes:
 *   planning (ok / soon) — the big number is the clock time to leave
 *   crunch   (now)       — it flips to a live countdown to the point of no return
 */
export function Hero({
  option,
  urgency,
  serviceNo,
  now,
  leadSec,
}: {
  option: Option;
  urgency: Urgency;
  serviceNo: string;
  now: Date;
  leadSec: number;
}) {
  const bufferSec = (option.lastChance.getTime() - option.leaveBy.getTime()) / 1000;
  const toLastChance = (option.lastChance.getTime() - now.getTime()) / 1000;

  // The ring starts moving three lead-times out, and runs down through the buffer.
  const windowSec = leadSec * 3 + bufferSec;
  const fraction = toLastChance / windowSec;

  const crunch = urgency === 'now';

  return (
    <div className="card hero">
      <CountdownRing fraction={fraction} urgency={urgency}>
        <div className="ring-kicker">{HERO_LABEL[urgency]}</div>
        <div className="ring-time">
          {crunch ? formatCountdown(toLastChance) : formatTime(option.leaveBy)}
        </div>
        <div className="ring-count">
          {crunch ? 'left to catch it' : `in ${formatCountdown(option.leaveInSec)}`}
        </div>
      </CountdownRing>

      {option.deltaSec !== null && (
        <div className={`hero-delta ${option.deltaSec < 0 ? 'early' : 'later'}`}>
          {formatDelta(option.deltaSec)}
        </div>
      )}

      <Journey option={option} serviceNo={serviceNo} />
    </div>
  );
}

/** One of the later buses you could take instead. */
export function DepartureRow({ option, serviceNo }: { option: Option; serviceNo: string }) {
  return (
    <div className={`row ${option.catchable ? '' : 'gone'}`}>
      <div className="row-time tnum">{formatTime(option.arrival)}</div>
      <div className="row-main">
        <div className="small">
          {option.catchable ? (
            <>
              leave by <strong className="tnum">{formatTime(option.leaveBy)}</strong>
            </>
          ) : (
            <span className="faint">out of reach</span>
          )}
          <EstimateBadge monitored={option.monitored} />
        </div>
        {option.load && <div className="small faint">{LOAD_LABEL[option.load]}</div>}
      </div>
      {option.catchable && option.deltaSec !== null && (
        <div className={`row-delta ${option.deltaSec < 0 ? 'cost' : 'gain'}`}>
          {option.deltaSec < 0
            ? `−${formatDuration(option.deltaSec)}`
            : `+${formatDuration(option.deltaSec)}`}
        </div>
      )}
    </div>
  );
}
