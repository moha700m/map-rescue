'use client';

import { DEFAULT_AI_SETTINGS, resolveModelId, sanitizeSettings, type AiSettings } from '../ai/config';
import { estimateCost, findModel, loadCatalog, type ModelInfo } from '../ai/models';
import { getTask, type AiTaskId } from '../ai/tasks';
import { buildContentParts, extractJson, validateModalities, type Attachment } from '../ai/messages';
import type {
  AiHealth,
  RunTaskResponse,
  TestResult,
  UsageEntry,
  UsagePayload,
} from '../ai/contracts';
import { summarizeUsage } from '../ai/analytics';
import { getUsageRows, pushUsage } from './store';
import { uid, withBase } from '../utils';

const SETTINGS_KEY = 'mra.ai.settings.v1';
const KEY_STORE = 'mra.ai.key.v1';
const OPENROUTER = 'https://openrouter.ai/api/v1';

/* ------------------------------------------------------------------ */
/* Local persistence (used when no server is available)                */
/* ------------------------------------------------------------------ */

export function getLocalSettings(): AiSettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return sanitizeSettings(JSON.parse(raw), DEFAULT_AI_SETTINGS);
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

function persistLocalSettings(next: AiSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getLocalKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY_STORE);
  } catch {
    return null;
  }
}

function maskKey(key: string) {
  if (key.length < 12) return '••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/* Mode detection                                                      */
/* ------------------------------------------------------------------ */

let healthPromise: Promise<AiHealth> | null = null;

async function probe(): Promise<AiHealth> {
  try {
    const res = await fetch(withBase('/api/ai/health'), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = (await res.json()) as AiHealth;
      return { ...data, mode: 'server' };
    }
  } catch {
    /* fall through to direct mode */
  }

  const key = getLocalKey();
  return {
    ok: true,
    mode: 'direct',
    provider: 'openrouter',
    endpoint: `${OPENROUTER}/chat/completions`,
    version: '2.0.0-preview',
    key: { present: !!key, source: key ? 'stored' : 'none', fingerprint: key ? maskKey(key) : null },
    settings: getLocalSettings(),
    checkedAt: new Date().toISOString(),
  };
}

export function getHealth(force = false): Promise<AiHealth> {
  if (!healthPromise || force) healthPromise = probe();
  return healthPromise;
}

export function refreshHealth() {
  healthPromise = null;
  return getHealth(true);
}

/* ------------------------------------------------------------------ */
/* Settings & key                                                      */
/* ------------------------------------------------------------------ */

export async function fetchSettings(): Promise<AiSettings> {
  const health = await getHealth();
  if (health.mode === 'server') {
    try {
      const res = await fetch(withBase('/api/ai/settings'), { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { settings: AiSettings };
        return data.settings;
      }
    } catch {
      /* fall back */
    }
  }
  return getLocalSettings();
}

export async function saveSettings(patch: Partial<AiSettings>): Promise<AiSettings> {
  const health = await getHealth();
  if (health.mode === 'server') {
    const res = await fetch(withBase('/api/ai/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'تعذّر حفظ الإعدادات');
    return data.settings as AiSettings;
  }
  const next = sanitizeSettings(patch, getLocalSettings());
  persistLocalSettings(next);
  return next;
}

export async function saveApiKey(apiKey: string): Promise<{ fingerprint: string; mode: 'server' | 'direct' }> {
  const health = await getHealth();
  const trimmed = apiKey.trim();
  if (trimmed.length < 20) throw new Error('المفتاح غير صالح. الصق مفتاح OpenRouter كاملًا.');

  if (health.mode === 'server') {
    const res = await fetch(withBase('/api/ai/key'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: trimmed, verify: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'تعذّر حفظ المفتاح');
    return { fingerprint: data.fingerprint, mode: 'server' };
  }

  // Direct mode: verify against OpenRouter before storing locally.
  await verifyKeyDirect(trimmed);
  window.localStorage.setItem(KEY_STORE, trimmed);
  return { fingerprint: maskKey(trimmed), mode: 'direct' };
}

export async function removeApiKey(): Promise<void> {
  const health = await getHealth();
  if (health.mode === 'server') {
    await fetch(withBase('/api/ai/key'), { method: 'DELETE' });
  }
  try {
    window.localStorage.removeItem(KEY_STORE);
  } catch {
    /* ignore */
  }
}

async function verifyKeyDirect(key: string) {
  const res = await fetch(`${OPENROUTER}/key`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message || `تعذّر التحقق من المفتاح (HTTP ${res.status})`);
  }
  return data?.data as { label?: string; usage?: number; limit?: number; is_free_tier?: boolean } | undefined;
}

/* ------------------------------------------------------------------ */
/* Connection test                                                     */
/* ------------------------------------------------------------------ */

export async function testConnection(opts: { apiKey?: string; model?: string } = {}): Promise<TestResult> {
  const health = await getHealth();
  if (health.mode === 'server') {
    const res = await fetch(withBase('/api/ai/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    return (await res.json()) as TestResult;
  }

  const key = opts.apiKey?.trim() || getLocalKey();
  const settings = getLocalSettings();
  const model = opts.model || settings.defaultModel;
  const steps: TestResult['steps'] = [];
  const started = Date.now();

  if (!key) {
    return {
      ok: false,
      stage: 'credentials',
      steps: [{ name: 'المفتاح', ok: false, detail: 'لا يوجد مفتاح محفوظ في هذه النسخة' }],
      error: 'أضف مفتاح OpenRouter أولًا.',
    };
  }

  const t0 = Date.now();
  let keyInfo;
  try {
    keyInfo = await verifyKeyDirect(key);
    steps.push({
      name: 'المصادقة على المفتاح',
      ok: true,
      detail: keyInfo?.label || 'مفتاح صالح',
      ms: Date.now() - t0,
    });
  } catch (err) {
    steps.push({
      name: 'المصادقة على المفتاح',
      ok: false,
      detail: err instanceof Error ? err.message : 'فشل التحقق',
      ms: Date.now() - t0,
    });
    return { ok: false, stage: 'auth', steps, error: err instanceof Error ? err.message : 'فشل التحقق' };
  }

  const catalog = await loadCatalog();
  const info = findModel(catalog.models, model);
  steps.push({
    name: 'النموذج متاح',
    ok: !!info,
    detail: info ? `${info.name} · ${Math.round(info.contextLength / 1000)}K ctx` : `النموذج ${model} غير موجود`,
  });

  const t1 = Date.now();
  try {
    const res = await fetch(`${OPENROUTER}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MAP RESCUE AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'أجب بكلمة واحدة فقط.' },
          { role: 'user', content: 'ping' },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    steps.push({
      name: 'طلب تجريبي',
      ok: true,
      detail: `تم بنجاح في ${Date.now() - t1}ms`,
      ms: Date.now() - t1,
    });
    return {
      ok: true,
      steps,
      latencyMs: Date.now() - started,
      key: {
        label: keyInfo?.label ?? null,
        usage: keyInfo?.usage ?? null,
        limit: keyInfo?.limit ?? null,
        isFreeTier: keyInfo?.is_free_tier ?? null,
      },
      model: data?.model || model,
      sample: (data?.choices?.[0]?.message?.content || '').slice(0, 120),
      usage: {
        promptTokens: data?.usage?.prompt_tokens ?? 0,
        completionTokens: data?.usage?.completion_tokens ?? 0,
        totalTokens: data?.usage?.total_tokens ?? 0,
        costUsd: data?.usage?.cost ?? null,
      },
    };
  } catch (err) {
    steps.push({
      name: 'طلب تجريبي',
      ok: false,
      detail: err instanceof Error ? err.message : 'فشل الطلب',
      ms: Date.now() - t1,
    });
    return {
      ok: false,
      stage: 'completion',
      steps,
      error:
        err instanceof Error
          ? err.message.includes('Failed to fetch')
            ? 'تعذّر الاتصال من المتصفح. إن كنت تستخدم نسخة المعاينة الثابتة، شغّل التطبيق على خادم (Vercel) أو تحقق من إعدادات CORS.'
            : err.message
          : 'فشل الطلب',
    };
  }
}

/* ------------------------------------------------------------------ */
/* Task execution                                                      */
/* ------------------------------------------------------------------ */

export interface RunOptions {
  taskId: AiTaskId;
  input: Record<string, unknown>;
  attachments?: Attachment[];
  model?: string;
  caseCode?: string;
}

export async function runTask(opts: RunOptions): Promise<RunTaskResponse> {
  const health = await getHealth();
  if (health.mode === 'server') {
    const res = await fetch(withBase('/api/ai/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    return (await res.json()) as RunTaskResponse;
  }
  return runDirect(opts);
}

async function runDirect(opts: RunOptions): Promise<RunTaskResponse> {
  const task = getTask(opts.taskId);
  if (!task) return { ok: false, error: 'مهمة غير معروفة', code: 'unknown_task', status: 400 };

  const key = getLocalKey();
  if (!key) {
    return {
      ok: false,
      error: 'لا يوجد مفتاح OpenRouter في هذه النسخة. أضف المفتاح من صفحة الاتصال.',
      code: 'no_key',
      status: 400,
    };
  }

  const settings = getLocalSettings();
  const catalog = await loadCatalog();
  const model = resolveModelId(settings, opts.taskId, opts.model);
  const modelInfo = findModel(catalog.models, model);
  const { parts, usedModalities } = buildContentParts(task.buildUser(opts.input), opts.attachments || []);
  const invalid = validateModalities(modelInfo, usedModalities);
  if (invalid) {
    return {
      ok: false,
      error: invalid.error,
      code: 'model_modality_mismatch',
      status: 422,
      model,
      missingModality: invalid.missing,
      suggestion: 'اختر نموذجًا متعدد الوسائط من تبويب النماذج.',
    };
  }

  const messages = [
    { role: 'system' as const, content: task.system },
    { role: 'user' as const, content: parts },
  ];

  const logId = uid('req');
  const started = Date.now();

  const attempt = async (modelId: string) => {
    const res = await fetch(`${OPENROUTER}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MAP RESCUE AI',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        usage: { include: true },
        ...(task.output === 'json' &&
        findModel(catalog.models, modelId)?.supportedParameters?.includes('response_format')
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = data?.error?.message || `HTTP ${res.status}`;
      const error = new Error(message) as Error & { status?: number; code?: string };
      error.status = res.status;
      error.code = data?.error?.code ? String(data.error.code) : `http_${res.status}`;
      throw error;
    }
    return data;
  };

  const log = (entry: Partial<UsageEntry> & { status: 'ok' | 'error' }) => {
    pushUsage({
      id: logId,
      at: new Date().toISOString(),
      task: opts.taskId,
      model: entry.model || model,
      requestedModel: model,
      fallbackUsed: !!entry.fallbackUsed,
      promptTokens: entry.promptTokens || 0,
      completionTokens: entry.completionTokens || 0,
      totalTokens: entry.totalTokens || 0,
      costUsd: entry.costUsd || 0,
      latencyMs: entry.latencyMs || Date.now() - started,
      status: entry.status,
      httpStatus: entry.httpStatus,
      errorCode: entry.errorCode,
      errorMessage: entry.errorMessage,
      caseCode: opts.caseCode,
      source: 'browser',
    });
  };

  let data;
  let usedModel = model;
  let fallbackUsed = false;
  const warnings: string[] = [];

  try {
    data = await attempt(model);
  } catch (err) {
    const e = err as Error & { status?: number; code?: string };
    const canFallback =
      settings.autoFallback && settings.fallbackModel && settings.fallbackModel !== model && ![401, 402, 403].includes(e.status || 0);
    if (!canFallback) {
      log({
        status: 'error',
        httpStatus: e.status,
        errorCode: e.code,
        errorMessage: e.message,
      });
      return {
        ok: false,
        error:
          e.message.includes('Failed to fetch')
            ? 'تعذّر الوصول إلى OpenRouter من المتصفح (CORS أو شبكة). استخدم النشر على خادم للتشغيل الكامل.'
            : e.message,
        code: e.code || 'network_error',
        status: e.status || 502,
        model,
      };
    }
    try {
      data = await attempt(settings.fallbackModel);
      usedModel = settings.fallbackModel;
      fallbackUsed = true;
      warnings.push(`تم التحويل إلى النموذج الاحتياطي ${settings.fallbackModel} بعد فشل ${model}.`);
    } catch (fallbackErr) {
      const f = fallbackErr as Error & { status?: number; code?: string };
      log({ status: 'error', httpStatus: f.status, errorCode: f.code, errorMessage: f.message });
      return { ok: false, error: f.message, code: f.code || 'fallback_failed', status: f.status || 502, model: usedModel };
    }
  }

  const resolvedModel = data?.model || usedModel;
  const info = findModel(catalog.models, resolvedModel);
  const usage = data?.usage || {};
  const promptTokens = Number(usage.prompt_tokens || 0);
  const completionTokens = Number(usage.completion_tokens || 0);
  const totalTokens = Number(usage.total_tokens || promptTokens + completionTokens);
  const costUsd = typeof usage.cost === 'number' ? usage.cost : estimateCost(info, promptTokens, completionTokens);
  const content: string = data?.choices?.[0]?.message?.content || '';

  log({
    status: 'ok',
    model: resolvedModel,
    fallbackUsed,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
  });

  const parsed = task.output === 'json' ? extractJson(content) : null;
  if (task.output === 'json' && !parsed) warnings.push('لم يكن الرد JSON صالحًا؛ أُعيد النص الخام.');

  return {
    ok: true,
    taskId: opts.taskId,
    model: resolvedModel,
    requestedModel: model,
    fallbackUsed,
    content,
    parsed,
    usage: { promptTokens, completionTokens, totalTokens, costUsd },
    latencyMs: Date.now() - started,
    logId,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

export async function fetchUsage(days = 14): Promise<UsagePayload> {
  const health = await getHealth();
  const settings = await fetchSettings();

  if (health.mode === 'server') {
    try {
      const res = await fetch(withBase(`/api/ai/usage?days=${days}`), { cache: 'no-store' });
      if (res.ok) return (await res.json()) as UsagePayload;
    } catch {
      /* fall back to local */
    }
  }

  const rows = getUsageRows();
  const summary = summarizeUsage(rows, days);
  return {
    ok: true,
    summary,
    budget: {
      monthlyBudgetUsd: settings.monthlyBudgetUsd,
      spentUsd: Number(summary.totals.costUsd.toFixed(4)),
      pct: settings.monthlyBudgetUsd
        ? Number(((summary.totals.costUsd / settings.monthlyBudgetUsd) * 100).toFixed(1))
        : 0,
    },
    rows,
  };
}

export async function listModels(force = false): Promise<{ models: ModelInfo[]; source: 'live' | 'snapshot'; fetchedAt: string; error?: string }> {
  const health = await getHealth();
  if (health.mode === 'server') {
    try {
      const res = await fetch(withBase(`/api/ai/models${force ? '?refresh=1' : ''}`), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.models?.length) return data;
      }
    } catch {
      /* fall back */
    }
  }
  return loadCatalog(force);
}

export type { AiTaskId };
