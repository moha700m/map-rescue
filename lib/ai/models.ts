import snapshot from './catalog.snapshot.json';

export type Modality = 'text' | 'image' | 'file' | 'audio' | 'video';

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  inputModalities: Modality[];
  outputModalities: Modality[];
  /** USD per token */
  promptPrice: number;
  /** USD per token */
  completionPrice: number;
  maxCompletionTokens: number | null;
  supportedParameters: string[];
}

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export const CATALOG_SNAPSHOT: ModelInfo[] = (snapshot.models as ModelInfo[]).map((m) => ({
  ...m,
  inputModalities: m.inputModalities as Modality[],
  outputModalities: m.outputModalities as Modality[],
}));

export const SNAPSHOT_CAPTURED_AT = snapshot.capturedAt;

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface RawModel {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
  top_provider?: { max_completion_tokens?: number | null };
  supported_parameters?: string[];
}

export function normalizeModels(raw: RawModel[]): ModelInfo[] {
  return raw
    .filter((m) => typeof m.id === 'string' && !m.id.includes(':batch'))
    .map((m) => ({
      id: m.id as string,
      name: m.name || (m.id as string),
      contextLength: num(m.context_length),
      inputModalities: ((m.architecture?.input_modalities || ['text']) as Modality[]).slice(),
      outputModalities: ((m.architecture?.output_modalities || ['text']) as Modality[]).slice(),
      promptPrice: num(m.pricing?.prompt),
      completionPrice: num(m.pricing?.completion),
      maxCompletionTokens: m.top_provider?.max_completion_tokens ?? null,
      supportedParameters: m.supported_parameters || [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export interface CatalogResult {
  models: ModelInfo[];
  source: 'live' | 'snapshot';
  fetchedAt: string;
  error?: string;
}

let memoryCache: { at: number; result: CatalogResult } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function loadCatalog(force = false): Promise<CatalogResult> {
  if (!force && memoryCache && Date.now() - memoryCache.at < CACHE_MS) {
    return memoryCache.result;
  }

  // Client-side cache across reloads
  if (!force && typeof window !== 'undefined') {
    try {
      const cached = window.localStorage.getItem('mra.catalog.v1');
      if (cached) {
        const parsed = JSON.parse(cached) as CatalogResult;
        if (parsed?.models?.length && Date.now() - new Date(parsed.fetchedAt).getTime() < CACHE_MS) {
          memoryCache = { at: Date.now(), result: parsed };
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(OPENROUTER_MODELS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
    const payload = (await res.json()) as { data?: RawModel[] };
    const models = normalizeModels(payload.data || []);
    if (!models.length) throw new Error('catalog empty');
    const result: CatalogResult = {
      models,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    };
    memoryCache = { at: Date.now(), result };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('mra.catalog.v1', JSON.stringify(result));
      } catch {
        /* quota */
      }
    }
    return result;
  } catch (err) {
    const result: CatalogResult = {
      models: CATALOG_SNAPSHOT,
      source: 'snapshot',
      fetchedAt: SNAPSHOT_CAPTURED_AT,
      error: err instanceof Error ? err.message : 'catalog fetch failed',
    };
    memoryCache = { at: Date.now(), result };
    return result;
  }
}

export function findModel(models: ModelInfo[], id: string | undefined | null): ModelInfo | undefined {
  if (!id) return undefined;
  return models.find((m) => m.id === id);
}

export function supports(model: ModelInfo | undefined, modality: Modality): boolean {
  if (!model) return false;
  return model.inputModalities.includes(modality);
}

export function isVisionModel(model: ModelInfo | undefined): boolean {
  return supports(model, 'image');
}

export function isFileModel(model: ModelInfo | undefined): boolean {
  return supports(model, 'file');
}

export function pricePerMillion(model: ModelInfo | undefined) {
  if (!model) return { prompt: 0, completion: 0 };
  return {
    prompt: Number((model.promptPrice * 1_000_000).toFixed(4)),
    completion: Number((model.completionPrice * 1_000_000).toFixed(4)),
  };
}

export function estimateCost(model: ModelInfo | undefined, promptTokens: number, completionTokens: number) {
  if (!model) return 0;
  const cost = promptTokens * model.promptPrice + completionTokens * model.completionPrice;
  return Number(cost.toFixed(6));
}

export function contextLabel(contextLength: number) {
  if (!contextLength) return '—';
  if (contextLength >= 1_000_000) return `${(contextLength / 1_000_000).toFixed(1)}M`;
  if (contextLength >= 1_000) return `${Math.round(contextLength / 1_000)}K`;
  return String(contextLength);
}

export function providerOf(id: string) {
  return id.split('/')[0] || 'other';
}

export const PROVIDER_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  'x-ai': 'xAI',
  'meta-llama': 'Meta',
  mistralai: 'Mistral',
  moonshotai: 'Moonshot',
  microsoft: 'Microsoft',
  nvidia: 'NVIDIA',
  cohere: 'Cohere',
};
