export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export type OrPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

export interface OrMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OrPart[];
}

export interface OrUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
}

export interface OrCallResult {
  content: string;
  model: string;
  usage: OrUsage;
  latencyMs: number;
  finishReason?: string;
  provider?: string;
}

export class OpenRouterError extends Error {
  status: number;
  code: string;
  detail?: string;

  constructor(message: string, status = 0, code = 'openrouter_error', detail?: string) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function appHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://map-rescue.ai',
    'X-Title': 'MAP RESCUE AI',
  };
}

interface CallOptions {
  apiKey: string;
  model: string;
  messages: OrMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  jsonModeSupported?: boolean;
  timeoutMs?: number;
  extraPlugins?: { id: string }[];
}

export async function callOpenRouter(opts: CallOptions): Promise<OrCallResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.25,
    max_tokens: opts.maxTokens ?? 4096,
    usage: { include: true },
  };

  if (opts.json && opts.jsonModeSupported) {
    body.response_format = { type: 'json_object' };
  }
  if (opts.extraPlugins?.length) {
    body.plugins = opts.extraPlugins;
  }

  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: appHeaders(opts.apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new OpenRouterError(
      aborted ? 'انتهت مهلة الطلب إلى OpenRouter' : 'تعذّر الوصول إلى OpenRouter',
      0,
      aborted ? 'timeout' : 'network_error',
      err instanceof Error ? err.message : undefined,
    );
  }
  clearTimeout(timeout);

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload?.error?.message ||
      (typeof payload?.error === 'string' ? payload.error : '') ||
      text.slice(0, 300) ||
      `HTTP ${res.status}`;
    throw new OpenRouterError(message, res.status, payload?.error?.code ? String(payload.error.code) : `http_${res.status}`, text.slice(0, 800));
  }

  const choice = payload?.choices?.[0];
  const content: string = choice?.message?.content ?? '';
  const usage = payload?.usage || {};
  const promptTokens = Number(usage.prompt_tokens ?? 0);
  const completionTokens = Number(usage.completion_tokens ?? 0);
  const costRaw = usage.cost ?? usage.total_cost;

  return {
    content,
    model: payload?.model || opts.model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: Number(usage.total_tokens ?? promptTokens + completionTokens),
      costUsd: typeof costRaw === 'number' ? costRaw : null,
    },
    latencyMs: Date.now() - started,
    finishReason: choice?.finish_reason,
    provider: payload?.provider,
  };
}

export interface KeyInfo {
  label: string | null;
  usage: number | null;
  limit: number | null;
  isFreeTier: boolean | null;
  rateLimit: unknown;
}

export async function fetchKeyInfo(apiKey: string): Promise<KeyInfo> {
  const res = await fetch(`${OPENROUTER_BASE}/key`, {
    headers: appHeaders(apiKey),
    cache: 'no-store',
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!res.ok) {
    throw new OpenRouterError(
      payload?.error?.message || `تعذّر التحقق من المفتاح (HTTP ${res.status})`,
      res.status,
      `http_${res.status}`,
      text.slice(0, 500),
    );
  }
  const data = payload?.data || {};
  return {
    label: data.label ?? null,
    usage: typeof data.usage === 'number' ? data.usage : null,
    limit: typeof data.limit === 'number' ? data.limit : null,
    isFreeTier: typeof data.is_free_tier === 'boolean' ? data.is_free_tier : null,
    rateLimit: data.rate_limit ?? null,
  };
}

export const DEFAULT_TIMEOUT_MS = 120_000;
