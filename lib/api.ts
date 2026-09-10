import { NextResponse } from 'next/server';
import { ArrivalsError } from './arrivals';
import { GeocodeError } from './geocode';

/** Turns known upstream failures into an actionable message, not a stack trace. */
export function errorResponse(err: unknown) {
  if (err instanceof ArrivalsError || err instanceof GeocodeError) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
  console.error(err);
  return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
}

/** Wire form of an Arrival — Date does not survive JSON. */
export type WireArrival = {
  at: string;
  monitored: boolean;
  load: string | null;
  type: string | null;
};

export type WireService = {
  serviceNo: string;
  operator: string | null;
  arrivals: WireArrival[];
};
