'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Check, CircleCheck, ClipboardCheck, Sparkles, Store, User } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskRunner from '@/components/ai/TaskRunner';
import { Field, PageHeader } from '@/components/ui/primitives';
import { COUNTRY_META } from '@/lib/constants';
import { newCaseDraft, upsertCase } from '@/lib/client/store';
import { toast } from '@/lib/client/toast';
import { caseTaskInput } from '@/components/cases/CaseDetail';
import type { CaseRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'العميل والنشاط', icon: User },
  { id: 2, label: 'تفاصيل التعليق', icon: ClipboardCheck },
  { id: 3, label: 'المراجعة والإنشاء', icon: Check },
];

export default function NewCasePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState<CaseRecord | null>(null);
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
      previousAppeals: 'لا يوجد',
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

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (step >= 1) {
      if (!form.businessName.trim()) e.businessName = 'اسم النشاط مطلوب';
      if (!form.customerName.trim()) e.customerName = 'اسم العميل مطلوب';
      if (!form.category.trim()) e.category = 'الفئة مطلوبة';
      if (!form.city.trim()) e.city = 'المدينة مطلوبة';
    }
    return e;
  }, [form, step]);

  const canNext = Object.keys(errors).length === 0;

  function createCase() {
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
    const saved = upsertCase(record);
    setSaved(saved);
    toast('تم إنشاء القضية', { description: saved.code, tone: 'success' });
  }

  if (saved) {
    return (
      <AppShell>
        <PageHeader title="تم إنشاء القضية" description="القضية محفوظة محليًا في مساحة العمل. الخطوة التالية: التشخيص بالذكاء الاصطناعي." />
        <div className="mx-auto max-w-2xl">
          <div className="card p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint-500/12 text-mint-400">
              <CircleCheck size={26} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-white">{saved.businessName}</h2>
            <p className="num mt-1 text-xs text-brand-300">{saved.code}</p>
            <div className="mt-5 grid gap-2 text-start sm:grid-cols-2">
              <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
                <p className="text-[10px] text-slate-500">العميل</p>
                <p className="text-xs text-slate-200">{saved.customerName}</p>
              </div>
              <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
                <p className="text-[10px] text-slate-500">الموقع</p>
                <p className="text-xs text-slate-200">
                  {saved.city} — {COUNTRY_META[saved.country]?.label}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <TaskRunner
                taskId="gbp-diagnosis"
                input={caseTaskInput(saved)}
                caseCode={saved.code}
                label="تشغيل التشخيص الآن"
              />
              <Link href="/customers" className="btn-ghost">
                عرض القضايا
              </Link>
              <button
                type="button"
                className="btn-subtle"
                onClick={() => {
                  setSaved(null);
                  setStep(1);
                  setForm((prev) => ({ ...prev, draft: newCaseDraft(), businessName: '', customerName: '' }));
                }}
              >
                إضافة قضية أخرى
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="قضية استرداد جديدة"
        description="أدخل بيانات النشاط والتعليق بدقة — جودة المدخلات تحدد جودة التشخيص."
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
                    active
                      ? 'border-brand-500/40 bg-brand-500/[0.08]'
                      : done
                        ? 'border-mint-500/25 bg-mint-500/[0.05]'
                        : 'border-line bg-ink-900/40',
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
                    <span className="block text-[10px] text-slate-500">الخطوة {s.id}</span>
                    <span className={cn('block truncate text-xs font-semibold', active || done ? 'text-slate-100' : 'text-slate-400')}>
                      {s.label}
                    </span>
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
              <Field label="اسم العميل" required error={errors.customerName}>
                <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="مثال: سارة العتيبي" />
              </Field>
              <Field label="رقم الهاتف">
                <input className="input" dir="ltr" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+966 5x xxx xxxx" />
              </Field>
              <Field label="اسم النشاط التجاري" required error={errors.businessName}>
                <input className="input" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="كما هو في السجل التجاري" />
              </Field>
              <Field label="فئة النشاط" required error={errors.category}>
                <input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="مطعم / صالون / عيادة…" />
              </Field>
              <Field label="المدينة" required error={errors.city}>
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
              <Field label="العنوان الكامل" className="sm:col-span-2" hint="يجب أن يطابق السجل التجاري حرفيًا بما فيه رقم الوحدة">
                <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="الحي، الشارع، رقم المبنى، الوحدة" />
              </Field>
              <Field label="الموقع الإلكتروني">
                <input className="input" dir="ltr" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="هاتف النشاط">
                <input className="input" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+966 11 xxx xxxx" />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="تاريخ التعليق">
                  <input type="date" className="input" value={form.suspensionDate} onChange={(e) => set('suspensionDate', e.target.value)} />
                </Field>
                <Field label="الاستئنافات السابقة">
                  <select className="select" value={form.previousAppeals} onChange={(e) => set('previousAppeals', e.target.value)}>
                    <option>لا يوجد</option>
                    <option>استئناف واحد مرفوض</option>
                    <option>استئنافان مرفوضان</option>
                    <option>ثلاثة أو أكثر</option>
                  </select>
                </Field>
              </div>
              <Field label="نص رسالة التعليق من Google" hint="انسخ الرسالة كما وردت في البريد أو لوحة التحكم — لا تعِد صياغتها">
                <textarea
                  className="input min-h-[110px] resize-y"
                  value={form.suspensionMessage}
                  onChange={(e) => set('suspensionMessage', e.target.value)}
                  placeholder="مثال: Your Business Profile has been suspended due to quality issues…"
                />
              </Field>

              <div className="rounded-xl border border-line bg-ink-900/40 p-3.5">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">خصائص الموقع</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { key: 'isStorefront' as const, label: 'يوجد محل فعلي', icon: Store },
                    { key: 'customersVisit' as const, label: 'يستقبل عملاء', icon: Building2 },
                    { key: 'hasSignage' as const, label: 'لافتة دائمة', icon: Sparkles },
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300">ملخص القضية</p>
                <p className="mt-1 text-sm font-bold text-white">{form.businessName || '—'}</p>
                <p className="text-xs text-slate-400">
                  {form.category} · {form.city} · {COUNTRY_META[form.country]?.label}
                </p>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ['العميل', form.customerName],
                  ['الهاتف', form.customerPhone],
                  ['العنوان', form.address],
                  ['الاستئنافات السابقة', form.previousAppeals],
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
                <p className="text-[10px] text-slate-500">رسالة التعليق</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{form.suspensionMessage || 'لم تُدخل'}</p>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                بالتأكيد أنت تنشئ قضية داخلية فقط. النظام لا يقدّم أي استئناف تلقائيًا ولا يتصل بحساب Google دون موافقة المالك.
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-line/60 pt-4">
            <button type="button" className="btn-subtle" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
              <ArrowRight size={15} /> السابق
            </button>
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={!canNext}>
                التالي <ArrowLeft size={15} />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={createCase} disabled={!canNext}>
                <Check size={15} /> إنشاء القضية
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
