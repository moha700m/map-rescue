'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Link2,
  Package,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import CaseDetail from '@/components/cases/CaseDetail';
import { EmptyState, PageHeader, RiskBadge, SectionCard, Stat, StatusBadge } from '@/components/ui/primitives';
import { useCases } from '@/lib/client/store';
import { fetchUsage, getHealth, refreshHealth } from '@/lib/client/ai';
import { isDemo, startDemo, stopDemo } from '@/lib/client/demo';
import { toast } from '@/lib/client/toast';
import type { UsagePayload } from '@/lib/ai/contracts';
import type { CaseRecord } from '@/lib/types';
import { COUNTRY_META } from '@/lib/constants';
import { formatUsd, timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const cases = useCases();
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    fetchUsage(14).then(setUsage).catch(() => undefined);
    getHealth().then((h) => setHasKey(h.key.present)).catch(() => setHasKey(false));
    setDemo(isDemo());
  }, [cases.length]);

  function beginDemo() {
    const first = startDemo();
    refreshHealth().then((h) => setHasKey(h.key.present)).catch(() => undefined);
    setDemo(true);
    toast('العرض جاهز', { description: '٣ قضايا — افتح أي واحدة واضغط «شغّل كل شي»', tone: 'success' });
    return first;
  }

  function endDemo() {
    stopDemo();
    refreshHealth().then((h) => setHasKey(h.key.present)).catch(() => undefined);
    setDemo(false);
    toast('انتهى العرض', { description: 'انمسحت بيانات المحاكاة', tone: 'info' });
    window.location.reload();
  }

  const stats = useMemo(() => {
    const closed = cases.filter((c) => ['reinstated', 'rejected', 'submitted'].includes(c.status));
    const reinstated = cases.filter((c) => c.status === 'reinstated').length;
    return {
      total: cases.length,
      active: cases.filter((c) => !['reinstated', 'rejected'].includes(c.status)).length,
      ready: cases.filter((c) => c.status === 'appeal_ready').length,
      rate: closed.length ? Math.round((reinstated / closed.length) * 100) : 0,
    };
  }, [cases]);

  const recent = useMemo(() => [...cases].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6), [cases]);
  const needsWork = cases.filter((c) => !c.diagnosis && c.status !== 'reinstated').length;
  const hasUsage = (usage?.summary.totals.requests ?? 0) > 0;

  const steps = [
    {
      icon: Sparkles,
      title: '١. اضبط المفتاح',
      desc: hasKey ? 'المفتاح مضبوط — الذكاء جاهز.' : 'مفتاح OpenRouter مرة وحدة، وبعدها كل شي يشتغل لحاله.',
      cta: hasKey ? 'راجع الإعدادات' : 'أضف المفتاح',
      href: '/settings/ai',
      tone: hasKey ? 'mint' : 'amber',
    },
    {
      icon: Plus,
      title: '٢. أضف القضية',
      desc: 'خمس خانات — والباقي يتعبّى تلقائي، والتشخيص يبدأ فورًا.',
      cta: 'قضية جديدة',
      href: '/new-case',
      tone: 'brand',
    },
    {
      icon: Package,
      title: '٣. نزّل الحزمة وقدّم',
      desc: 'جاهزية + نص الاستئناف + كل الملفات في ZIP واحد.',
      cta: 'حزمة التقديم',
      href: '/submit',
      tone: 'sky',
    },
  ];

  const toneRing: Record<string, string> = {
    amber: 'border-amberx-500/30 bg-amberx-500/[0.06] text-amberx-400',
    brand: 'border-brand-500/30 bg-brand-500/[0.06] text-brand-300',
    mint: 'border-mint-500/30 bg-mint-500/[0.06] text-mint-400',
    sky: 'border-skyx-500/30 bg-skyx-500/[0.06] text-skyx-400',
  };

  return (
    <AppShell>
      <PageHeader
        title="الرئيسية"
        description={cases.length ? `${stats.active} قضية شغّالة — ابدأ من اللي ينقصه تشخيص.` : 'ابدأ بثلاث خطوات، وبعدها كل شي يمشي تلقائي.'}
        actions={
          <>
            {demo ? (
              <button type="button" className="btn-ghost" onClick={endDemo}>
                إنهاء العرض
              </button>
            ) : (
              <button type="button" className="btn-ghost" onClick={beginDemo}>
                <Sparkles size={15} /> جرّب العرض
              </button>
            )}
            <Link href="/new-case" className="btn-primary">
              <Plus size={15} /> قضية جديدة
            </Link>
          </>
        }
      />

      <div className="mb-3 grid gap-2.5 lg:grid-cols-3">
        {steps.map((step) => (
          <Link key={step.title} href={step.href} className="card card-hover group flex items-start gap-3 p-4">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${toneRing[step.tone]}`}>
              <step.icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-white">{step.title}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{step.desc}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-300 group-hover:text-brand-200">
                {step.cta} <ArrowLeft size={11} />
              </span>
            </span>
          </Link>
        ))}
      </div>

      {cases.length ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Stat label="القضايا" value={stats.total} icon={Users} href="/customers" />
            <Stat label="شغّالة" value={stats.active} icon={FileText} tone="sky" href="/customers" />
            <Stat label="بانتظار تشخيص" value={needsWork} icon={Sparkles} tone="amber" href="/customers" />
            <Stat label="نسبة الاسترداد" value={`${stats.rate}%`} icon={CheckCircle2} tone="mint" />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="آخر القضايا"
              description="اضغط على أي قضية تفتح كل شي"
              action={
                <Link href="/customers" className="btn-subtle btn-sm">
                  الكل <ArrowLeft size={12} />
                </Link>
              }
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>النشاط</th>
                      <th>العميل</th>
                      <th>الحالة</th>
                      <th>المخاطر</th>
                      <th>التحديث</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((c) => (
                      <tr key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                        <td>
                          <p className="text-xs font-semibold text-slate-100">{c.businessName}</p>
                          <p className="text-[10px] text-slate-500">
                            {COUNTRY_META[c.country]?.flag} {c.city}
                          </p>
                        </td>
                        <td className="text-xs text-slate-300">{c.customerName}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>{c.riskLevel ? <RiskBadge level={c.riskLevel} /> : <span className="text-slate-600">—</span>}</td>
                        <td className="text-[11px] text-slate-500">{timeAgo(c.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="space-y-3">
              <SectionCard title="رابط طلب العميل" description="ارسله له يعبّيه بنفسه">
                <button
                  type="button"
                  className="btn-ghost w-full justify-center"
                  onClick={async () => {
                    const url = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/start/`;
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                >
                  <Link2 size={14} /> {copied ? 'تم النسخ' : 'انسخ الرابط'}
                </button>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                  صفحة واحدة، بدون كلمة مرور، وتوصلك رسالة واتساب جاهزة.
                </p>
              </SectionCard>

              {hasUsage ? (
                <SectionCard title="مصاريف الذكاء" description="آخر ١٤ يوم">
                  <div className="flex items-end justify-between">
                    <p className="num text-lg font-bold text-white">{formatUsd(usage?.budget.spentUsd ?? 0)}</p>
                    <p className="text-[10px] text-slate-500">{usage?.summary.totals.requests ?? 0} طلب</p>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <Wallet size={10} /> من {formatUsd(usage?.budget.monthlyBudgetUsd ?? 0)} شهريًا
                  </p>
                  <Link href="/settings/ai#usage" className="btn-subtle btn-sm mt-2 w-full justify-center">
                    التفاصيل
                  </Link>
                </SectionCard>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="card p-6">
          <EmptyState
            icon={Users}
            title="ما فيه قضايا بعد"
            description="أضف أول قضية — التشخيص والاستئناف وحزمة التقديم تتجهز تلقائي."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/new-case" className="btn-primary">
                  <Plus size={14} /> أضف قضية
                </Link>
                <button type="button" className="btn-ghost" onClick={beginDemo}>
                  <Sparkles size={14} /> شغّل العرض التجريبي
                </button>
              </div>
            }
          />
        </div>
      )}

      {selected ? <CaseDetail record={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}
