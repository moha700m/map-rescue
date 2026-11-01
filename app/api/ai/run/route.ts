import { NextResponse } from 'next/server';
import { getApiKey, getSettings } from '@/lib/ai/storage';
import { loadCatalog } from '@/lib/ai/models';
import { resolveModelId } from '@/lib/ai/config';
import { runTask, type Attachment } from '@/lib/ai/runner';
import type { AiTaskId } from '@/lib/ai/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_TOTAL_BYTES = 22 * 1024 * 1024;

export async function POST(req: Request) {
  let body: {
    taskId?: AiTaskId;
    input?: Record<string, unknown>;
    attachments?: Attachment[];
    model?: string;
    caseCode?: string;
    allowFallback?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'طلب غير صالح' }, { status: 400 });
  }

  if (!body.taskId) {
    return NextResponse.json({ ok: false, error: 'taskId مطلوب' }, { status: 400 });
  }

  const attachments = (body.attachments || []).filter((a) => a && a.dataUrl);
  const totalBytes = attachments.reduce((sum, a) => sum + (a.size || a.dataUrl.length), 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'حجم المرفقات يتجاوز 22 ميجابايت. اختصر المستندات أو ارفعها منفردة.' },
      { status: 413 },
    );
  }

  const [settings, key] = await Promise.all([getSettings(), getApiKey()]);
  if (!key.key) {
    return NextResponse.json(
      {
        ok: false,
        code: 'no_key',
        error:
          'لا يوجد مفتاح OpenRouter. أضفه من صفحة الاتصال في إعدادات الذكاء الاصطناعي أو اضبط OPENROUTER_API_KEY.',
      },
      { status: 400 },
    );
  }

  const catalog = await loadCatalog();
  const model = resolveModelId(settings, body.taskId, body.model);

  const result = await runTask({
    taskId: body.taskId,
    input: body.input || {},
    attachments,
    model,
    settings,
    apiKey: key.key,
    catalog: catalog.models,
    caseCode: body.caseCode,
    allowFallback: body.allowFallback,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result);
}
