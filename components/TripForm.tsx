'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Place, Trip } from '@/lib/types';
import { DEFAULT_BUFFER_SEC, DEFAULT_LEAD_SEC } from '@/lib/types';
import type { NearbyStop } from '@/lib/geo';
import type { WireService } from '@/lib/api';
import { formatDuration } from '@/lib/format';

const minToHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const hhmmToMin = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

/** Four dashes that fill as the setup progresses. */
function Steps({ current }: { current: number }) {
  return (
    <div className="steps" aria-label={`Step ${current} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`step-pip ${n < current ? 'done' : n === current ? 'active' : ''}`}
        >
          <span />
        </div>
      ))}
    </div>
  );
}

export function TripForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Trip | null;
  onSave: (t: Trip) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [origin, setOrigin] = useState<Place | null>(initial?.origin ?? null);

  const [stops, setStops] = useState<NearbyStop[] | null>(null);
  const [stop, setStop] = useState<{ code: string; name: string } | null>(
    initial ? { code: initial.stopCode, name: initial.stopName } : null,
  );

  const [services, setServices] = useState<string[] | null>(null);
  const [serviceNo, setServiceNo] = useState(initial?.serviceNo ?? '');

  const [walkSec, setWalkSec] = useState<number | null>(initial?.walkSec ?? null);
  const [walkMetres, setWalkMetres] = useState<number | null>(null);

  const [bufferMin, setBufferMin] = useState(
    Math.round((initial?.bufferSec ?? DEFAULT_BUFFER_SEC) / 60),
  );
  const [leadMin, setLeadMin] = useState(
    Math.round((initial?.leadSec ?? DEFAULT_LEAD_SEC) / 60),
  );
  const [planned, setPlanned] = useState(
    initial?.plannedDepartureMin != null ? minToHHMM(initial.plannedDepartureMin) : '',
  );

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setBusy('Searching…');
    setError(null);
    try {
      const { results } = await getJson<{ results: Place[] }>(
        `/api/search?q=${encodeURIComponent(query)}`,
      );
      setResults(results.slice(0, 8));
      if (results.length === 0) setError('No places matched that.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [query]);

  // Origin chosen -> list the stops you could walk to.
  useEffect(() => {
    if (!origin) return;
    setBusy('Finding nearby stops…');
    getJson<{ stops: NearbyStop[] }>(`/api/stops?lat=${origin.lat}&lng=${origin.lng}`)
      .then((b) => setStops(b.stops))
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(null));
  }, [origin]);

  // Stop chosen -> which services actually call there.
  useEffect(() => {
    if (!stop) return;
    setBusy('Checking services…');
    getJson<{ services: WireService[] }>(`/api/arrivals?stop=${stop.code}`)
      .then((b) => setServices(b.services.map((s) => s.serviceNo).sort()))
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(null));
  }, [stop]);

  // Origin + stop -> walking time, estimated once and cached on the trip.
  const computeWalk = useCallback(async () => {
    if (!origin || !stop) return;
    const target = stops?.find((s) => s.code === stop.code);
    if (!target) return;
    setBusy('Estimating the walk…');
    setError(null);
    try {
      const r = await getJson<{ seconds: number; metres: number }>(
        `/api/walk?from=${origin.lat},${origin.lng}&to=${target.lat},${target.lng}`,
      );
      setWalkSec(r.seconds);
      setWalkMetres(r.metres);
    } catch (e) {
      setError(`${(e as Error).message} — type the walking time in yourself below.`);
    } finally {
      setBusy(null);
    }
  }, [origin, stop, stops]);

  useEffect(() => {
    if (origin && stop && stops) void computeWalk();
  }, [origin, stop, stops, computeWalk]);

  const canSave = origin && stop && serviceNo && walkSec !== null;
  const step = !origin ? 1 : !stop ? 2 : !serviceNo ? 3 : 4;

  const submit = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label: label.trim() || origin!.name,
      origin: origin!,
      stopCode: stop!.code,
      stopName: stop!.name,
      serviceNo,
      walkSec: walkSec!,
      bufferSec: Math.max(0, bufferMin) * 60,
      plannedDepartureMin: planned ? hhmmToMin(planned) : null,
      leadSec: Math.max(60, leadMin * 60),
    });
  };

  return (
    <>
      <div className="topbar">
        <h1>{initial ? 'Edit trip' : 'New trip'}</h1>
        <button className="ghost small" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <Steps current={step} />

      {error && <div className="banner error">{error}</div>}
      {busy && <div className="banner info">{busy}</div>}

      <div className="field">
        <label htmlFor="label">Name this trip</label>
        <input
          id="label"
          value={label}
          placeholder="Office → home"
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <h2 className="section">1 · Where you start</h2>
      {origin ? (
        <div className="row">
          <div className="row-main">{origin.name}</div>
          <button
            className="ghost small"
            onClick={() => {
              setOrigin(null);
              setStops(null);
              setStop(null);
              setServices(null);
              setWalkSec(null);
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="field-row field">
            <input
              value={query}
              placeholder="Building name or postal code"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
            />
            <button style={{ flex: '0 0 auto' }} onClick={() => void runSearch()}>
              Search
            </button>
          </div>
          {results?.map((r) => (
            <button
              key={`${r.lat},${r.lng},${r.name}`}
              className="pick"
              onClick={() => {
                setOrigin(r);
                setResults(null);
              }}
            >
              <span>{r.name}</span>
            </button>
          ))}
        </>
      )}

      {origin && (
        <>
          <h2 className="section">2 · Which stop you walk to</h2>
          {stop ? (
            <div className="row">
              <div className="row-main">
                {stop.name} <span className="muted small">({stop.code})</span>
              </div>
              <button
                className="ghost small"
                onClick={() => {
                  setStop(null);
                  setServices(null);
                  setServiceNo('');
                  setWalkSec(null);
                }}
              >
                Change
              </button>
            </div>
          ) : (
            stops?.map((s) => (
              <button
                key={s.code}
                className="pick"
                onClick={() => setStop({ code: s.code, name: s.name })}
              >
                <span>
                  {s.name} <span className="muted small">({s.code})</span>
                </span>
                <span className="muted small">{s.distanceM} m</span>
              </button>
            )) ?? null
          )}
          {stops?.length === 0 && (
            <div className="banner">No bus stops within 800 m of that address.</div>
          )}
        </>
      )}

      {stop && (
        <>
          <h2 className="section">3 · Which bus</h2>
          <div className="chips">
            {services?.map((s) => (
              <button
                key={s}
                aria-pressed={serviceNo === s}
                onClick={() => setServiceNo(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {services?.length === 0 && (
            <div className="banner">
              No buses are running at this stop right now, so there&apos;s nothing to list.
              Come back during service hours to pick one.
            </div>
          )}
        </>
      )}

      {stop && origin && (
        <>
          <h2 className="section">4 · Timing</h2>
          <div className="field">
            <label htmlFor="walk">
              Walking time
              {walkMetres !== null && (
                <span className="muted"> · about {walkMetres} m</span>
              )}
            </label>
            <div className="field-row">
              <input
                id="walk"
                type="number"
                min={0}
                value={walkSec === null ? '' : Math.round(walkSec / 60)}
                onChange={(e) => setWalkSec(Number(e.target.value) * 60)}
              />
              <button style={{ flex: '0 0 auto' }} onClick={() => void computeWalk()}>
                Recalculate
              </button>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              In minutes — estimated from the distance, so treat it as a starting point.
              Walk it once and set your real number; everything else is calculated from this.
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="buffer">Safety buffer (min)</label>
              <input
                id="buffer"
                type="number"
                min={0}
                value={bufferMin}
                onChange={(e) => setBufferMin(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="lead">Warn me this early (min)</label>
              <input
                id="lead"
                type="number"
                min={1}
                value={leadMin}
                onChange={(e) => setLeadMin(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="planned">Departure you had in mind (optional)</label>
            <input
              id="planned"
              type="time"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
            />
            <div className="small muted" style={{ marginTop: 6 }}>
              Used only to tell you how much earlier or later each bus makes you leave.
            </div>
          </div>
        </>
      )}

      <div className="actions">
        <button className="primary" disabled={!canSave} onClick={submit}>
          {initial ? 'Save changes' : 'Start watching'}
        </button>
      </div>
    </>
  );
}
