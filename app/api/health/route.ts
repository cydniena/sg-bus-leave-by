import { NextResponse } from 'next/server';
import { fetchArrivals } from '@/lib/arrivals';
import { search } from '@/lib/geocode';
import type { BusStop } from '@/lib/types';
import stopsData from '@/data/bus-stops.json';

export const dynamic = 'force-dynamic';

const probe = async (fn: () => Promise<unknown>) => {
  try {
    return { ok: true as const, detail: await fn() };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message };
  }
};

/** GET /api/health — confirms both upstreams and the stop snapshot in one shot. */
export async function GET() {
  const [arrivals, geocode] = await Promise.all([
    probe(async () => {
      const s = await fetchArrivals('83139');
      return `${s.length} services at stop 83139`;
    }),
    probe(async () => {
      const r = await search('018956');
      return r[0]?.name ?? 'no match';
    }),
  ]);

  return NextResponse.json({
    arrivals,
    geocode,
    busStops: { count: (stopsData as BusStop[]).length },
  });
}
