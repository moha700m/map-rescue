'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  CircleCheck,
  FileUp,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { PageHeader, StatusBadge } from '@/components/ui/primitives';
import TaskRunner from '@/components/ai/TaskRunner';
import { COUNTRY_META } from '@/lib/constants';
import { newCaseDraft, upsertCase, makeDoc } from '@/lib/client/store';
import { getHealth } from '@/lib/client/ai';
import {
  runCasePipeline,
  readSuspensionMessage,
  suggestCategory,
  guessDocCategory,
  type PipelineEvent,
} from '@/lib/client/pipeline';
import { toast } from '@/lib/client/toast';
import type { CaseRecord } from '@/lib/types';
import { caseTaskInput } from '@/lib/case-input';
import { bytes, cn } from '@/lib/utils';

interface Upload {
  name: string;
  mimeType: string;
  size: number;
}

export default function NewCasePage() {
  const [saved, setSaved] = useState<CaseRecord | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [files, setFiles] = useState<Upload[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const categoryTouched = useRef(false);

  const [form, setForm] = useState(() => {
    const draft = newCaseDraft();
    return {
      customerName: '',
      customerPhone: '',
      businessName: '',
      category: '',
      city: '',
      country: 'SA',
      address: '',
      website: '',
      phone: '',
      suspensionDate: '',
      suspensionMessage: '',
      previousAppeals: 'ما فيه',
      isStorefront: true,
      customersVisit: true,
      hasSignage: false,
      fee: 1500,
      draft,
    };
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const read = useMemo(() => (form.suspensionMessage ? readSuspensionMessage(form.suspensionMessage) : null), [form.suspensionMessage]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.businessName.trim()) e.businessName = 'اسم النشاط';
    if (!form.customerName.trim()) e.customerName = 'اسم العميل';
    if (!form.city.trim()) e.city = 'المدينة';
    return e;
  }, [form]);

  const ready = Object.keys(errors).length === 0;

  async function save() {
    if (!ready) {
      setShowErrors(true);
      toast('ناقصنا كم حاجة', { description: Object.values(errors).join(' · '), tone: 'warn' });
      return;
    }
    const record: CaseRecord = {
      ...form.draft,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      businessName: form.businessName.trim(),
      category: form.category.trim() || suggestCategory(form.businessName) || 'غير محدد',
      city: form.city.trim(),
      country: form.country,
      address: form.address.trim(),
      website: form.website.trim() || undefined,
      phone: form.phone.trim() || form.customerPhone.trim(),
      suspensionDate: form.suspensionDate || undefined,
      suspensionMessage: form.suspensionMessage.trim() || undefined,
      previousAppeals: form.previousAppeals,
      isStorefront: form.isStorefront,
      customersVisit: form.customersVisit,
      hasSignage: form.hasSignage,
      fee: form.fee,
      documents: files.map((f) =>
        makeDoc({
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          category: guessDocCategory(f.name) as CaseRecord['documents'][number]['category'],
          status: 'parsed',
        }),
      ),
    };
    const savedCase = upsertCase(record);
    setSaved(savedCase);
    toast('انفتحت القضية', { description: savedCase.code, tone: 'success' });

    const health = await getHealth().catch(() => null);
    if (!health?.key.present) return;

    setAutoRunning(true);
    try {
      const res = await runCasePipeline(savedCase, { onEvent: (e) => setEvents((prev) => [...prev, e]) });
      setSaved(res.record);
      setAutoDone(true);
      toast(res.ok ? 'خلصنا التحليل تلقائي' : 'توقفنا في النص', {
        description: res.ok ? 'التشخيص والاستئناف جاهزين تحت' : 'راجع السجل',
        tone: res.ok ? 'success' : 'error',
      });
    } finally {
      setAutoRunning(false);
    }
  }

  if (saved) {
    return (
      <AppShell>
        <PageHeader
          title={autoRunning ? 'الذكاء يشتغل عليها…' : 'القضية جاهزة'}
          description={autoRunning ? 'لا تسكّر الصفحة، بنخلص بعد لحظات.' : 'كل شي محفوظ. افتح القضايا أو راجع الاستئناف.'}
        />
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{saved.businessName}</h2>
                <p className="num mt-0.5 text-xs text-brand-300">{saved.code}</p>
              </div>
              <StatusBadge status={saved.status} />
            </div>

            {autoRunning ? (
              <ul className="mt-4 space-y-1 rounded-xl border border-brand-500/30 bg-brand-500/[0.07] p-3">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-[11px] text-slate-300">
                    {e.status === 'ok' ? (
                      <Check size={11} className="text-mint-400" />
                    ) : e.status === 'fail' ? (
                      <span className="text-rosex-400">!</span>
                    ) : (
                      <Loader2 size={11} className="animate-spin text-slate-500" />
                    )}
                    {e.title}
                  </li>
                ))}
              </ul>
            ) : null}

            {autoDone ? (
              <div className="mt-4 space-y-2">
                {saved.diagnosis ? (
                  <div className="rounded-xl border border-mint-500/25 bg-mint-500/[0.06] p-3">
                    <p className="text-[10px] font-bold text-mint-300">السبب الأرجح</p>
                    <p className="mt-1 text-xs font-semibold text-white">{saved.diagnosis.rootCause.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      ثقة {saved.diagnosis.confidence}% · {saved.diagnosis.recoveryPlan.length} خطوات
                    </p>
                  </div>
                ) : null}
                {saved.appealAr ? (
                  <div className="rounded-xl border border-line/70 bg-ink-900/60 p-3">
                    <p className="text-[10px] font-bold text-slate-500">الاستئناف الجاهز</p>
                    <p className="mt-1 line-clamp-4 text-[11px] leading-relaxed text-slate-300">{saved.appealAr}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!autoRunning && !autoDone ? (
              <p className="mt-3 rounded-lg border border-amberx-500/25 bg-amberx-500/[0.06] p-2.5 text-[11px] text-amberx-200">
                ما شغّلنا التحليل لأن ما فيه مفتاح OpenRouter. أضفه من{' '}
                <Link href="/settings/ai" className="link">
                  إعدادات الذكاء
                </Link>{' '}
                وبعدها افتح القضية واضغط «شغّل كل شي».
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/customers" className="btn-primary">
                افتح القضايا
              </Link>
              <Link href="/appeals" className="btn-ghost">
                راجع الاستئناف
              </Link>
              <button
                type="button"
                className="btn-subtle"
                onClick={() => {
                  setSaved(null);
                  setEvents([]);
                  setAutoDone(false);
                  setFiles([]);
                  categoryTouched.current = false;
                  setForm((p) => ({ ...p, draft: newCaseDraft(), businessName: '', customerName: '', category: '', suspensionMessage: '' }));
                }}
              >
                قضية ثانية
              </button>
            </div>
          </div>

          {saved.diagnosis ? (
            <div className="card p-4">
              <p className="section-title mb-2">خطوات إضافية</p>
              <div className="flex flex-wrap gap-2">
                <TaskRunner taskId="policy-analysis" input={caseTaskInput(saved)} caseCode={saved.code} variant="ghost" label="تحليل السياسات" />
                <TaskRunner taskId="customer-report" input={caseTaskInput(saved)} caseCode={saved.code} variant="ghost" label="تقرير للعميل" />
              </div>
            </div>
          ) : null}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="أضف قضية"
        description="خمس خانات وبس. الباقي نعبيه إحنا — الفئة، التشخيص، الاستئناف."
        actions={
          <Link href="/customers" className="btn-ghost">
            رجوع للقضايا
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl">
        <div className="card p-5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">
                اسم النشاط على قوقل <span className="text-rosex-400">*</span>
              </span>
              <input
                className="input"
                value={form.businessName}
                onChange={(e) => {
                  const value = e.target.value;
                  set('businessName', value);
                  if (!categoryTouched.current) {
                    const guess = suggestCategory(value);
                    if (guess) set('category', guess);
                  }
                }}
                placeholder="مثال: مطعم بيت المندي"
              />
              {showErrors && errors.businessName ? <span className="mt-1 block text-2xs text-rosex-400">{errors.businessName}</span> : null}
            </label>

            <label className="block">
              <span className="label">
                اسم العميل <span className="text-rosex-400">*</span>
              </span>
              <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="سارة العتيبي" />
              {showErrors && errors.customerName ? <span className="mt-1 block text-2xs text-rosex-400">{errors.customerName}</span> : null}
            </label>

            <label className="block">
              <span className="label">جوال العميل</span>
              <input className="input" dir="ltr" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+966 5x xxx xxxx" />
            </label>

            <label className="block">
              <span className="label">
                المدينة <span className="text-rosex-400">*</span>
              </span>
              <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="الرياض" />
              {showErrors && errors.city ? <span className="mt-1 block text-2xs text-rosex-400">{errors.city}</span> : null}
            </label>

            <label className="block">
              <span className="label">الفئة</span>
              <input
                className="input"
                value={form.category}
                onChange={(e) => {
                  categoryTouched.current = true;
                  set('category', e.target.value);
                }}
                placeholder="تنعبأ تلقائي"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="label">انسخ رسالة قوقل (لو وصلت) — مو لازم تفهمها</span>
              <textarea
                className="input min-h-[90px] resize-y"
                value={form.suspensionMessage}
                onChange={(e) => set('suspensionMessage', e.target.value)}
                placeholder="Your Business Profile has been suspended due to quality issues…"
              />
            </label>
          </div>

          {read ? (
            <div className="mt-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-brand-300">
                  <Wand2 size={11} /> قرينا الرسالة
                </p>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, ...read.suggest }));
                    toast('طبّقنا الاقتراحات', { tone: 'info' });
                  }}
                >
                  طبّقها
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {read.flags.length ? read.flags.map((f) => <span key={f} className="badge-rose">{f}</span>) : <span className="badge-muted">التعليق عام</span>}
                <span className={read.severity === 'high' ? 'badge-rose' : 'badge-amber'}>
                  خطورة {read.severity === 'high' ? 'عالية' : read.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{read.hint}</p>
            </div>
          ) : null}

          <div className="mt-3.5">
            <span className="label">المستندات (اختياري — تنربط تلقائي)</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-ink-900/40 px-3 py-3 transition-colors hover:border-brand-500/40">
              <FileUp size={15} className="text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-300">ارفع السجل والرخصة وصور الواجهة</span>
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => {
                const list = e.target.files;
                if (!list) return;
                const next = Array.from(list).slice(0, 6).map((f) => ({ name: f.name, mimeType: f.type || 'application/octet-stream', size: f.size }));
                setFiles((prev) => [...prev, ...next].slice(0, 6));
              }} />
            </label>
            {files.length ? (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-line/60 bg-ink-900/60 px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{f.name}</span>
                    <span className="num text-[10px] text-slate-600">{bytes(f.size)}</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} aria-label="حذف">
                      <Trash2 size={12} className="text-slate-500 hover:text-rosex-400" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-line/60 bg-ink-900/40 px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200"
          >
            <span>خيارات إضافية (العنوان، الموقع، الأتعاب)</span>
            <ChevronDown size={14} className={cn('transition-transform', advanced && 'rotate-180')} />
          </button>

          {advanced ? (
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="label">العنوان كامل (الوحدة مهمة)</span>
                <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="الحي، الشارع، المبنى — وحدة ٤" />
              </label>
              <label className="block">
                <span className="label">الدولة</span>
                <select className="select" value={form.country} onChange={(e) => set('country', e.target.value)}>
                  {Object.entries(COUNTRY_META).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.flag} {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">الموقع الإلكتروني</span>
                <input className="input" dir="ltr" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
              </label>
              <label className="block">
                <span className="label">استئنفت قبل؟</span>
                <select className="select" value={form.previousAppeals} onChange={(e) => set('previousAppeals', e.target.value)}>
                  <option>ما فيه</option>
                  <option>استئناف واحد وانرفض</option>
                  <option>استئنافين وانرفضوا</option>
                </select>
              </label>
              <label className="block">
                <span className="label">الأتعاب</span>
                <input type="number" className="input" value={form.fee} onChange={(e) => set('fee', Number(e.target.value))} />
              </label>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2 border-t border-line/60 pt-4">
            <button type="button" className="btn-primary flex-1 justify-center" onClick={save}>
              <CircleCheck size={15} /> احفظ وخلّه يشتغل
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
            <ShieldCheck size={11} /> بنشغّل التشخيص والاستئناف تلقائي إذا فيه مفتاح. ما نقدّم أي استئناف عنك.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
