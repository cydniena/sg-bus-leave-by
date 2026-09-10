import { NextResponse } from 'next/server';
import { fetchArrivals } from '@/lib/arrivals';
import { errorResponse, type WireService } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/arrivals?stop=83139[&service=15] */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stop = searchParams.get('stop');
  const service = searchParams.get('service') ?? undefined;

  if (!stop) {
    return NextResponse.json({ error: 'stop is required' }, { status: 400 });
  }

  try {
    const services = await fetchArrivals(stop, service);
    const payload: WireService[] = services.map((s) => ({
      serviceNo: s.serviceNo,
      operator: s.operator,
      arrivals: s.arrivals.map((a) => ({
        at: a.at.toISOString(),
        monitored: a.monitored,
        load: a.load,
        type: a.type,
      })),
    }));
    return NextResponse.json({ stop, services: payload, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return errorResponse(err);
  }
}
