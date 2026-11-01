'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FileSearch,
  Loader2,
  MapPin,
  Phone,
  Sparkles,
  TriangleAlert,
  User,
  Zap,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import TaskRunner from '@/components/ai/TaskRunner';
import ResultView from '@/components/ai/ResultView';
import { DocBadge, RiskBadge, StatusBadge } from '@/components/ui/primitives';
import { STATUS_META, STATUS_ORDER, COUNTRY_META } from '@/lib/constants';
import type { CaseRecord, CaseStatus, DiagnosisResult } from '@/lib/types';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import { upsertCase } from '@/lib/client/store';
import { getHealth } from '@/lib/client/ai';
import { runCasePipeline, type PipelineEvent } from '@/lib/client/pipeline';
import { toast } from '@/lib/client/toast';
import { caseTaskInput } from '@/lib/case-input';
import { cn, formatDate, timeAgo } from '@/lib/utils';

export { caseTaskInput } from '@/lib/case-input';

export default function CaseDetail({ record, onClose }: { record: CaseRecord; onClose: () => void }) {
  const [live, setLive] = useState<CaseRecord>(record);
  const [status, setStatus] = useState<CaseStatus>(record.status);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);

  const input = useMemo(() => caseTaskInput(live), [live]);

  useEffect(() => {
    getHealth().then((h) => setHasKey(h.key.present)).catch(() => setHasKey(false));
  }, []);

  async function runAll() {
    setRunning(true);
    setEvents([]);
    try {
      const res = await runCasePipeline(live, {
        onEvent: (e) => setEvents((prev) => [...prev, e]),
      });
      setLive(res.record);
      setStatus(res.record.status);
      if (res.ok) {
        toast('خلص كل شي', { description: 'الاستئناف والتوصيات محفوظة في القضية', tone: 'success' });
      } else {
        toast('توقفنا في النص', { description: 'راجع سجل الخطوات فوق', tone: 'error' });
      }
    } catch (err) {
      toast('صار خطأ', { description: err instanceof Error ? err.message : '', tone: 'error' });
    } finally {
      setRunning(false);
    }
  }

  function handleDiagnosis(result: RunTaskResponse) {
    if (!result.ok) return;
    const parsed = result.parsed as DiagnosisResult | null;
    if (!parsed?.rootCause) return;
    const next: CaseRecord = {
      ...live,
      status: 'diagnosis_ready',
      diagnosis: parsed,
      riskLevel: parsed.riskLevel ?? live.riskLevel,
      confidence: parsed.confidence ?? parsed.rootCause.confidence,
      appealAr: parsed.appealDraft?.ar ?? live.appealAr,
      appealEn: parsed.appealDraft?.en ?? live.appealEn,
      timeline: [...live.timeline, { at: new Date().toISOString(), label: 'تشخيص جديد', tone: 'good' }],
    };
    upsertCase(next);
    setLive(next);
    setStatus('diagnosis_ready');
    toast('انحفظ التشخيص', { description: result.model, tone: 'success' });
  }

  function handleStatus(next: CaseStatus) {
    setStatus(next);
    const updated = {
      ...live,
      status: next,
      timeline: [...live.timeline, { at: new Date().toISOString(), label: `الحالة صارت: ${STATUS_META[next].label}`, tone: 'neutral' as const }],
    };
    upsertCase(updated);
    setLive(updated);
    toast('تحدّثت الحالة', { tone: 'success' });
  }

  const doneCount = events.filter((e) => e.status === 'ok').length;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={live.businessName}
      description={`${live.code} · ${live.category}`}
      footer={
        <>
          <button type="button" className="btn-subtle" onClick={onClose}>
            سكّر
          </button>
          <select
            value={status}
            onChange={(e) => handleStatus(e.target.value as CaseStatus)}
            className="select w-auto"
            aria-label="تغيير الحالة"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <Link href="/fix" className="btn-ghost">
            التصحيح
          </Link>
          <Link href="/submit" className="btn-ghost">
            حزمة التقديم
          </Link>
          <TaskRunner taskId="appeal-generation" input={input} caseCode={live.code} variant="ghost" label="الاستئناف لحاله" />
          <TaskRunner taskId="gbp-diagnosis" input={input} caseCode={live.code} label="تشخيص لحاله" onComplete={handleDiagnosis} />
        </>
      }
    >
      <div className="space-y-4">
        {/* ── automatic pipeline ─────────────────────────────── */}
        <section className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/[0.12] to-transparent p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-300">
                <Zap size={12} /> خلّها علينا
              </p>
              <p className="mt-1 text-sm font-bold text-white">شغّل كل شي بضغطة</p>
              <p className="mt-0.5 max-w-md text-[11px] leading-relaxed text-slate-400">
                يبدأ بالتشخيص، يقارن الأدلة، يكتب الاستئناف، ويطلّع التوصيات والملخص — ويحفظ كل شي في القضية أول بأول.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary shrink-0"
              onClick={runAll}
              disabled={running || hasKey === false}
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {running ? `يشتغل… ${doneCount}` : 'شغّل كل شي'}
            </button>
          </div>

          {hasKey === false ? (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amberx-500/30 bg-amberx-500/[0.08] p-2.5 text-[11px] leading-relaxed text-amberx-200">
              <TriangleAlert size={12} className="mt-0.5 shrink-0" />
              ما فيه مفتاح OpenRouter. أضفه من «إعدادات الذكاء» وبعدها اضغط شغّل كل شي.
            </p>
          ) : null}

          {events.length ? (
            <ol className="mt-2.5 space-y-1">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
                  <span className="mt-0.5 shrink-0">
                    {e.status === 'run' ? (
                      <Loader2 size={12} className="animate-spin text-brand-300" />
                    ) : e.status === 'ok' ? (
                      <CheckCircle2 size={12} className="text-mint-400" />
                    ) : e.status === 'skip' ? (
                      <CircleDashed size={12} className="text-slate-500" />
                    ) : (
                      <TriangleAlert size={12} className="text-rosex-400" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[11px]', e.status === 'fail' ? 'text-rosex-300' : 'text-slate-200')}>
                      {e.title}
                    </span>
                    {e.detail ? <span className="block text-[10px] text-slate-500">{e.detail}</span> : null}
                  </span>
                  {e.ms ? <span className="num text-[10px] text-slate-600">{(e.ms / 1000).toFixed(1)}s</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {live.riskLevel ? <RiskBadge level={live.riskLevel} /> : null}
          {live.confidence ? <span className="badge-brand">ثقة {live.confidence}%</span> : null}
          <span className="badge-muted">
            <CalendarClock size={10} /> {formatDate(live.createdAt)}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { icon: User, label: 'العميل', value: live.customerName },
            { icon: Phone, label: 'الجوال', value: live.customerPhone, ltr: true },
            { icon: Building2, label: 'الفئة', value: live.category },
            { icon: MapPin, label: 'العنوان', value: `${live.address} — ${live.city}` },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-line/70 bg-ink-900/50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <row.icon size={11} /> {row.label}
              </p>
              <p className="mt-1 text-xs text-slate-200" dir={row.ltr ? 'ltr' : undefined}>
                {row.value || '—'}
              </p>
            </div>
          ))}
        </div>

        {live.suspensionMessage ? (
          <div className="rounded-xl border border-rosex-500/25 bg-rosex-500/[0.06] p-3">
            <p className="text-[10px] font-bold text-rosex-300">رسالة قوقل</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{live.suspensionMessage}</p>
          </div>
        ) : null}

        <div>
          <p className="section-title mb-2">المستندات ({live.documents.length})</p>
          {live.documents.length ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {live.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <span className="truncate text-[11px] text-slate-300">{doc.name}</span>
                  <DocBadge category={doc.category} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-slate-500">
              ما فيه مستندات — ارفعها من صفحة المستندات وبتنربط بالقضية تلقائي.
            </p>
          )}
        </div>

        {live.diagnosis ? (
          <div>
            <p className="section-title mb-2 flex items-center gap-1.5">
              <Sparkles size={11} /> نتيجة التشخيص
            </p>
            <ResultView parsed={live.diagnosis} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-ink-900/40 p-4 text-center">
            <FileSearch size={20} className="mx-auto text-slate-500" />
            <p className="mt-2 text-xs text-slate-400">ما فيه تشخيص بعد — اضغط «شغّل كل شي» فوق.</p>
          </div>
        )}

        {live.intel?.evidence ? (
          <div>
            <p className="section-title mb-2">مقارنة الأدلة</p>
            <ResultView parsed={live.intel.evidence} />
          </div>
        ) : null}

        {live.intel?.recommendations ? (
          <div>
            <p className="section-title mb-2">التوصيات</p>
            <ResultView parsed={live.intel.recommendations} />
          </div>
        ) : null}

        <div>
          <p className="section-title mb-2">وش صار في القضية</p>
          <ol className="space-y-2 border-s border-line/70 ps-3">
            {[...live.timeline].reverse().map((event, i) => (
              <li key={`${event.at}-${i}`} className="relative">
                <span
                  className={cn(
                    'absolute -start-[17px] top-1.5 h-2 w-2 rounded-full border-2 border-ink-900',
                    event.tone === 'good'
                      ? 'bg-mint-400'
                      : event.tone === 'bad'
                        ? 'bg-rosex-400'
                        : event.tone === 'warn'
                          ? 'bg-amberx-400'
                          : 'bg-slate-500',
                  )}
                />
                <p className="text-[11px] text-slate-300">{event.label}</p>
                <p className="text-[10px] text-slate-600">
                  {formatDate(event.at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {timeAgo(event.at)}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line/60 pt-3">
          <TaskRunner taskId="policy-analysis" input={input} caseCode={live.code} variant="ghost" label="تحليل السياسات" />
          <TaskRunner taskId="recovery-recommendations" input={input} caseCode={live.code} variant="ghost" label="توصيات إضافية" />
          <TaskRunner taskId="customer-report" input={input} caseCode={live.code} variant="ghost" label="تقرير للعميل" />
        </div>
      </div>
    </Modal>
  );
}
