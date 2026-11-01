import { NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/ai/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const catalog = await loadCatalog(force);
  return NextResponse.json(catalog);
}
