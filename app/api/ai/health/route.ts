import { NextResponse } from 'next/server';
import { getApiKey, getSettings, storageMode } from '@/lib/ai/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [settings, key] = await Promise.all([getSettings(), getApiKey()]);
  return NextResponse.json({
    ok: true,
    mode: 'server',
    version: '2.0.0',
    provider: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    storage: storageMode(),
    key: { present: !!key.key, source: key.source, fingerprint: key.fingerprint ?? null },
    settings,
    checkedAt: new Date().toISOString(),
  });
}
