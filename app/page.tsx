'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import CaseDetail from '@/components/cases/CaseDetail';
import { PageHeader, SectionCard, Stat, StatusBadge, RiskBadge, EmptyState } from '@/components/ui/primitives';
import { Ring, Sparkline, UsageBars, HBar } from '@/components/ui/charts';
import { useCases } from '@/lib/client/store';
import { fetchUsage } from '@/lib/client/ai';
import type { UsagePayload } from '@/lib/ai/contracts';
import type { CaseRecord } from '@/lib/types';
import { COUNTRY_META, TASK_LABEL } from '@/lib/constants';
import { formatDate, formatTokens, formatUsd, timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const cases = useCases();
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [selected, setSelected] = useState<CaseRecord | null>(null);

  useEffect(() => {
    fetchUsage(14).then(setUsage).catch(() => undefined);
  }, [cases.length]);

  const stats = useMemo(() => {
    const closed = cases.filter((c) => ['reinstated', 'rejected', 'submitted'].includes(c.status));
    const reinstated = cases.filter((c) => c.status === 'reinstated').length;
    const suspended = cases.filter((c) => !['reinstated', 'new'].includes(c.status)).length;
    return {
      total: cases.length,
      suspended,
      readyAppeals: cases.filter((c) => c.status === 'appeal_ready').length,
      successRate: closed.length ? Math.round((reinstated / closed.length) * 100) : 0,
      highRisk: cases.filter((c) => c.riskLevel === 'high').length,
      automation: cases.filter((c) => c.diagnosis).length,
    };
  }, [cases]);

  const recent = useMemo(
    () => [...cases].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6),
    [cases],
  );

  const topRisk = useMemo(
    () => cases.filter((c) => c.riskLevel === 'high' && c.status !== 'reinstated').slice(0, 4),
    [cases],
  );

  const tokensSeries = usage?.summary.byDay.map((d) => d.tokens) ?? [];
  const spend = usage?.budget.spentUsd ?? 0;
  const budget = usage?.budget.monthlyBudgetUsd ?? 50;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations console"
        title="لوحة التحكم"
        description="نظرة شاملة على قضايا استرداد Google Business Profile، وحالة بوابة الذكاء الاصطناعي عبر OpenRouter."
        actions={
          <>
            <Link href="/settings/ai" className="btn-ghost">
              <BrainCircuit size={15} />
              إعدادات AI
            </Link>
            <Link href="/new-case" className="btn-primary">
              <Plus size={15} />
              قضية جديدة
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="إجمالي القضايا" value={stats.total} hint={`${stats.automation} موثّقة بتشخيص AI`} icon={Users} tone="brand" href="/customers" />
        <Stat label="ملفات معلّقة" value={stats.suspended} hint={`${stats.highRisk} بمخاطر مرتفعة`} icon={AlertTriangle} tone="rose" href="/suspended" />
        <Stat label="استئنافات جاهزة" value={stats.readyAppeals} hint="بانتظار تقديم يدوي" icon={FileText} tone="amber" href="/appeals" />
        <Stat label="معدل الاسترداد" value={`${stats.successRate}%`} hint="من القضايا المغلقة" icon={TrendingUp} tone="mint" href="/tracker" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="استهلاك الذكاء الاصطناعي — 14 يومًا"
          description="كل رمز وكل دولار يمر عبر OpenRouter ومُسجّل هنا"
          action={
            <Link href="/settings/ai?tab=usage" className="btn-subtle btn-sm">
              التفاصيل <ArrowLeft size={12} />
            </Link>
          }
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-3">
              <Ring value={usage?.budget.pct ?? 0} tone={(usage?.budget.pct ?? 0) > 85 ? 'rose' : 'brand'} sublabel="الميزانية" />
              <div>
                <p className="num text-xl font-bold text-white">{formatUsd(spend)}</p>
                <p className="text-2xs text-slate-500">من {formatUsd(budget)} شهريًا</p>
                <p className="mt-1.5 flex items-center gap-1 text-2xs text-slate-400">
                  <Sparkles size={10} className="text-brand-300" />
                  {formatTokens(usage?.summary.totals.totalTokens ?? 0)} رمز
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between text-2xs text-slate-500">
                <span>{usage?.summary.totals.requests ?? 0} طلب</span>
                <span className="num">
                  متوسط {(usage?.summary.totals.avgLatencyMs ?? 0).toLocaleString('en-US')}ms
                </span>
              </div>
              {usage ? <UsageBars data={usage.summary.byDay} height={104} /> : <div className="skeleton h-[104px]" />}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3">
            <div>
              <p className="text-[10px] text-slate-500">أعلى مهمة</p>
              <p className="truncate text-xs font-semibold text-slate-200">
                {TASK_LABEL[usage?.summary.byTask[0]?.task ?? ''] ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">أعلى نموذج</p>
              <p className="truncate text-xs font-semibold text-slate-200" dir="ltr">
                {usage?.summary.byModel[0]?.model?.split('/')[1] ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">نسبة الأخطاء</p>
              <p className={`text-xs font-semibold ${(usage?.summary.totals.errorRate ?? 0) > 5 ? 'text-rosex-400' : 'text-mint-400'}`}>
                {usage?.summary.totals.errorRate ?? 0}%
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="حالة البوابة" description="OpenRouter كنقطة عبور وحيدة">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-line/70 bg-ink-900/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-mint-400 animate-pulse-ring" />
                <span className="text-xs font-semibold text-slate-200">OpenRouter API</span>
              </div>
              <span className="badge-mint">جاهز</span>
            </div>
            <div className="rounded-xl border border-line/70 bg-ink-900/50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">النموذج الافتراضي</span>
                <span className="badge-brand">قابل للتغيير</span>
              </div>
              <p className="num mt-1 truncate text-[11px] text-slate-200" dir="ltr">
                {usage?.rows?.[0]?.model ?? 'google/gemini-3.8-flash'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line/70 bg-ink-900/50 px-3 py-2.5">
                <p className="text-[10px] text-slate-500">اليوم</p>
                <p className="num text-sm font-bold text-white">
                  {usage?.summary.byDay.at(-1)?.requests ?? 0} <span className="text-[10px] font-normal text-slate-500">طلب</span>
                </p>
              </div>
              <div className="rounded-xl border border-line/70 bg-ink-900/50 px-3 py-2.5">
                <p className="text-[10px] text-slate-500">تكلفة اليوم</p>
                <p className="num text-sm font-bold text-white">{formatUsd(usage?.summary.byDay.at(-1)?.costUsd ?? 0, 3)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-line/70 bg-gradient-to-br from-brand-500/10 to-transparent px-3 py-2.5">
              <p className="text-[10px] text-slate-400">تنبيه الميزانية</p>
              <p className="mt-1 text-[11px] text-slate-300">
                سيتم التنبيه عند تجاوز {usage?.budget.monthlyBudgetUsd ? Math.round((spend / budget) * 100) : 0}% — اضبط الحد من إعدادات AI.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="أحدث القضايا"
          description="مرتبة حسب آخر تحديث"
          action={
            <Link href="/customers" className="btn-subtle btn-sm">
              الكل <ArrowLeft size={12} />
            </Link>
          }
          bodyClassName="p-0"
        >
          {recent.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>القضية</th>
                    <th>النشاط</th>
                    <th>الحالة</th>
                    <th>المخاطر</th>
                    <th>آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                      <td>
                        <p className="num text-[11px] font-bold text-brand-300">{c.code}</p>
                        <p className="text-[11px] text-slate-500">{COUNTRY_META[c.country]?.label ?? c.country}</p>
                      </td>
                      <td>
                        <p className="text-xs font-semibold text-slate-200">{c.businessName}</p>
                        <p className="text-[10px] text-slate-500">{c.category}</p>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>{c.riskLevel ? <RiskBadge level={c.riskLevel} /> : <span className="text-slate-600">—</span>}</td>
                      <td className="text-[11px] text-slate-500">{timeAgo(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="لا توجد قضايا بعد"
                description="أنشئ أول قضية استرداد لتبدأ التشخيص بالذكاء الاصطناعي."
                action={
                  <Link href="/new-case" className="btn-primary">
                    <Plus size={14} /> قضية جديدة
                  </Link>
                }
              />
            </div>
          )}
        </SectionCard>

        <SectionCard title="أعلى المخاطر" description="تحتاج تدخلًا قبل التقديم">
          {topRisk.length ? (
            <div className="space-y-2">
              {topRisk.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="w-full rounded-xl border border-line/70 bg-ink-900/50 p-2.5 text-start transition-colors hover:border-rosex-500/30 hover:bg-rosex-500/[0.04]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-slate-200">{c.businessName}</p>
                    <RiskBadge level="high" />
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{c.diagnosis?.rootCause.label ?? c.suspensionMessage}</p>
                  <p className="num mt-1 text-[10px] text-slate-600">{c.code}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-line/60 bg-ink-900/40 p-4 text-center">
              <CheckCircle2 size={20} className="mx-auto text-mint-400" />
              <p className="mt-2 text-xs text-slate-400">لا قضايا عالية المخاطر حاليًا</p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="توزيع المهام" description="أين تذهب طلبات الذكاء الاصطناعي">
          {usage?.summary.byTask.length ? (
            <HBar
              items={usage.summary.byTask.slice(0, 6).map((t) => ({ label: TASK_LABEL[t.task] ?? t.task, value: t.requests }))}
              formatter={(n) => `${n}`}
            />
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">لا استهلاك مسجّل بعد — شغّل أول مهمة من صفحة القضايا.</p>
          )}
        </SectionCard>

        <SectionCard title="إيقاع العمل" description="آخر 14 يومًا">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Gauge size={13} /> الطلبات
              </span>
              <span className="num text-sm font-bold text-white">{usage?.summary.totals.requests ?? 0}</span>
            </div>
            <Sparkline data={usage?.summary.byDay.map((d) => d.requests) ?? []} tone="brand" height={44} />
            <div className="flex items-center justify-between border-t border-line/60 pt-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock size={13} /> متوسط الزمن
              </span>
              <span className="num text-sm font-bold text-white">{((usage?.summary.totals.avgLatencyMs ?? 0) / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Wallet size={13} /> التكلفة
              </span>
              <span className="num text-sm font-bold text-white">{formatUsd(spend)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Activity size={13} /> المهام المنفذة
              </span>
              <span className="num text-sm font-bold text-white">{usage?.summary.totals.ok ?? 0}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {selected ? <CaseDetail record={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}
