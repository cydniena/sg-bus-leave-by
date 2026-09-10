import { NextResponse } from 'next/server';
import { search } from '@/lib/geocode';
import { errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/search?q=018956 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });

  try {
    return NextResponse.json({ results: await search(q) });
  } catch (err) {
    return errorResponse(err);
  }
}
