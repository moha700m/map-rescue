'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CircleDollarSign, Download, FileText, Percent, Timer, Wallet } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskRunner from '@/components/ai/TaskRunner';
import { EmptyState, Field, PageHeader, SectionCard, Stat, StatusBadge } from '@/components/ui/primitives';
import { HBar, Ring } from '@/components/ui/charts';
import { caseTaskInput } from '@/components/cases/CaseDetail';
import { useCases } from '@/lib/client/store';
import { STATUS_META, STATUS_ORDER, COUNTRY_META } from '@/lib/constants';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import { formatUsd } from '@/lib/utils';

export default function ReportsPage() {
  const cases = useCases();
  const [caseId, setCaseId] = useState(cases[0]?.id ?? '');
  const [report, setReport] = useState('');
  const selected = cases.find((c) => c.id === caseId) ?? cases[0];

  const metrics = useMemo(() => {
    const closed = cases.filter((c) => ['reinstated', 'rejected', 'submitted'].includes(c.status));
    const reinstated = cases.filter((c) => c.status === 'reinstated').length;
    const totalFees = cases.reduce((sum, c) => sum + (c.fee ?? 0), 0);
    const paidFees = cases.filter((c) => ['reinstated', 'submitted'].includes(c.status)).reduce((s, c) => s + (c.fee ?? 0), 0);
    const avgAge =
      cases.length
        ? Math.round(
            cases.reduce((sum, c) => sum + (Date.now() - new Date(c.createdAt).getTime()) / 86_400_000, 0) / cases.length,
          )
        : 0;
    return {
      successRate: closed.length ? Math.round((reinstated / closed.length) * 100) : 0,
      totalFees,
      paidFees,
      avgAge,
      open: cases.filter((c) => !['reinstated', 'rejected'].includes(c.status)).length,
    };
  }, [cases]);

  const byCity = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => map.set(c.city, (map.get(c.city) ?? 0) + 1));
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [cases]);

  const statusDist = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        status: s,
        count: cases.filter((c) => c.status === s).length,
      })).filter((s) => s.count > 0),
    [cases],
  );

  function onReport(res: RunTaskResponse) {
    if (res.ok) setReport(res.content);
  }

  function download() {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report-${selected?.code ?? 'case'}.md`;
    a.click();
  }

  return (
    <AppShell>
      <PageHeader
        title="التقارير"
        description="مؤشرات الأداء، وتوليد تقرير عميل جاهز للإرسال عبر OpenRouter."
        actions={
          selected ? (
            <TaskRunner taskId="customer-report" input={caseTaskInput(selected)} caseCode={selected.code} label="توليد تقرير العميل" onComplete={onReport} />
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="معدل الاسترداد" value={`${metrics.successRate}%`} icon={Percent} tone="mint" hint="من القضايا المغلقة" />
        <Stat label="القضايا المفتوحة" value={metrics.open} icon={BarChart3} tone="brand" hint="قيد العمل" />
        <Stat label="إجمالي الأتعاب" value={formatUsd(metrics.totalFees, 0)} icon={Wallet} tone="amber" hint={`${formatUsd(metrics.paidFees, 0)} محصّلة`} />
        <Stat label="متوسط عمر القضية" value={`${metrics.avgAge} يوم`} icon={Timer} tone="sky" hint="من الإنشاء حتى اليوم" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="توزيع الحالات" description="حيث تتوقف القضايا">
          {statusDist.length ? (
            <HBar
              items={statusDist.map((s) => ({ label: STATUS_META[s.status].label, value: s.count, tone: s.status === 'reinstated' ? 'mint' : s.status === 'rejected' ? 'amber' : 'brand' }))}
              formatter={(n) => `${n} قضية`}
            />
          ) : (
            <p className="py-8 text-center text-xs text-slate-500">لا بيانات</p>
          )}
        </SectionCard>

        <SectionCard title="التوزيع الجغرافي" description="أعلى المدن">
          {byCity.length ? <HBar items={byCity.map((c) => ({ ...c, tone: 'sky' }))} formatter={(n) => `${n}`} /> : <p className="py-8 text-center text-xs text-slate-500">لا بيانات</p>}
        </SectionCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        <SectionCard title="مؤشر الجودة" description="ملخص تشغيلي">
          <div className="flex items-center gap-5">
            <Ring value={metrics.successRate} size={92} tone="mint" sublabel="استرداد" />
            <div className="space-y-2 text-[11px]">
              <p className="flex items-center gap-1.5 text-slate-300">
                <CircleDollarSign size={12} className="text-amberx-400" />
                متوسط الأتعاب: <span className="num text-white">{formatUsd(cases.length ? metrics.totalFees / cases.length : 0, 0)}</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-300">
                <FileText size={12} className="text-brand-300" />
                قضايا موثّقة: <span className="num text-white">{cases.filter((c) => !!c.diagnosis).length}</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-300">
                <Percent size={12} className="text-mint-400" />
                أعلى مدينة: <span className="text-white">{byCity[0]?.label ?? '—'}</span>
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="تقرير العميل"
          description="يُولَّد بالعربية بنبرة واضحة وغير تقنية"
          action={
            report ? (
              <button type="button" className="btn-ghost btn-sm" onClick={download}>
                <Download size={12} /> تنزيل MD
              </button>
            ) : null
          }
        >
          {cases.length ? (
            <div className="space-y-2.5">
              <Field label="اختر القضية">
                <select className="select" value={selected?.id ?? ''} onChange={(e) => setCaseId(e.target.value)}>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.businessName}
                    </option>
                  ))}
                </select>
              </Field>
              {report ? (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-line/70 bg-ink-900/60 p-3">
                  <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300" dir="rtl">
                    {report}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-ink-900/40 p-6 text-center">
                  <FileText size={20} className="mx-auto text-slate-500" />
                  <p className="mt-2 text-[11px] text-slate-400">اضغط «توليد تقرير العميل» بالأعلى لإنشاء التقرير.</p>
                </div>
              )}
              {selected ? (
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <StatusBadge status={selected.status} />
                  <span>
                    {selected.city} · {COUNTRY_META[selected.country]?.label}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState icon={FileText} title="لا قضايا" description="أنشئ قضية أولًا." />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
