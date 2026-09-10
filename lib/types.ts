/** Crowding level as reported by LTA. */
export type Load = 'SEA' | 'SDA' | 'LSD' | null;

/** LTA load codes -> human labels. */
export const LOAD_LABEL: Record<'SEA' | 'SDA' | 'LSD', string> = {
  SEA: 'Seats available',
  SDA: 'Standing available',
  LSD: 'Limited standing',
};

/** One upcoming bus, normalized away from LTA's wire format. */
export type Arrival = {
  at: Date;
  /** false = timetable-derived estimate, not a GPS-tracked bus. */
  monitored: boolean;
  load: Load;
  /** SD = single deck, DD = double deck, BD = bendy. */
  type: string | null;
};

export type BusStop = {
  code: string;
  name: string;
  road: string;
  lat: number;
  lng: number;
};

export type Place = {
  name: string;
  lat: number;
  lng: number;
};

/** A saved trip. Persisted in localStorage. */
export type Trip = {
  id: string;
  label: string;
  origin: Place;
  stopCode: string;
  stopName: string;
  serviceNo: string;
  /** Walking seconds origin -> stop, from OneMap, cached at setup time. */
  walkSec: number;
  /** Safety margin in seconds. Also defines the "leave now" window. */
  bufferSec: number;
  /** Optional "I'd like to leave around..." as minutes since midnight SGT. */
  plannedDepartureMin: number | null;
  /** How far ahead of leaveBy to warn, in seconds. */
  leadSec: number;
};

export const DEFAULT_BUFFER_SEC = 120;
export const DEFAULT_LEAD_SEC = 300;
