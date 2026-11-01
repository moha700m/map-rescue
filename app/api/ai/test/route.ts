import { NextResponse } from 'next/server';
import { getApiKey, getSettings, appendUsage } from '@/lib/ai/storage';
import { callOpenRouter, fetchKeyInfo, OpenRouterError } from '@/lib/ai/openrouter';
import { loadCatalog, findModel } from '@/lib/ai/models';
import { uid } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { apiKey?: string; model?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const settings = await getSettings();
  const stored = await getApiKey();
  const apiKey = (body.apiKey || stored.key || '').trim();
  const model = body.model || settings.defaultModel;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, stage: 'credentials', error: 'لا يوجد مفتاح OpenRouter. أضف المفتاح أو اضبط OPENROUTER_API_KEY.' },
      { status: 400 },
    );
  }

  const started = Date.now();
  const steps: { name: string; ok: boolean; detail: string; ms?: number }[] = [];

  let keyInfo: Awaited<ReturnType<typeof fetchKeyInfo>> | null = null;
  const keyStart = Date.now();
  try {
    keyInfo = await fetchKeyInfo(apiKey);
    steps.push({
      name: 'المصادقة على المفتاح',
      ok: true,
      detail: keyInfo.label || 'مفتاح صالح',
      ms: Date.now() - keyStart,
    });
  } catch (err) {
    const e = err as OpenRouterError;
    steps.push({ name: 'المصادقة على المفتاح', ok: false, detail: e.message, ms: Date.now() - keyStart });
    await appendUsage({
      id: uid('req'),
      at: new Date().toISOString(),
      task: 'connection-test',
      model,
      fallbackUsed: false,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      latencyMs: Date.now() - started,
      status: 'error',
      httpStatus: e.status,
      errorCode: e.code,
      errorMessage: e.message,
      source: 'server',
    });
    return NextResponse.json({ ok: false, stage: 'auth', steps, error: e.message }, { status: 400 });
  }

  const catalog = await loadCatalog();
  const modelInfo = findModel(catalog.models, model);
  steps.push({
    name: 'النموذج متاح في الكتالوج',
    ok: !!modelInfo,
    detail: modelInfo
      ? `${modelInfo.name} · ${modelInfo.contextLength ? Math.round(modelInfo.contextLength / 1000) + 'K ctx' : 'ctx —'}`
      : `النموذج ${model} غير موجود`,
  });

  const chatStart = Date.now();
  try {
    const result = await callOpenRouter({
      apiKey,
      model,
      messages: [
        { role: 'system', content: 'أجب بكلمة واحدة فقط.' },
        { role: 'user', content: 'ping' },
      ],
      maxTokens: 8,
      temperature: 0,
      timeoutMs: 45_000,
    });
    steps.push({
      name: 'طلب تجريبي (completion)',
      ok: true,
      detail: `رد النموذج ${result.model} في ${result.latencyMs}ms · ${result.usage.totalTokens} رمز`,
      ms: Date.now() - chatStart,
    });

    await appendUsage({
      id: uid('req'),
      at: new Date().toISOString(),
      task: 'connection-test',
      model: result.model || model,
      requestedModel: model,
      fallbackUsed: false,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      costUsd: result.usage.costUsd ?? 0,
      latencyMs: result.latencyMs,
      status: 'ok',
      source: 'server',
    });

    return NextResponse.json({
      ok: true,
      steps,
      latencyMs: Date.now() - started,
      key: keyInfo,
      model: result.model || model,
      sample: result.content.slice(0, 120),
      usage: result.usage,
    });
  } catch (err) {
    const e = err as OpenRouterError;
    steps.push({ name: 'طلب تجريبي (completion)', ok: false, detail: e.message, ms: Date.now() - chatStart });
    await appendUsage({
      id: uid('req'),
      at: new Date().toISOString(),
      task: 'connection-test',
      model,
      fallbackUsed: false,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      latencyMs: Date.now() - started,
      status: 'error',
      httpStatus: e.status,
      errorCode: e.code,
      errorMessage: e.message,
      source: 'server',
    });
    return NextResponse.json({ ok: false, stage: 'completion', steps, error: e.message }, { status: 502 });
  }
}
