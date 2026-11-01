'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Building2, MapPin, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import AppShell from '@/components/AppShell';
import CaseDetail from '@/components/cases/CaseDetail';
import TaskRunner from '@/components/ai/TaskRunner';
import { EmptyState, PageHeader, RiskBadge, StatusBadge, Segmented } from '@/components/ui/primitives';
import { caseTaskInput } from '@/components/cases/CaseDetail';
import { useCases } from '@/lib/client/store';
import { COUNTRY_META } from '@/lib/constants';
import type { CaseRecord } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

export default function SuspendedPage() {
  const cases = useCases();
  const [risk, setRisk] = useState<'all' | 'high' | 'medium'>('all');
  const [selected, setSelected] = useState<CaseRecord | null>(null);

  const suspended = useMemo(
    () =>
      cases
        .filter((c) => !['reinstated', 'new'].includes(c.status))
        .filter((c) => (risk === 'all' ? true : c.riskLevel === risk))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [cases, risk],
  );

  return (
    <AppShell>
      <PageHeader
        title="الملفات المعلقة"
        description="كل ملف معلّق مع درجة الخطر وحالة التشخيص — ابدأ التشخيص أو راجع خطة الاسترداد."
        actions={
          <>
            <Segmented
              value={risk}
              onChange={setRisk}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'high', label: 'مخاطر مرتفعة' },
                { value: 'medium', label: 'متوسطة' },
              ]}
            />
            <Link href="/new-case" className="btn-primary">
              <Plus size={15} /> قضية
            </Link>
          </>
        }
      />

      {suspended.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suspended.map((c) => (
            <article key={c.id} className="card card-hover flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    {c.riskLevel ? <RiskBadge level={c.riskLevel} /> : null}
                  </div>
                  <h3 className="truncate text-sm font-bold text-white">{c.businessName}</h3>
                  <p className="truncate text-[11px] text-slate-500">{c.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="rounded-lg border border-line p-1.5 text-slate-400 transition-colors hover:border-line-strong hover:text-white"
                  aria-label="عرض التفاصيل"
                >
                  <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] text-slate-400">
                <p className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-slate-500" />
                  {c.city} — {COUNTRY_META[c.country]?.flag} {COUNTRY_META[c.country]?.label}
                </p>
                <p className="flex items-center gap-1.5">
                  <Building2 size={11} className="text-slate-500" />
                  {c.address}
                </p>
              </div>

              {c.diagnosis ? (
                <div className="mt-3 rounded-lg border border-line/60 bg-ink-900/60 p-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-300">
                    <Sparkles size={10} /> السبب الأرجح
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-300">{c.diagnosis.rootCause.label}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="num">ثقة {c.diagnosis.confidence}%</span>
                    <span>· {c.diagnosis.recoveryPlan.length} خطوة</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-line/70 bg-ink-900/40 p-2.5 text-[11px] text-slate-500">
                  <ShieldAlert size={13} /> لا تشخيص بعد
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                <span className="text-[10px] text-slate-600">{timeAgo(c.updatedAt)}</span>
                <div className="flex gap-1.5">
                  <TaskRunner
                    taskId={c.diagnosis ? 'recovery-recommendations' : 'gbp-diagnosis'}
                    input={caseTaskInput(c)}
                    caseCode={c.code}
                    variant="ghost"
                    className="btn-sm"
                    label={c.diagnosis ? 'توصيات' : 'تشخيص'}
                  />
                  <button type="button" className="btn-subtle btn-sm" onClick={() => setSelected(c)}>
                    التفاصيل
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="لا ملفات معلقة ضمن هذا الفلتر"
          description="جميع القضايا إما مستعادة أو لم تبدأ بعد."
          action={
            <Link href="/customers" className="btn-ghost">
              مراجعة كل القضايا
            </Link>
          }
        />
      )}

      {selected ? <CaseDetail record={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}
