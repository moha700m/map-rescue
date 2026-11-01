import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/ai/storage';
import type { AiSettings } from '@/lib/ai/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<AiSettings>;
    const settings = await saveSettings(body);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'تعذّر حفظ الإعدادات' },
      { status: 400 },
    );
  }
}
