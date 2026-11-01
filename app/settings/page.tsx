'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, Database, Download, RotateCcw, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { PageHeader, SectionCard } from '@/components/ui/primitives';
import { clearWorkspace, getCases, getUsageRows, resetDemo, DEMO_MODE } from '@/lib/client/store';
import { getHealth } from '@/lib/client/ai';
import { toast } from '@/lib/client/toast';
import type { AiHealth } from '@/lib/ai/contracts';

const ENV_VARS = [
  { key: 'OPENROUTER_API_KEY', desc: 'مفتاح OpenRouter — يُستخدم على الخادم فقط ولا يظهر في الواجهة.' },
  { key: 'AI_DATA_DIR', desc: 'مجلد تخزين الإعدادات وسجل الاستخدام (افتراضي: .data).' },
  { key: 'AI_CONFIG_SECRET', desc: 'سر تشفير المفتاح المخزّن (AES-256-GCM).' },
  { key: 'AI_STORAGE=supabase', desc: 'تفعيل تخزين الإعدادات والسجل في Supabase بدل الملفات.' },
  { key: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY', desc: 'مطلوبة عند استخدام تخزين Supabase.' },
  { key: 'NEXT_PUBLIC_APP_URL', desc: 'يُرسل كـ HTTP-Referer إلى OpenRouter.' },
];

export default function SettingsPage() {
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [counts, setCounts] = useState({ cases: 0, usage: 0 });

  useEffect(() => {
    getHealth().then(setHealth).catch(() => undefined);
    setCounts({ cases: getCases().length, usage: getUsageRows().length });
  }, []);

  function exportAll() {
    const payload = { exportedAt: new Date().toISOString(), cases: getCases(), usage: getUsageRows() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `map-rescue-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  return (
    <AppShell>
      <PageHeader
        title="إعدادات النظام"
        description="حالة التشغيل، التخزين، وأدوات إدارة البيانات."
        actions={
          <Link href="/settings/ai" className="btn-primary">
            <BrainCircuit size={15} /> إعدادات الذكاء الاصطناعي
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard title="حالة التشغيل" description="كيف يعمل التطبيق الآن">
          <dl className="space-y-2">
            {[
              ['النمط', health?.mode === 'server' ? 'خادم كامل (Next.js API)' : health?.mode === 'direct' ? 'واجهة ثابتة (متصفح → OpenRouter)' : 'جارٍ الفحص…'],
              ['البوابة', 'OpenRouter · /api/v1/chat/completions'],
              ['المفتاح', health?.key.present ? `${health.key.fingerprint} (${health.key.source})` : 'غير مضبوط'],
              ['التخزين (خادم)', health?.storage ?? '—'],
              ['الإصدار', health?.version ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-ink-900/50 px-3 py-2">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className="num max-w-[60%] truncate text-[11px] text-slate-200" dir="ltr">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="إدارة البيانات" description="مساحة العمل محلية بالكامل في هذا المتصفح">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
              <p className="text-[10px] text-slate-500">القضايا</p>
              <p className="num text-lg font-bold text-white">{counts.cases}</p>
            </div>
            <div className="rounded-xl border border-line/70 bg-ink-900/50 p-3">
              <p className="text-[10px] text-slate-500">سجلات AI</p>
              <p className="num text-lg font-bold text-white">{counts.usage}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn-ghost btn-sm" onClick={exportAll}>
              <Download size={12} /> تصدير JSON
            </button>
            {DEMO_MODE ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  resetDemo();
                  toast('تمت إعادة تعيين بيانات المعاينة', { tone: 'success' });
                }}
              >
                <RotateCcw size={12} /> إعادة تعيين المعاينة
              </button>
            ) : null}
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => {
                clearWorkspace();
                toast('تم حذف بيانات مساحة العمل', { tone: 'warn' });
              }}
            >
              <Trash2 size={12} /> مسح البيانات
            </button>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-600">
            <Database size={11} className="mt-0.5 shrink-0" />
            لربط Supabase استخدم المخططات في مجلد supabase/ ثم فعّل AI_STORAGE=supabase على الخادم.
          </p>
        </SectionCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <SectionCard title="قواعد التشغيل" description="غير قابلة للتعطيل من الواجهة">
          <ul className="space-y-2 text-[11px] text-slate-300">
            {[
              'لا يُقدَّم أي استئناف تلقائيًا — التقديم يدوي بموافقة المالك.',
              'لا تُختلق أسباب تعليق غير موثّقة في سياسات Google.',
              'كل استدعاء AI يمر عبر OpenRouter ومُسجَّل بالرموز والتكلفة.',
              'مفتاح OpenRouter لا يُرسل إلى المتصفح في نمط الخادم.',
            ].map((rule) => (
              <li key={rule} className="flex gap-2">
                <ShieldCheck size={12} className="mt-0.5 shrink-0 text-mint-400" />
                {rule}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="متغيرات البيئة" description="لنشر الإنتاج على Vercel أو خادم Node">
          <div className="space-y-1.5">
            {ENV_VARS.map((v) => (
              <div key={v.key} className="rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                <p className="num text-[10px] font-bold text-brand-300" dir="ltr">
                  {v.key}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{v.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
            <Wrench size={11} /> راجع .env.example في المستودع.
          </p>
        </SectionCard>
      </div>
    </AppShell>
  );
}
