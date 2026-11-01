import { NextResponse } from 'next/server';
import { getSettings, listUsage } from '@/lib/ai/storage';
import { summarizeUsage } from '@/lib/ai/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(20, Number(url.searchParams.get('limit') || 200)));
  const days = Math.min(60, Math.max(7, Number(url.searchParams.get('days') || 14)));
  const [rows, settings] = await Promise.all([listUsage(limit), getSettings()]);
  const summary = summarizeUsage(rows, days);
  return NextResponse.json({
    ok: true,
    settings,
    summary,
    rows,
    budget: {
      monthlyBudgetUsd: settings.monthlyBudgetUsd,
      spentUsd: Number(summary.totals.costUsd.toFixed(4)),
      pct: settings.monthlyBudgetUsd
        ? Number(((summary.totals.costUsd / settings.monthlyBudgetUsd) * 100).toFixed(1))
        : 0,
    },
  });
}
