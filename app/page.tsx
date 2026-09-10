'use client';
import { useEffect, useState } from 'react';
import type { Trip } from '@/lib/types';
import { useTrips, tripFromHash } from '@/hooks/useTrips';
import { TripForm } from '@/components/TripForm';
import { TripWatch } from '@/components/TripWatch';
import { formatDuration } from '@/lib/format';

type View = { mode: 'list' } | { mode: 'watch'; id: string } | { mode: 'edit'; id: string | null };

export default function Home() {
  const { trips, ready, save, remove } = useTrips();
  const [view, setView] = useState<View>({ mode: 'list' });

  // A trip arriving via a shared link (set up on the laptop, opened on the phone).
  useEffect(() => {
    if (!ready) return;
    const shared = tripFromHash();
    if (!shared) return;
    history.replaceState(null, '', location.pathname);
    if (!trips.some((t) => t.id === shared.id)) save(shared);
    setView({ mode: 'watch', id: shared.id });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Land straight on the trip when there's only one.
  useEffect(() => {
    if (ready && view.mode === 'list' && trips.length === 1) {
      setView({ mode: 'watch', id: trips[0].id });
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trips live in localStorage, so the server can't know them. Hold a skeleton
  // rather than flashing an empty page before the first client paint.
  if (!ready) {
    return (
      <main>
        <div className="topbar">
          <div>
            <h1>Leave By</h1>
            <div className="small faint">When to stop working, so you don&apos;t miss the bus.</div>
          </div>
        </div>
        <div className="skeleton" style={{ height: 96, marginBottom: 9 }} />
        <div className="skeleton" style={{ height: 96, opacity: 0.6 }} />
      </main>
    );
  }

  if (view.mode === 'edit') {
    const initial = view.id ? (trips.find((t) => t.id === view.id) ?? null) : null;
    return (
      <main>
        <TripForm
          initial={initial}
          onCancel={() => setView(initial ? { mode: 'watch', id: initial.id } : { mode: 'list' })}
          onSave={(t) => {
            save(t);
            setView({ mode: 'watch', id: t.id });
          }}
        />
      </main>
    );
  }

  if (view.mode === 'watch') {
    const trip = trips.find((t) => t.id === view.id);
    // Deleted from another tab, or a stale share link — fall back to the list.
    if (!trip) {
      return (
        <main>
          <div className="banner">That trip no longer exists.</div>
          <button onClick={() => setView({ mode: 'list' })}>Back to trips</button>
        </main>
      );
    }
    return (
      <main>
        <TripWatch
          trip={trip}
          onEdit={() => setView({ mode: 'edit', id: trip.id })}
          onBack={() => setView({ mode: 'list' })}
        />
      </main>
    );
  }

  return (
    <main>
      <div className="topbar">
        <div>
          <h1>Leave By</h1>
          <div className="small faint">When to stop working, so you don&apos;t miss the bus.</div>
        </div>
        {trips.length > 0 && (
          <button className="primary small" onClick={() => setView({ mode: 'edit', id: null })}>
            + New
          </button>
        )}
      </div>

      {trips.length === 0 ? (
        <div className="card hero">
          <div className="empty-art" aria-hidden="true">
            <span className="empty-dot" />
            <span className="empty-line" />
            <span className="empty-dot" />
            <span className="empty-line dashed" />
            <span className="empty-bus">🚌</span>
          </div>
          <h2 style={{ margin: '18px 0 8px', color: 'var(--text)', letterSpacing: '-0.01em',
                       textTransform: 'none', fontSize: '1.05rem' }}>
            Never sprint for the bus again
          </h2>
          <p className="muted small" style={{ margin: '0 0 20px', textAlign: 'center', maxWidth: 340 }}>
            Set up a trip once — where you start, which stop, which bus. It works backwards
            from live arrivals to tell you the last moment you can leave, and pings you
            before it passes.
          </p>
          <button className="primary" onClick={() => setView({ mode: 'edit', id: null })}>
            Set up your first trip
          </button>
        </div>
      ) : (
        trips.map((t) => (
          <div className="row trip-row" key={t.id} onClick={() => setView({ mode: 'watch', id: t.id })}>
            <div className="trip-badge tnum">{t.serviceNo}</div>
            <div className="row-main">
              <div style={{ fontWeight: 620 }}>{t.label}</div>
              <div className="small faint">
                {t.stopName} · {formatDuration(t.walkSec)} walk
              </div>
            </div>
            <button
              className="ghost small danger"
              aria-label={`Delete ${t.label}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(t.id);
              }}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </main>
  );
}
