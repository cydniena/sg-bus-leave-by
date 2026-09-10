'use client';
import { useEffect, useMemo } from 'react';
import type { Trip } from '@/lib/types';
import { planDeparture, urgencyOf } from '@/lib/plan';
import { plannedDepartureAt, formatTime, formatDuration } from '@/lib/format';
import { useArrivals } from '@/hooks/useArrivals';
import { useNow } from '@/hooks/useNow';
import { useNotifier } from '@/hooks/useNotifier';
import { Hero, DepartureRow } from './DepartureCard';
import { shareLink } from '@/hooks/useTrips';

export function TripWatch({
  trip,
  onEdit,
  onBack,
}: {
  trip: Trip;
  onEdit: () => void;
  onBack: () => void;
}) {
  const now = useNow(1000);
  const { arrivals, error, loading, fetchedAt, refresh } = useArrivals(
    trip.stopCode,
    trip.serviceNo,
  );

  const plan = useMemo(
    () =>
      planDeparture({
        now,
        arrivals,
        walkSec: trip.walkSec,
        bufferSec: trip.bufferSec,
        plannedDeparture:
          trip.plannedDepartureMin === null
            ? null
            : plannedDepartureAt(trip.plannedDepartureMin, now),
      }),
    [now, arrivals, trip.walkSec, trip.bufferSec, trip.plannedDepartureMin],
  );

  const urgency = plan.target ? urgencyOf(plan.target, now, trip.leadSec) : 'gone';

  // Tints the ambient wash behind the page — peripheral, readable at a glance.
  useEffect(() => {
    document.body.dataset.urgency = plan.target ? urgency : '';
    return () => {
      delete document.body.dataset.urgency;
    };
  }, [urgency, plan.target]);

  const notifier = useNotifier({
    tripId: trip.id,
    serviceNo: trip.serviceNo,
    target: plan.target,
    urgency,
  });

  const others = plan.options.filter((o) => !o.isTarget);
  const stale = fetchedAt ? now.getTime() - fetchedAt.getTime() > 60_000 : true;
  const firstLoad = loading && fetchedAt === null;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>
            {trip.label} · bus {trip.serviceNo}
          </h1>
          <div className="small faint">
            {trip.stopName} · {formatDuration(trip.walkSec)} walk
            {trip.plannedDepartureMin !== null && (
              <> · planned {formatTime(plannedDepartureAt(trip.plannedDepartureMin, now))}</>
            )}
          </div>
        </div>
        <button className="ghost small" onClick={onBack}>
          ← Trips
        </button>
      </div>

      {error && (
        <div className="banner error">
          <span>{error}</span>
          <button className="ghost small" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {notifier.permission !== 'granted' && (
        <div className="banner info">
          {notifier.permission === 'denied' || notifier.permission === 'unsupported' ? (
            <>
              <span>
                This browser can&apos;t show notifications (iPhone Safari can&apos;t in a
                tab). The countdown still works — turn on a chime instead.
              </span>
              <button className="small" onClick={notifier.enable}>
                Enable chime
              </button>
            </>
          ) : (
            <>
              <span>
                Get told {formatDuration(trip.leadSec)} before you need to go.
              </span>
              <button className="primary small" onClick={notifier.enable}>
                Enable alerts
              </button>
            </>
          )}
        </div>
      )}

      {firstLoad ? (
        <div className="skeleton" style={{ height: 430, borderRadius: 22 }} />
      ) : plan.target ? (
        <Hero
          option={plan.target}
          urgency={urgency}
          serviceNo={trip.serviceNo}
          now={now}
          leadSec={trip.leadSec}
        />
      ) : (
        <div className="card hero">
          <div className="ring-wrap ring-gone" style={{ width: 244, height: 244 }}>
            <svg className="ring" width={244} height={244} aria-hidden="true">
              <circle className="ring-track" cx={122} cy={122} r={116.5} strokeWidth={11} />
            </svg>
            <div className="ring-face">
              <div className="ring-kicker">Nothing to catch</div>
              <div className="ring-time" style={{ fontSize: '2.2rem' }}>
                —
              </div>
            </div>
          </div>
          <div className="hero-caption muted">
            {arrivals.length === 0
              ? `No bus ${trip.serviceNo} running at ${trip.stopName} right now.`
              : 'Every upcoming bus is already out of walking range.'}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2>Or take a later one</h2>
          {others.map((o) => (
            <DepartureRow key={o.arrival.toISOString()} option={o} serviceNo={trip.serviceNo} />
          ))}
          <div className="small faint" style={{ marginTop: 10 }}>
            Only the next three buses are published, so this is as far ahead as anyone can see.
          </div>
        </>
      )}

      <div className="actions" style={{ marginTop: 28 }}>
        <button className="ghost small" onClick={refresh}>
          <span className={`dot ${stale ? 'stale' : 'live'}`} />
          {fetchedAt ? `Updated ${formatTime(fetchedAt)}` : 'Loading…'}
        </button>
        <button className="ghost small" onClick={onEdit}>
          Edit
        </button>
        <button
          className="ghost small"
          onClick={() => void navigator.clipboard?.writeText(shareLink(trip))}
          title="Copy a link that recreates this trip on another device"
        >
          Copy link for phone
        </button>
        <button className="ghost small" onClick={() => notifier.setMuted(!notifier.muted)}>
          {notifier.muted ? '🔇 Muted' : '🔔 Sound on'}
        </button>
      </div>
    </>
  );
}
