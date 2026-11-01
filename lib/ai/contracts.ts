import type { AiTaskId } from './tasks';
import type { AiSettings } from './config';

export interface UsageEntry {
  id: string;
  at: string;
  task: AiTaskId | 'connection-test' | 'custom';
  model: string;
  requestedModel?: string;
  fallbackUsed: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: 'ok' | 'error';
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  caseCode?: string;
  source: 'server' | 'browser';
}

export interface RunTaskResult {
  ok: true;
  taskId: AiTaskId;
  model: string;
  requestedModel: string;
  fallbackUsed: boolean;
  content: string;
  parsed: unknown | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number };
  latencyMs: number;
  logId: string;
  warnings: string[];
}

export interface RunTaskFailure {
  ok: false;
  error: string;
  code: string;
  status: number;
  model?: string;
  suggestion?: string;
  missingModality?: 'image' | 'file';
}

export type RunTaskResponse = RunTaskResult | RunTaskFailure;

export interface AiHealth {
  ok: boolean;
  mode: 'server' | 'direct';
  version?: string;
  provider: 'openrouter';
  endpoint: string;
  storage?: string;
  key: { present: boolean; source: 'stored' | 'env' | 'none'; fingerprint: string | null };
  settings: AiSettings;
  checkedAt: string;
}

export interface TestStep {
  name: string;
  ok: boolean;
  detail: string;
  ms?: number;
}

export interface TestResult {
  ok: boolean;
  stage?: string;
  steps: TestStep[];
  error?: string;
  latencyMs?: number;
  key?: { label: string | null; usage: number | null; limit: number | null; isFreeTier: boolean | null } | null;
  model?: string;
  sample?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number | null };
}

export interface UsagePayload {
  ok: true;
  summary: {
    totals: {
      requests: number;
      ok: number;
      errors: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      costUsd: number;
      avgLatencyMs: number;
      errorRate: number;
    };
    byDay: { date: string; requests: number; tokens: number; costUsd: number; errors: number }[];
    byModel: { model: string; requests: number; tokens: number; costUsd: number }[];
    byTask: { task: string; requests: number; tokens: number; costUsd: number }[];
    recent: UsageEntry[];
    errors: UsageEntry[];
  };
  budget: { monthlyBudgetUsd: number; spentUsd: number; pct: number };
  rows: UsageEntry[];
}
