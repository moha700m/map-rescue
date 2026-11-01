'use client';

import { useMemo, useState } from 'react';
import { Building2, CalendarClock, FileSearch, MapPin, Phone, Save, Sparkles, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import TaskRunner from '@/components/ai/TaskRunner';
import ResultView from '@/components/ai/ResultView';
import { RiskBadge, StatusBadge, DocBadge } from '@/components/ui/primitives';
import { STATUS_META, STATUS_ORDER, COUNTRY_META } from '@/lib/constants';
import type { CaseRecord, CaseStatus, DiagnosisResult } from '@/lib/types';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import { upsertCase } from '@/lib/client/store';
import { toast } from '@/lib/client/toast';
import { formatDate, timeAgo } from '@/lib/utils';

export function caseTaskInput(record: CaseRecord) {
  return {
    caseCode: record.code,
    businessName: record.businessName,
    category: record.category,
    address: record.address,
    city: record.city,
    country: COUNTRY_META[record.country]?.label ?? record.country,
    website: record.website ?? '',
    phone: record.phone ?? '',
    suspensionDate: record.suspensionDate ?? '',
    suspensionMessage: record.suspensionMessage ?? '',
    previousAppeals: record.previousAppeals ?? 'لا يوجد',
    isStorefront: record.isStorefront,
    customersVisit: record.customersVisit,
    hasSignage: record.hasSignage,
    documents: record.documents.map((d) => ({
      name: d.name,
      type: d.category,
      status: d.status,
      extractedText: d.extractedText?.slice(0, 4000) ?? undefined,
    })),
    currentDiagnosis: record.diagnosis?.rootCause.label ?? null,
  };
}

export default function CaseDetail({ record, onClose }: { record: CaseRecord; onClose: () => void }) {
  const [status, setStatus] = useState<CaseStatus>(record.status);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | undefined>(record.diagnosis);
  const input = useMemo(() => caseTaskInput(record), [record]);

  function handleDiagnosis(result: RunTaskResponse) {
    if (!result.ok) return;
    const parsed = result.parsed as DiagnosisResult | null;
    if (!parsed || !parsed.rootCause) return;
    const next: CaseRecord = {
      ...record,
      status: 'diagnosis_ready',
      diagnosis: parsed,
      riskLevel: parsed.riskLevel ?? record.riskLevel,
      confidence: parsed.confidence ?? parsed.rootCause.confidence,
      appealAr: parsed.appealDraft?.ar ?? record.appealAr,
      appealEn: parsed.appealDraft?.en ?? record.appealEn,
      timeline: [
        ...record.timeline,
        { at: new Date().toISOString(), label: 'تشخيص جديد من OpenRouter', tone: 'good' },
      ],
    };
    upsertCase(next);
    setDiagnosis(parsed);
    setStatus('diagnosis_ready');
    toast('تم حفظ التشخيص في القضية', { description: result.model, tone: 'success' });
  }

  function handleStatus(next: CaseStatus) {
    setStatus(next);
    upsertCase({
      ...record,
      status: next,
      timeline: [...record.timeline, { at: new Date().toISOString(), label: `تغيير الحالة إلى: ${STATUS_META[next].label}`, tone: 'neutral' }],
    });
    toast('تم تحديث الحالة', { tone: 'success' });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={record.businessName}
      description={`${record.code} · ${record.category}`}
      footer={
        <>
          <button type="button" className="btn-subtle" onClick={onClose}>
            إغلاق
          </button>
          <select
            value={status}
            onChange={(e) => handleStatus(e.target.value as CaseStatus)}
            className="select w-auto"
            aria-label="تغيير حالة القضية"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <TaskRunner
            taskId="gbp-diagnosis"
            input={input}
            caseCode={record.code}
            label="تشخيص عبر AI"
            onComplete={handleDiagnosis}
          />
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {record.riskLevel ? <RiskBadge level={record.riskLevel} /> : null}
          {record.confidence ? <span className="badge-brand">ثقة {record.confidence}%</span> : null}
          <span className="badge-muted">
            <CalendarClock size={10} /> {formatDate(record.createdAt)}
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { icon: User, label: 'العميل', value: record.customerName },
            { icon: Phone, label: 'الهاتف', value: record.customerPhone, ltr: true },
            { icon: Building2, label: 'الفئة', value: record.category },
            { icon: MapPin, label: 'العنوان', value: `${record.address} — ${record.city}, ${COUNTRY_META[record.country]?.label ?? record.country}` },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-line/70 bg-ink-900/50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <row.icon size={11} /> {row.label}
              </p>
              <p className="mt-1 text-xs text-slate-200" dir={row.ltr ? 'ltr' : undefined}>
                {row.value || '—'}
              </p>
            </div>
          ))}
        </div>

        {record.suspensionMessage ? (
          <div className="rounded-xl border border-rosex-500/25 bg-rosex-500/[0.06] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rosex-300">رسالة التعليق من Google</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{record.suspensionMessage}</p>
          </div>
        ) : null}

        <div>
          <p className="section-title mb-2">المستندات ({record.documents.length})</p>
          {record.documents.length ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {record.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <span className="truncate text-[11px] text-slate-300">{doc.name}</span>
                  <DocBadge category={doc.category} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-slate-500">
              لا مستندات مرفوعة لهذه القضية
            </p>
          )}
        </div>

        {diagnosis ? (
          <div>
            <p className="section-title mb-2 flex items-center gap-1.5">
              <Sparkles size={11} /> نتيجة التشخيص
            </p>
            <ResultView parsed={diagnosis} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-ink-900/40 p-4 text-center">
            <FileSearch size={20} className="mx-auto text-slate-500" />
            <p className="mt-2 text-xs text-slate-400">لا يوجد تشخيص محفوظ — شغّل التشخيص عبر OpenRouter.</p>
          </div>
        )}

        <div>
          <p className="section-title mb-2">الخط الزمني</p>
          <ol className="space-y-2 border-s border-line/70 ps-3">
            {[...record.timeline].reverse().map((event, i) => (
              <li key={`${event.at}-${i}`} className="relative">
                <span
                  className={`absolute -start-[17px] top-1.5 h-2 w-2 rounded-full border-2 border-ink-900 ${
                    event.tone === 'good'
                      ? 'bg-mint-400'
                      : event.tone === 'bad'
                        ? 'bg-rosex-400'
                        : event.tone === 'warn'
                          ? 'bg-amberx-400'
                          : 'bg-slate-500'
                  }`}
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
          <TaskRunner taskId="suspension-investigation" input={input} caseCode={record.code} variant="ghost" label="تحقيق موسّع" />
          <TaskRunner taskId="appeal-generation" input={input} caseCode={record.code} variant="ghost" label="توليد استئناف" />
          <TaskRunner taskId="case-summary" input={input} caseCode={record.code} variant="ghost" label="ملخص للفريق" />
        </div>
      </div>
    </Modal>
  );
}
