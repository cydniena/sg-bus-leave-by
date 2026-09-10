import { NextResponse } from 'next/server';
import { estimateWalk } from '@/lib/walk';

function parsePoint(raw: string | null): { lat: number; lng: number } | null {
  const [lat, lng] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** GET /api/walk?from=1.28,103.85&to=1.29,103.86 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = parsePoint(searchParams.get('from'));
  const to = parsePoint(searchParams.get('to'));

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to must be "lat,lng"' }, { status: 400 });
  }

  return NextResponse.json(estimateWalk(from, to));
}
