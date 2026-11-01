import type { UsageEntry } from './contracts';

export interface UsageSummary {
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
}

export function summarizeUsage(rows: UsageEntry[], days = 14): UsageSummary {
  const totals = {
    requests: rows.length,
    ok: 0,
    errors: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    avgLatencyMs: 0,
    errorRate: 0,
  };
  let latencySum = 0;
  let latencyCount = 0;

  const dayMap = new Map<string, { requests: number; tokens: number; costUsd: number; errors: number }>();
  const modelMap = new Map<string, { requests: number; tokens: number; costUsd: number }>();
  const taskMap = new Map<string, { requests: number; tokens: number; costUsd: number }>();

  for (const row of rows) {
    if (row.status === 'ok') totals.ok += 1;
    else totals.errors += 1;
    totals.promptTokens += row.promptTokens || 0;
    totals.completionTokens += row.completionTokens || 0;
    totals.totalTokens += row.totalTokens || 0;
    totals.costUsd += row.costUsd || 0;
    if (row.latencyMs) {
      latencySum += row.latencyMs;
      latencyCount += 1;
    }
    const day = (row.at || '').slice(0, 10);
    const d = dayMap.get(day) || { requests: 0, tokens: 0, costUsd: 0, errors: 0 };
    d.requests += 1;
    d.tokens += row.totalTokens || 0;
    d.costUsd += row.costUsd || 0;
    if (row.status === 'error') d.errors += 1;
    dayMap.set(day, d);

    const m = modelMap.get(row.model) || { requests: 0, tokens: 0, costUsd: 0 };
    m.requests += 1;
    m.tokens += row.totalTokens || 0;
    m.costUsd += row.costUsd || 0;
    modelMap.set(row.model, m);

    const t = taskMap.get(row.task) || { requests: 0, tokens: 0, costUsd: 0 };
    t.requests += 1;
    t.tokens += row.totalTokens || 0;
    t.costUsd += row.costUsd || 0;
    taskMap.set(row.task, t);
  }

  totals.avgLatencyMs = latencyCount ? Math.round(latencySum / latencyCount) : 0;
  totals.errorRate = totals.requests ? Number(((totals.errors / totals.requests) * 100).toFixed(1)) : 0;

  const byDay: UsageSummary['byDay'] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = dayMap.get(key) || { requests: 0, tokens: 0, costUsd: 0, errors: 0 };
    byDay.push({ date: key, ...found });
  }

  return {
    totals,
    byDay,
    byModel: [...modelMap.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.requests - a.requests),
    byTask: [...taskMap.entries()]
      .map(([task, v]) => ({ task, ...v }))
      .sort((a, b) => b.requests - a.requests),
    recent: rows.slice(0, 25),
    errors: rows.filter((r) => r.status === 'error').slice(0, 20),
  };
}
