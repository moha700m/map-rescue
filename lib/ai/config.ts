import type { AiTaskId } from './tasks';

export interface AiSettings {
  defaultModel: string;
  fallbackModel: string;
  visionModel: string;
  longContextModel: string;
  economyModel: string;
  temperature: number;
  maxTokens: number;
  monthlyBudgetUsd: number;
  alertThresholdPct: number;
  autoFallback: boolean;
  requireConfirmation: boolean;
  logPrompts: boolean;
  taskModels: Partial<Record<AiTaskId, string>>;
  updatedAt: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  defaultModel: 'google/gemini-3.8-flash',
  fallbackModel: 'openai/gpt-6.1-sol',
  visionModel: 'google/gemini-3.8-flash',
  longContextModel: 'anthropic/claude-sonnet-5',
  economyModel: 'google/gemini-3.5-flash-lite',
  temperature: 0.25,
  maxTokens: 4096,
  monthlyBudgetUsd: 50,
  alertThresholdPct: 80,
  autoFallback: true,
  requireConfirmation: true,
  logPrompts: false,
  taskModels: {},
  updatedAt: new Date(0).toISOString(),
};

const MODEL_RE = /^[a-zA-Z0-9._\-]+\/[a-zA-Z0-9._\-:]+$/;

function str(v: unknown, fallback: string) {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function modelId(v: unknown, fallback: string) {
  const s = str(v, fallback);
  return MODEL_RE.test(s) ? s : fallback;
}

function numRange(v: unknown, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeSettings(patch: Partial<AiSettings> | null | undefined, current = DEFAULT_AI_SETTINGS): AiSettings {
  const p = patch || {};
  const taskModels: Partial<Record<AiTaskId, string>> = {};
  const incomingTasks = (p.taskModels || {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(incomingTasks)) {
    const id = str(value, '');
    if (id && MODEL_RE.test(id)) taskModels[key as AiTaskId] = id;
  }

  return {
    defaultModel: modelId(p.defaultModel, current.defaultModel),
    fallbackModel: modelId(p.fallbackModel, current.fallbackModel),
    visionModel: modelId(p.visionModel, current.visionModel),
    longContextModel: modelId(p.longContextModel, current.longContextModel),
    economyModel: modelId(p.economyModel, current.economyModel),
    temperature: numRange(p.temperature, current.temperature, 0, 1.5),
    maxTokens: Math.round(numRange(p.maxTokens, current.maxTokens, 256, 32000)),
    monthlyBudgetUsd: numRange(p.monthlyBudgetUsd, current.monthlyBudgetUsd, 0, 100000),
    alertThresholdPct: Math.round(numRange(p.alertThresholdPct, current.alertThresholdPct, 10, 100)),
    autoFallback: typeof p.autoFallback === 'boolean' ? p.autoFallback : current.autoFallback,
    requireConfirmation:
      typeof p.requireConfirmation === 'boolean' ? p.requireConfirmation : current.requireConfirmation,
    logPrompts: typeof p.logPrompts === 'boolean' ? p.logPrompts : current.logPrompts,
    taskModels,
    updatedAt: new Date().toISOString(),
  };
}

/** Picks the model for a task: explicit request > per-task override > task hint > default. */
export function resolveModelId(
  settings: AiSettings,
  taskId: AiTaskId | undefined,
  requested?: string | null,
): string {
  if (requested && MODEL_RE.test(requested)) return requested;
  if (taskId && settings.taskModels[taskId]) return settings.taskModels[taskId] as string;
  return settings.defaultModel;
}

export function defaultModelForHint(settings: AiSettings, hint: 'default' | 'vision' | 'long' | 'economy') {
  switch (hint) {
    case 'vision':
      return settings.visionModel;
    case 'long':
      return settings.longContextModel;
    case 'economy':
      return settings.economyModel;
    default:
      return settings.defaultModel;
  }
}
