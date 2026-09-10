'use client';
import { formatTime, formatDuration } from '@/lib/format';
import type { Option } from '@/lib/plan';
import { LOAD_LABEL } from '@/lib/types';

/**
 * Spells out the three moments behind a leave-by time, so the number isn't
 * something you just have to trust:
 *
 *   17:49  leave  →  8 min walk  →  17:59 at the stop  →  2 min spare  →  18:01 bus
 *
 * Both durations are derived from the option itself:
 *   walk   = arrival - lastChance
 *   buffer = lastChance - leaveBy
 */
export function Journey({ option, serviceNo }: { option: Option; serviceNo: string }) {
  const walkSec = (option.arrival.getTime() - option.lastChance.getTime()) / 1000;
  const bufferSec = (option.lastChance.getTime() - option.leaveBy.getTime()) / 1000;
  const atStop = new Date(option.leaveBy.getTime() + walkSec * 1000);

  return (
    <div className="journey">
      <div className="leg is-start">
        <div className="leg-time tnum">{formatTime(option.leaveBy)}</div>
        <div className="leg-rail">
          <div className="leg-dot" />
        </div>
        <div className="leg-label">Stop working, head out</div>
      </div>

      <div className="leg-gap walk">
        <div />
        <div className="leg-gap-rail">
          <div className="leg-gap-line" />
        </div>
        <div className="leg-gap-label">{formatDuration(walkSec)} walk</div>
      </div>

      <div className="leg">
        <div className="leg-time tnum">{formatTime(atStop)}</div>
        <div className="leg-rail">
          <div className="leg-dot" />
        </div>
        <div className="leg-label">At the stop</div>
      </div>

      {bufferSec >= 30 && (
        <div className="leg-gap wait">
          <div />
          <div className="leg-gap-rail">
            <div className="leg-gap-line" />
          </div>
          <div className="leg-gap-label">{formatDuration(bufferSec)} spare</div>
        </div>
      )}

      <div className="leg is-bus">
        <div className="leg-time tnum">{formatTime(option.arrival)}</div>
        <div className="leg-rail">
          <div className="leg-dot" />
        </div>
        <div className="leg-label">
          Bus {serviceNo} departs
          {!option.monitored && (
            <span className="badge warn" title="Timetable estimate — this bus isn't being tracked">
              estimated
            </span>
          )}
          {option.load && <div className="small faint">{LOAD_LABEL[option.load]}</div>}
        </div>
      </div>
    </div>
  );
}
