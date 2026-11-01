'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Link2,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import CaseDetail from '@/components/cases/CaseDetail';
import { EmptyState, PageHeader, SectionCard, Stat, StatusBadge, RiskBadge } from '@/components/ui/primitives';
import { Ring } from '@/components/ui/charts';
import { useCases } from '@/lib/client/store';
import { fetchUsage, getHealth } from '@/lib/client/ai';
import type { UsagePayload } from '@/lib/ai/contracts';
import type { CaseRecord } from '@/lib/types';
import { COUNTRY_META } from '@/lib/constants';
import { formatTokens, formatUsd, timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const cases = useCases();
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUsage(14).then(setUsage).catch(() => undefined);
    getHealth().then((h) => setHasKey(h.key.present)).catch(() => setHasKey(false));
  }, [cases.length]);

  const stats = useMemo(() => {
    const closed = cases.filter((c) => ['reinstated', 'rejected', 'submitted'].includes(c.status));
    const reinstated = cases.filter((c) => c.status === 'reinstated').length;
    return {
      total: cases.length,
      suspended: cases.filter((c) => !['reinstated', 'new'].includes(c.status)).length,
      ready: cases.filter((c) => c.status === 'appeal_ready').length,
      rate: closed.length ? Math.round((reinstated / closed.length) * 100) : 0,
    };
  }, [cases]);

  // What actually needs the operator right now.
  const todo = useMemo(() => {
    const noDiagnosis = cases.filter((c) => !c.diagnosis && c.status !== 'reinstated');
    const appeals = cases.filter((c) => c.status === 'appeal_ready');
    const docs = cases.filter((c) => c.status === 'pending_docs');
    return { noDiagnosis, appeals, docs };
  }, [cases]);

  const recent = useMemo(() => [...cases].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5), [cases]);

  const steps = [
    hasKey === false
      ? {
          icon: BrainCircuit,
          title: 'أضف مفتاح OpenRouter',
          desc: 'بدون المفتاح ما يشتغل الذكاء. حطه مرة واحدة وخلاص.',
          cta: 'افتح الإعدادات',
          href: '/settings/ai',
          tone: 'amber' as const,
        }
      : {
          icon: Sparkles,
          title: 'شغّل التحليل التلقائي',
          desc: todo.noDiagnosis.length
            ? `عندك ${todo.noDiagnosis.length} قضية ما انحللت. افتح القضية واضغط «شغّل كل شي».`
            : 'كل القضايا محللة — ما فيه شي ناقص هنا.',
          cta: 'افتح القضايا',
          href: '/customers',
          tone: 'brand' as const,
        },
    {
      icon: FileText,
      title: 'راجع الاستئناف وقدّمه',
      desc: todo.appeals.length
        ? `${todo.appeals.length} استئناف جاهز. اقراه وعدّله وبعدها قدّمه من صفحة قوقل بنفسك.`
        : 'ما فيه استئناف جاهز الحين.',
      cta: 'افتح الاستئنافات',
      href: '/appeals',
      tone: 'mint' as const,
    },
    {
      icon: AlertTriangle,
      title: 'كمّل المستندات الناقصة',
      desc: todo.docs.length
        ? `${todo.docs.length} قضية تنتظر مستندات. ارفعها وبتنربط بالقضية تلقائي.`
        : 'كل المستندات كاملة.',
      cta: 'افتح المستندات',
      href: '/documents',
      tone: 'sky' as const,
    },
  ];

  const toneRing = {
    amber: 'border-amberx-500/30 bg-amberx-500/[0.06] text-amberx-400',
    brand: 'border-brand-500/30 bg-brand-500/[0.06] text-brand-300',
    mint: 'border-mint-500/30 bg-mint-500/[0.06] text-mint-400',
    sky: 'border-skyx-500/30 bg-skyx-500/[0.06] text-skyx-400',
  };

  return (
    <AppShell>
      <PageHeader
        title="هلا والله 👋"
        description="هذا كل شغلك في مكان واحد. تحت مرتب لك وش تسوّي بالضبط، خطوة خطوة."
        actions={
          <Link href="/new-case" className="btn-primary">
            <Plus size={15} />
            أضف قضية
          </Link>
        }
      />

      {/* ── وش تسوي الحين ─────────────────────────────── */}
      <div className="mb-3 grid gap-2.5 lg:grid-cols-3">
        {steps.map((step, i) => (
          <Link
            key={step.title}
            href={step.href}
            className="card card-hover group flex items-start gap-3 p-4"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${toneRing[step.tone]}`}>
              <step.icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="num text-[10px] font-bold text-slate-600">0{i + 1}</span>
                <span className="truncate text-[13px] font-bold text-white">{step.title}</span>
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{step.desc}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-300 group-hover:text-brand-200">
                {step.cta} <ArrowLeft size={11} />
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-col gap-2.5 rounded-2xl border border-brand-500/25 bg-brand-500/[0.06] p-3 sm:flex-row sm:items-center">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-300">
          <Link2 size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-white">رابط طلب العميل</p>
          <p className="truncate text-[11px] text-slate-400">ارسله للعميل يعبّيه بنفسه — بدون كلمة مرور ولا تعقيد.</p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm shrink-0"
          onClick={async () => {
            const url = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/start/`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          <Copy size={12} /> {copied ? 'تم النسخ' : 'انسخ الرابط'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="كل القضايا" value={stats.total} icon={Users} tone="brand" href="/customers" />
        <Stat label="ملفات معلّقة" value={stats.suspended} icon={AlertTriangle} tone="rose" href="/suspended" />
        <Stat label="استئناف جاهز" value={stats.ready} icon={FileText} tone="amber" href="/appeals" />
        <Stat label="نسبة الاسترداد" value={`${stats.rate}%`} icon={CheckCircle2} tone="mint" href="/tracker" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="آخر القضايا"
          description="اضغط على أي قضية وبتشوف كل شي فيها"
          action={
            <Link href="/customers" className="btn-subtle btn-sm">
              الكل <ArrowLeft size={12} />
            </Link>
          }
          bodyClassName="p-0"
        >
          {recent.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>النشاط</th>
                    <th>العميل</th>
                    <th>الحالة</th>
                    <th>المخاطر</th>
                    <th>آخر تحديث</th>
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
          ) : (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="ما فيه قضايا بعد"
                description="ابدأ بأول قضية، وبعدها شغّل التحليل التلقائي."
                action={
                  <Link href="/new-case" className="btn-primary">
                    <Plus size={14} /> أضف قضية
                  </Link>
                }
              />
            </div>
          )}
        </SectionCard>

        <SectionCard title="مصاريف الذكاء" description="آخر 14 يوم">
          <div className="flex items-center gap-4">
            <Ring value={usage?.budget.pct ?? 0} size={78} tone={(usage?.budget.pct ?? 0) > 85 ? 'rose' : 'brand'} sublabel="من الميزانية" />
            <div className="min-w-0">
              <p className="num text-lg font-bold text-white">{formatUsd(usage?.budget.spentUsd ?? 0)}</p>
              <p className="text-[10px] text-slate-500">من {formatUsd(usage?.budget.monthlyBudgetUsd ?? 0)} شهريًا</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <Wallet size={10} /> {usage?.summary.totals.requests ?? 0} طلب · {formatTokens(usage?.summary.totals.totalTokens ?? 0)} رمز
              </p>
            </div>
          </div>
          <Link href="/settings/ai#usage" className="btn-ghost btn-sm mt-3 w-full justify-center">
            شوف التفاصيل
          </Link>
        </SectionCard>
      </div>

      {selected ? <CaseDetail record={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}
