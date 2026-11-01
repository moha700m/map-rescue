'use client';

import { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, XCircle } from 'lucide-react';
import AppShell from '@/components/AppShell';
import CaseDetail from '@/components/cases/CaseDetail';
import { PageHeader, Progress } from '@/components/ui/primitives';
import { useCases } from '@/lib/client/store';
import { STATUS_META } from '@/lib/constants';
import type { CaseRecord, CaseStatus } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

const COLUMNS: { status: CaseStatus; tone: string }[] = [
  { status: 'new', tone: 'border-slate-500/30' },
  { status: 'analyzing', tone: 'border-skyx-500/30' },
  { status: 'diagnosis_ready', tone: 'border-brand-500/30' },
  { status: 'pending_docs', tone: 'border-amberx-500/30' },
  { status: 'appeal_ready', tone: 'border-amberx-500/30' },
  { status: 'submitted', tone: 'border-skyx-500/30' },
  { status: 'reinstated', tone: 'border-mint-500/30' },
  { status: 'rejected', tone: 'border-rosex-500/30' },
];

export default function TrackerPage() {
  const cases = useCases();
  const [selected, setSelected] = useState<CaseRecord | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<CaseStatus, CaseRecord[]>();
    COLUMNS.forEach((c) => map.set(c.status, []));
    cases.forEach((c) => map.get(c.status)?.push(c));
    return map;
  }, [cases]);

  const funnel = useMemo(() => {
    const total = cases.length || 1;
    return [
      { label: 'تم التشخيص', value: cases.filter((c) => !!c.diagnosis).length },
      { label: 'استئناف جاهز', value: cases.filter((c) => ['appeal_ready', 'submitted', 'reinstated', 'rejected'].includes(c.status)).length },
      { label: 'تم التقديم', value: cases.filter((c) => ['submitted', 'reinstated', 'rejected'].includes(c.status)).length },
      { label: 'استعادة', value: cases.filter((c) => c.status === 'reinstated').length },
    ].map((s) => ({ ...s, pct: Math.round((s.value / total) * 100) }));
  }, [cases]);

  return (
    <AppShell>
      <PageHeader title="متتبع الاسترداد" description="مسار كل قضية من التشخيص إلى القرار النهائي — تحديث الحالة يوثّق الخط الزمني." />

      <div className="card mb-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.map((step, i) => (
            <div key={step.label}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300">
                  {i === 3 ? <CheckCircle2 size={12} className="text-mint-400" /> : <Clock size={12} className="text-slate-500" />}
                  {step.label}
                </span>
                <span className="num text-slate-400">
                  {step.value} · {step.pct}%
                </span>
              </div>
              <Progress value={step.pct} tone={i === 3 ? 'mint' : i === 0 ? 'brand' : 'amber'} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-4 xl:grid-cols-8">
        {COLUMNS.map((col) => {
          const items = grouped.get(col.status) ?? [];
          return (
            <div key={col.status} className={cn('rounded-xl border border-line/70 bg-ink-900/40 p-2', items.length ? '' : 'opacity-70')}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={cn('badge', STATUS_META[col.status].className)}>{STATUS_META[col.status].label}</span>
                <span className="num text-[10px] text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className="w-full rounded-lg border border-line/60 bg-ink-850/80 p-2 text-start transition-colors hover:border-line-strong"
                  >
                    <p className="truncate text-[11px] font-semibold text-slate-200">{c.businessName}</p>
                    <p className="num mt-0.5 text-[9px] text-slate-600">{c.code}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{timeAgo(c.updatedAt)}</p>
                  </button>
                ))}
                {!items.length ? (
                  <div className="rounded-lg border border-dashed border-line/50 px-2 py-4 text-center text-[9px] text-slate-600">فارغ</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-3 flex items-center gap-2 p-3.5 text-[11px] text-slate-500">
        <Activity size={13} className="text-brand-300" />
        كل تغيير في الحالة يُسجَّل في الخط الزمني للقضية، ويظهر في تقرير العميل.
        <span className="ms-auto flex items-center gap-1 text-[10px] text-slate-600">
          <XCircle size={11} /> القضايا المرفوضة تتطلب إعادة بناء الملف قبل استئناف جديد.
        </span>
      </div>

      {selected ? <CaseDetail record={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}
