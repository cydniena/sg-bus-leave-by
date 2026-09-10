import { NextResponse } from 'next/server';
import { nearbyStops } from '@/lib/geo';
import type { BusStop } from '@/lib/types';
import stopsData from '@/data/bus-stops.json';

const STOPS = stopsData as BusStop[];

/** GET /api/stops?lat=1.28&lng=103.85[&radius=800] */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radius = Number(searchParams.get('radius')) || 800;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }
  if (STOPS.length === 0) {
    return NextResponse.json(
      { error: 'Bus stop data is empty. Run: npm run fetch-stops' },
      { status: 503 },
    );
  }

  return NextResponse.json({ stops: nearbyStops({ lat, lng }, STOPS, radius) });
}
