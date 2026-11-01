'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  ClipboardCheck,
  Loader2,
  Sparkles,
  Store,
  User,
  Wand2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Field, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { COUNTRY_META } from '@/lib/constants';
import { newCaseDraft, upsertCase } from '@/lib/client/store';
import { getHealth } from '@/lib/client/ai';
import { runCasePipeline, readSuspensionMessage, suggestCategory, type PipelineEvent } from '@/lib/client/pipeline';
import { toast } from '@/lib/client/toast';
import type { CaseRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'النشاط والعميل', icon: User },
  { id: 2, label: 'رسالة قوقل', icon: ClipboardCheck },
  { id: 3, label: 'راجع واحفظ', icon: Check },
];

export default function NewCasePage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState<CaseRecord | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
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
    if (!form.businessName.trim()) e.businessName = 'اكتب اسم النشاط';
    if (!form.customerName.trim()) e.customerName = 'اكتب اسم العميل';
    if (!form.category.trim()) e.category = 'اكتب الفئة';
    if (!form.city.trim()) e.city = 'اكتب المدينة';
    return e;
  }, [form]);

  const canNext = Object.keys(errors).length === 0;

  function goNext() {
    if (!canNext) {
      setShowErrors(true);
      toast('ناقصك كم حقل', { description: Object.values(errors).join(' · '), tone: 'warn' });
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(3, s + 1));
  }

  function applySuggestion() {
    if (!read) return;
    setForm((prev) => ({
      ...prev,
      ...read.suggest,
      isStorefront: read.suggest.isStorefront ?? prev.isStorefront,
    }));
    toast('طبّقنا الاقتراحات', { description: 'عدّلها لو ما تناسب الواقع', tone: 'info' });
  }

  async function createCase() {
    const record: CaseRecord = {
      ...form.draft,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      businessName: form.businessName.trim(),
      category: form.category.trim(),
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
    };
    const savedCase = upsertCase(record);
    setSaved(savedCase);
    toast('انفتحت القضية', { description: savedCase.code, tone: 'success' });

    // Automatic mode: if a key exists, start working immediately.
    const health = await getHealth().catch(() => null);
    if (!health?.key.present) return;

    setAutoRunning(true);
    try {
      const res = await runCasePipeline(savedCase, {
        onEvent: (e) => setEvents((prev) => [...prev, e]),
      });
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
          title="انفتحت القضية"
          description={autoRunning ? 'الذكاء يشتغل عليها الحين — لا تسكّر الصفحة.' : 'كل شي محفوظ. تقدر تروح للقضية أو تضيف غيرها.'}
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

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
                <p className="text-[10px] text-slate-500">العميل</p>
                <p className="text-xs text-slate-200">{saved.customerName}</p>
              </div>
              <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
                <p className="text-[10px] text-slate-500">المكان</p>
                <p className="text-xs text-slate-200">
                  {saved.city} — {COUNTRY_META[saved.country]?.label}
                </p>
              </div>
            </div>

            {autoRunning ? (
              <div className="mt-4 rounded-xl border border-brand-500/30 bg-brand-500/[0.07] p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-brand-200">
                  <Loader2 size={13} className="animate-spin" /> نشغّل كل شي تلقائي…
                </p>
                <ul className="mt-2 space-y-1">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-[11px] text-slate-300">
                      {e.status === 'ok' ? <Check size={11} className="text-mint-400" /> : e.status === 'fail' ? <span className="text-rosex-400">!</span> : <Loader2 size={11} className="animate-spin text-slate-500" />}
                      {e.title}
                    </li>
                  ))}
                </ul>
              </div>
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
                  setStep(1);
                  categoryTouched.current = false;
                  setForm((prev) => ({ ...prev, draft: newCaseDraft(), businessName: '', customerName: '', category: '', suspensionMessage: '' }));
                }}
              >
                قضية ثانية
              </button>
            </div>
          </div>
          {!autoRunning && !autoDone ? (
            <p className="text-center text-[11px] text-slate-500">
              ما شغّلنا التحليل لأن ما فيه مفتاح. أضفه من{' '}
              <Link href="/settings/ai" className="link">
                إعدادات الذكاء
              </Link>{' '}
              وبعدها افتح القضية واضغط «شغّل كل شي».
            </p>
          ) : null}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="قضية جديدة"
        description="عبّ ثلاث خطوات بس، والباقي علينا. كل ما تعطي معلومات أدق، التشخيص يطلع أضبط."
        actions={
          <Link href="/customers" className="btn-ghost">
            <ArrowRight size={15} /> رجوع للقضايا
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl">
        <ol className="mb-4 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => (done ? setStep(s.id) : undefined)}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-start transition-colors',
                    active ? 'border-brand-500/40 bg-brand-500/[0.08]' : done ? 'border-mint-500/25 bg-mint-500/[0.05]' : 'border-line bg-ink-900/40',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold',
                      active ? 'bg-brand-500 text-white' : done ? 'bg-mint-500/20 text-mint-400' : 'bg-white/5 text-slate-500',
                    )}
                  >
                    {done ? <Check size={13} /> : <Icon size={13} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] text-slate-500">خطوة {s.id}</span>
                    <span className={cn('block truncate text-xs font-semibold', active || done ? 'text-slate-100' : 'text-slate-400')}>{s.label}</span>
                  </span>
                </button>
                {i < STEPS.length - 1 ? <span className="h-px w-3 bg-line" /> : null}
              </li>
            );
          })}
        </ol>

        <div className="card p-5">
          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم العميل" required error={showErrors ? errors.customerName : undefined}>
                <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="مثال: سارة العتيبي" autoComplete="off" />
              </Field>
              <Field label="جوال العميل">
                <input className="input" dir="ltr" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+966 5x xxx xxxx" />
              </Field>
              <Field label="اسم النشاط" required error={showErrors ? errors.businessName : undefined} hint="نفس اللي في السجل التجاري">
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
              </Field>
              <Field label="فئة النشاط" required error={showErrors ? errors.category : undefined} hint={form.category ? 'عدّلها لو ما هي بالضبط' : 'بتنعبّى تلقائي من اسم النشاط'}>
                <input
                  className="input"
                  value={form.category}
                  onChange={(e) => {
                    categoryTouched.current = true;
                    set('category', e.target.value);
                  }}
                  placeholder="مطعم / صالون / عيادة…"
                />
              </Field>
              <Field label="المدينة" required error={showErrors ? errors.city : undefined}>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="الرياض" />
              </Field>
              <Field label="الدولة">
                <select className="select" value={form.country} onChange={(e) => set('country', e.target.value)}>
                  {Object.entries(COUNTRY_META).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.flag} {meta.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="العنوان كامل" className="sm:col-span-2" hint="الحي + الشارع + رقم المبنى + رقم الوحدة">
                <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="حي النرجس، طريق أنس بن مالك، مبنى 4412 — وحدة 4" />
              </Field>
              <Field label="الموقع الإلكتروني">
                <input className="input" dir="ltr" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="جوال النشاط">
                <input className="input" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+966 11 xxx xxxx" />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <Field
                label="رسالة قوقل (انسخها زي ما هي)"
                hint="مو لازم تفهمها — الذكاء يقراها ويقول لك وش المشكلة"
              >
                <textarea
                  className="input min-h-[110px] resize-y"
                  value={form.suspensionMessage}
                  onChange={(e) => set('suspensionMessage', e.target.value)}
                  placeholder="Your Business Profile has been suspended due to quality issues…"
                />
              </Field>

              {read ? (
                <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-brand-300">
                      <Wand2 size={11} /> قرينا الرسالة
                    </p>
                    <button type="button" className="btn-ghost btn-sm" onClick={applySuggestion}>
                      طبّق الاقتراحات
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {read.flags.length ? read.flags.map((f) => <span key={f} className="badge-rose">{f}</span>) : <span className="badge-muted">التعليق عام</span>}
                    <span className={read.severity === 'high' ? 'badge-rose' : 'badge-amber'}>
                      خطورة {read.severity === 'high' ? 'عالية' : read.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{read.hint}</p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="تاريخ التعليق (اختياري)">
                  <input type="date" className="input" value={form.suspensionDate} onChange={(e) => set('suspensionDate', e.target.value)} />
                </Field>
                <Field label="استئنفت قبل؟">
                  <select className="select" value={form.previousAppeals} onChange={(e) => set('previousAppeals', e.target.value)}>
                    <option>ما فيه</option>
                    <option>استئناف واحد وانرفض</option>
                    <option>استئنافين وانرفضوا</option>
                    <option>ثلاثة وأكثر</option>
                  </select>
                </Field>
              </div>

              <div className="rounded-xl border border-line bg-ink-900/40 p-3.5">
                <p className="mb-2.5 text-[11px] font-bold text-slate-400">النشاط وش وضعه؟</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { key: 'isStorefront' as const, label: 'فيه محل', icon: Store },
                    { key: 'customersVisit' as const, label: 'يستقبل عملاء', icon: User },
                    { key: 'hasSignage' as const, label: 'فيه لافتة', icon: Sparkles },
                  ].map((opt) => {
                    const active = form[opt.key];
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => set(opt.key, !active)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors',
                          active ? 'border-mint-500/30 bg-mint-500/[0.08] text-mint-300' : 'border-line bg-ink-900/60 text-slate-400',
                        )}
                      >
                        <opt.icon size={14} />
                        {opt.label}
                        {active ? <Check size={12} className="ms-auto" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="أتعاب القضية (اختياري)">
                <input type="number" className="input" value={form.fee} onChange={(e) => set('fee', Number(e.target.value))} />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-3.5">
                <p className="text-[10px] font-bold text-brand-300">ملخص سريع</p>
                <p className="mt-1 text-sm font-bold text-white">{form.businessName || '—'}</p>
                <p className="text-xs text-slate-400">
                  {form.category} · {form.city} · {COUNTRY_META[form.country]?.label}
                </p>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ['العميل', form.customerName],
                  ['الجوال', form.customerPhone],
                  ['العنوان', form.address],
                  ['استئنف قبل؟', form.previousAppeals],
                  ['تاريخ التعليق', form.suspensionDate],
                  ['الأتعاب', `$${form.fee}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-line/60 bg-ink-900/50 px-3 py-2">
                    <dt className="text-[10px] text-slate-500">{label}</dt>
                    <dd className="truncate text-xs text-slate-200" dir="auto">
                      {value || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-lg border border-line/60 bg-ink-900/50 p-3">
                <p className="text-[10px] text-slate-500">رسالة قوقل</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{form.suspensionMessage || 'ما كتبتها'}</p>
              </div>
              <p className="rounded-lg border border-mint-500/25 bg-mint-500/[0.06] p-2.5 text-[11px] leading-relaxed text-mint-200">
                بمجرد ما تحفظ، بنشغّل التشخيص والاستئناف والتوصيات تلقائي — إذا كان مفتاح OpenRouter مضبوط.
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-line/60 pt-4">
            <button type="button" className="btn-subtle" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
              <ArrowRight size={15} /> رجوع
            </button>
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={goNext}>
                التالي <ArrowLeft size={15} />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => (canNext ? createCase() : goNext())}>
                <CircleCheck size={15} /> احفظ وخلّه يشتغل
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
