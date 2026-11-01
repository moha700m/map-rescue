'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, CircleAlert, ExternalLink, KeyRound, Plug, RefreshCw, Satellite } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { PageHeader, SectionCard } from '@/components/ui/primitives';

const SOURCES = [
  { tone: 'text-mint-400', label: 'بيانات حية', desc: 'من Google Business Profile APIs بعد الموافقة على المشروع.' },
  { tone: 'text-skyx-400', label: 'بيانات يدوية', desc: 'أدخلها المالك أو استُخرجت من المستندات.' },
  { tone: 'text-brand-300', label: 'تحليل AI', desc: 'فرضيات مبنية على السياسات الرسمية فقط.' },
  { tone: 'text-slate-400', label: 'أداة الاستئناف', desc: 'تُفتح يدويًا عبر الرابط الرسمي من Google.' },
];

export default function GooglePage() {
  const [serverMode, setServerMode] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/google/connect', { redirect: 'manual' })
      .then(() => setServerMode(true))
      .catch(() => setServerMode(false));
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="ربط Google Business Profile"
        description="اتصال رسمي عبر OAuth 2.0 — يُستخدم لجلب البيانات الحية فقط، ولا يقدّم أي استئناف تلقائيًا."
      />

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="حالة الوصول إلى API" description="Google Business Profile APIs تتطلب موافقة المشروع">
          <div className="flex items-start gap-3 rounded-xl border border-amberx-500/25 bg-amberx-500/[0.06] p-3">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-amberx-400" />
            <div className="text-[11px] leading-relaxed text-amberx-200">
              دون موافقة Google على المشروع تكون الحصة صفرًا وتُرفض الطلبات بـ 403. هذا قيد من Google وليس عيبًا في التطبيق.
            </div>
          </div>
          <ol className="mt-3 space-y-2 text-[11px] text-slate-300">
            {[
              'إنشاء مشروع في Google Cloud Console.',
              'تفعيل Account Management وBusiness Information وPerformance وVerifications.',
              'طلب الوصول عبر النموذج الرسمي (developers.google.com/my-business/content/prereqs).',
              'إضافة النطاق https://www.googleapis.com/auth/business.manage.',
              'ضبط GOOGLE_CLIENT_ID وGOOGLE_CLIENT_SECRET وGOOGLE_REDIRECT_URI.',
            ].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="num grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/5 text-[10px] font-bold text-slate-400">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <a
            href="https://developers.google.com/my-business/content/prereqs"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost btn-sm mt-3 inline-flex"
          >
            <ExternalLink size={12} /> طلب الوصول الرسمي
          </a>
        </SectionCard>

        <SectionCard title="ربط الحساب" description="OAuth 2.0 — refresh token على الخادم فقط">
          <div className="space-y-3">
            <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-slate-300">
                  <KeyRound size={13} className="text-slate-500" /> بيانات OAuth
                </span>
                <span className={serverMode === false ? 'badge-amber' : serverMode ? 'badge-mint' : 'badge-muted'}>
                  {serverMode === null ? 'جارٍ الفحص' : serverMode ? 'مسار الخادم متاح' : 'نسخة ثابتة'}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                {serverMode === false
                  ? 'هذه نسخة معاينة ثابتة على GitHub Pages — مسارات OAuth تحتاج نشر التطبيق على خادم (Vercel).'
                  : 'المسار متاح على الخادم؛ يتطلب ضبط متغيرات Google.'}
              </p>
            </div>
            <a href="/api/google/connect" className="btn-primary w-full justify-center">
              <Plug size={15} /> ربط حساب Google
            </a>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-ghost btn-sm justify-center" onClick={() => setError(null)}>
                <RefreshCw size={12} /> تحديث الحالة
              </button>
              <button type="button" className="btn-ghost btn-sm justify-center" onClick={() => setError('لا يوجد اتصال محفوظ بعد.')}>
                <Satellite size={12} /> فحص الاتصال
              </button>
            </div>
            {error ? <p className="text-[10px] text-amberx-300">{error}</p> : null}
            <p className="text-[10px] leading-relaxed text-slate-600">
              لا تُخزَّن كلمات المرور. لا يُخترع أي سبب تعليق غير متوفر عبر API الرسمي.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard className="mt-3" title="التمييز بين مصادر البيانات" description="كل معلومة في التطبيق موسومة بمصدرها">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => (
            <div key={s.label} className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
              <p className={`flex items-center gap-1.5 text-[11px] font-bold ${s.tone}`}>
                <BadgeCheck size={12} /> {s.label}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
