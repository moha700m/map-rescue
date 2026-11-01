'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ClipboardList, Copy, Store, Wrench } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskRunner from '@/components/ai/TaskRunner';
import { EmptyState, PageHeader, Progress, SectionCard } from '@/components/ui/primitives';
import { Ring } from '@/components/ui/charts';
import { buildCorrections, correctionsText, type FixKey } from '@/lib/corrections';
import { useCases, upsertCase } from '@/lib/client/store';
import { caseTaskInput } from '@/lib/case-input';
import { toast } from '@/lib/client/toast';
import type { CaseRecord } from '@/lib/types';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import { cn } from '@/lib/utils';

export default function FixPage() {
  const cases = useCases();
  const [caseId, setCaseId] = useState('');
  const [live, setLive] = useState<CaseRecord | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const candidates = useMemo(() => cases.filter((c) => c.status !== 'reinstated'), [cases]);

  useEffect(() => {
    if (!caseId && candidates.length) setCaseId(candidates[0].id);
  }, [candidates, caseId]);

  useEffect(() => {
    setLive(candidates.find((c) => c.id === caseId) ?? null);
  }, [caseId, cases, candidates]);

  const result = live ? buildCorrections(live) : null;

  function toggle(key: FixKey, value: boolean) {
    if (!live) return;
    const corrections = { ...(live.corrections ?? {}), [key]: value };
    const updated: CaseRecord = { ...live, corrections, correctionsUpdatedAt: new Date().toISOString() };
    upsertCase(updated);
    setLive(updated);
  }

  async function copy(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast('تعذّر النسخ', { tone: 'error' });
    }
  }

  function onRegenerated(res: RunTaskResponse) {
    if (!res.ok || !live) return;
    const parsed = res.parsed as { appeal?: { ar?: string; en?: string } } | null;
    if (!parsed?.appeal) return;
    const updated: CaseRecord = {
      ...live,
      appealAr: parsed.appeal.ar,
      appealEn: parsed.appeal.en,
      status: 'appeal_ready',
      timeline: [...live.timeline, { at: new Date().toISOString(), label: 'أعدنا توليد الاستئناف بعد التصحيح', tone: 'neutral' }],
    };
    upsertCase(updated);
    setLive(updated);
    toast('انحدّث الاستئناف', { description: 'صار يطابق الوضع بعد التصحيح', tone: 'success' });
  }

  if (!candidates.length) {
    return (
      <AppShell>
        <PageHeader title="لوحة التصحيح" description="نعطيك القيمة الصحيحة لكل حقل — تنسخها وتلصقها في قوقل." />
        <EmptyState
          icon={Wrench}
          title="ما فيه قضايا"
          description="أضف قضية أول، وبعدها نطلع لك جدول التصحيح."
          action={
            <Link href="/new-case" className="btn-primary">
              أضف قضية
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="لوحة التصحيح"
        description="قوقل ما تسمح بتعديل ملف معلّق آليًا — فنجهّز لك القيمة الصحيحة لكل حقل، تنسخها وتلصقها في دقيقة."
        actions={
          <Link href="/submit" className="btn-ghost">
            حزمة التقديم <ArrowLeft size={14} />
          </Link>
        }
      />

      <div className="card mb-3 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end">
        <label className="block sm:flex-1">
          <span className="label">القضية</span>
          <select className="select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.businessName}
              </option>
            ))}
          </select>
        </label>
        {live ? (
          <button type="button" className="btn-ghost" onClick={() => copy(correctionsText(live), 'all')}>
            <Copy size={14} /> {copied === 'all' ? 'تم النسخ' : 'انسخ كل التصحيحات'}
          </button>
        ) : null}
      </div>

      {live && result ? (
        <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-3">
            <SectionCard
              title="التصحيحات المطلوبة"
              description="الصق القيمة الصحيحة في قوقل، وبعدها علّم عليها ✓"
              action={
                <span className={cn('badge', result.blocking.length ? 'badge-amber' : 'badge-mint')}>
                  {result.blocking.length ? `${result.blocking.length} بند حرج` : 'جاهز للاستئناف'}
                </span>
              }
            >
              <div className="space-y-2">
                {result.fixes.map((fix) => (
                  <div
                    key={fix.key}
                    className={cn(
                      'rounded-xl border p-3 transition-colors',
                      fix.done ? 'border-mint-500/25 bg-mint-500/[0.04]' : 'border-line/70 bg-ink-900/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-100">
                          {fix.label}
                          {fix.critical ? <span className="badge-rose">حرج</span> : null}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{fix.why}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(fix.key, !fix.done)}
                        className={cn('btn-sm shrink-0', fix.done ? 'btn-subtle text-mint-400' : 'btn-ghost')}
                      >
                        <Check size={12} /> {fix.done ? 'تم' : 'علّم كمنفّذ'}
                      </button>
                    </div>

                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      <div className="rounded-lg border border-line/50 bg-black/20 p-2">
                        <p className="text-[9px] font-bold text-slate-600">الحالي</p>
                        <p className="mt-0.5 break-words text-[11px] text-slate-400 line-through decoration-rosex-500/40" dir="auto">
                          {fix.current || '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-mint-500/25 bg-mint-500/[0.06] p-2">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[9px] font-bold text-mint-400">الصحيح</p>
                          <button type="button" onClick={() => copy(fix.corrected, fix.key)} className="text-slate-400 hover:text-white" aria-label="نسخ">
                            {copied === fix.key ? <CheckCircle2 size={11} className="text-mint-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                        <p className="mt-0.5 break-words text-[11px] font-semibold text-slate-100" dir="auto">
                          {fix.corrected || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="بعد التصحيح" description="لا تقدّم قبل ما تخلص البنود الحرجة">
              <ul className="space-y-1.5">
                {[
                  ['1', 'طبّق التصحيحات في Business Profile Manager (يدويًا — قوقل ما تقبل API على ملف معلّق).'],
                  ['2', 'هات صور جديدة للواجهة واللافتة بعد التصحيح.'],
                  ['3', 'أعد توليد نص الاستئناف عشان يطابق الوضع الجديد.'],
                  ['4', 'قدّم من أداة الاستئناف الرسمية، ومستندات كاملة.'],
                ].map(([n, text]) => (
                  <li key={n} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                    <span className="num grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-500/15 text-[10px] font-bold text-brand-200">{n}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          <div className="space-y-3">
            <SectionCard title="نسبة التصحيح">
              <div className="flex items-center gap-4">
                <Ring value={result.progress} size={82} tone={result.progress === 100 ? 'mint' : 'amber'} sublabel="منفّذ" />
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p>
                    منفّذ: <span className="num text-white">{result.fixes.filter((f) => f.done).length}/{result.fixes.length}</span>
                  </p>
                  <p>
                    حرج متبقّي: <span className={cn('num', result.blocking.length ? 'text-rosex-400' : 'text-mint-400')}>{result.blocking.length}</span>
                  </p>
                </div>
              </div>
              <Progress className="mt-3" value={result.progress} tone={result.progress === 100 ? 'mint' : 'amber'} />
            </SectionCard>

            <SectionCard title="نوع النشاط" description="يحدد هل تعرض العنوان أو تخفيه">
              <div className="flex items-start gap-2 rounded-xl border border-line/70 bg-ink-900/50 p-3">
                <Store size={15} className="mt-0.5 text-brand-300" />
                <div className="text-[11px] leading-relaxed text-slate-300">
                  {result.businessType === 'storefront' ? (
                    <>
                      <p className="font-bold text-white">محل يستقبل عملاء</p>
                      <p className="text-slate-400">اعرض العنوان الكامل + اللافتة إلزامية. أي إخفاء للعنوان يزيد الشك.</p>
                    </>
                  ) : result.businessType === 'sab' ? (
                    <>
                      <p className="font-bold text-white">نشاط خدمي (SAB)</p>
                      <p className="text-slate-400">أخفِ العنوان نهائيًا وحدّد نطاق خدمة واضح — عرض العنوان هنا مخالفة.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-white">غير واضح</p>
                      <p className="text-slate-400">أكّد مع العميل: يستقبل عملاء في الموقع؟ الإجابة تحدد نوع الملف.</p>
                    </>
                  )}
                </div>
              </div>
            </SectionCard>

            {result.needsNewAppeal ? (
              <div className="rounded-xl border border-amberx-500/30 bg-amberx-500/[0.07] p-3 text-[11px] leading-relaxed text-amberx-200">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={12} /> التصحيح صار بعد التقديم
                </p>
                <p className="mt-1">الاستئناف القديم لا يعكس الوضع الجديد — انتظر الرد، وإذا انرفض قدّم بنسخة محدثة.</p>
              </div>
            ) : null}

            <SectionCard title="النص الجاهز" description="يُعاد توليده بعد التصحيح">
              <div className="flex flex-col gap-1.5">
                <TaskRunner
                  taskId="appeal-generation"
                  input={caseTaskInput(live)}
                  caseCode={live.code}
                  label="أعد توليد الاستئناف"
                  onComplete={onRegenerated}
                />
                {live.appealAr ? (
                  <button type="button" className="btn-ghost btn-sm justify-center" onClick={() => copy(live.appealAr ?? '', 'appeal')}>
                    <ClipboardList size={12} /> {copied === 'appeal' ? 'تم النسخ' : 'انسخ الاستئناف الحالي'}
                  </button>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
