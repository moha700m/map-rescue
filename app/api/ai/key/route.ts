import { NextResponse } from 'next/server';
import { clearApiKey, getApiKey, setApiKey } from '@/lib/ai/storage';
import { fetchKeyInfo } from '@/lib/ai/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { apiKey?: string; verify?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const apiKey = (body.apiKey || '').trim();
  if (!apiKey || apiKey.length < 20) {
    return NextResponse.json({ error: 'المفتاح غير صالح. الصق مفتاح OpenRouter كاملًا.' }, { status: 400 });
  }

  if (body.verify !== false) {
    try {
      await fetchKeyInfo(apiKey);
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : 'تعذّر التحقق من المفتاح لدى OpenRouter',
          code: 'key_verification_failed',
        },
        { status: 400 },
      );
    }
  }

  const saved = await setApiKey(apiKey);
  return NextResponse.json({ ok: true, ...saved, source: 'stored' });
}

export async function DELETE() {
  await clearApiKey();
  const key = await getApiKey();
  return NextResponse.json({ ok: true, key: { present: !!key.key, source: key.source } });
}
