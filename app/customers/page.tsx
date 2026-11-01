'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Filter, Plus, Search, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import CaseDetail from '@/components/cases/CaseDetail';
import { EmptyState, PageHeader, RiskBadge, StatusBadge } from '@/components/ui/primitives';
import { useCases } from '@/lib/client/store';
import { STATUS_META, STATUS_ORDER, COUNTRY_META } from '@/lib/constants';
import type { CaseRecord, CaseStatus } from '@/lib/types';
import { cn, formatDate, timeAgo } from '@/lib/utils';

export default function CustomersPage() {
  const cases = useCases();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CaseStatus | 'all'>('all');
  const [selected, setSelected] = useState<CaseRecord | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases
      .filter((c) => (status === 'all' ? true : c.status === status))
      .filter((c) =>
        q
          ? `${c.businessName} ${c.customerName} ${c.code} ${c.city} ${c.category}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [cases, query, status]);

  function exportCsv() {
    const header = ['code', 'business', 'customer', 'phone', 'city', 'status', 'risk', 'created'];
    const rows = filtered.map((c) => [c.code, c.businessName, c.customerName, c.customerPhone, c.city, c.status, c.riskLevel ?? '', c.createdAt]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <AppShell>
      <PageHeader
        title="العملاء والقضايا"
        description="كل قضايا الاسترداد في مكان واحد — ابحث، صفِّ، وافتح أي قضية لتشغيل التشخيص."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={exportCsv} disabled={!filtered.length}>
              <Download size={15} /> تصدير CSV
            </button>
            <Link href="/new-case" className="btn-primary">
              <Plus size={15} /> قضية جديدة
            </Link>
          </>
        }
      />

      <div className="card mb-3 p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-ink-900/70 px-3">
            <Search size={15} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، النشاط، الكود، أو المدينة…"
              className="h-10 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} className="text-[10px] text-slate-500 hover:text-slate-300">
                مسح
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Filter size={13} className="shrink-0 text-slate-500" />
            <button
              type="button"
              onClick={() => setStatus('all')}
              className={cn('badge shrink-0 transition-colors', status === 'all' ? 'badge-brand' : 'badge-muted')}
            >
              الكل ({cases.length})
            </button>
            {STATUS_ORDER.map((s) => {
              const count = cases.filter((c) => c.status === s).length;
              if (!count) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn('badge shrink-0 transition-colors', status === s ? STATUS_META[s].className : 'badge-muted')}
                >
                  {STATUS_META[s].label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>النشاط</th>
                  <th>العميل</th>
                  <th>الموقع</th>
                  <th>الحالة</th>
                  <th>المخاطر</th>
                  <th>ثقة AI</th>
                  <th>التحديث</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                    <td>
                      <span className="num text-[11px] font-bold text-brand-300">{c.code}</span>
                    </td>
                    <td>
                      <p className="text-xs font-semibold text-slate-100">{c.businessName}</p>
                      <p className="text-[10px] text-slate-500">{c.category}</p>
                    </td>
                    <td>
                      <p className="text-xs text-slate-300">{c.customerName}</p>
                      <p className="num text-[10px] text-slate-500" dir="ltr">
                        {c.customerPhone}
                      </p>
                    </td>
                    <td>
                      <p className="text-xs text-slate-300">
                        {COUNTRY_META[c.country]?.flag} {c.city}
                      </p>
                      <p className="text-[10px] text-slate-500">{formatDate(c.createdAt)}</p>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>{c.riskLevel ? <RiskBadge level={c.riskLevel} /> : <span className="text-slate-600">—</span>}</td>
                    <td>
                      {c.confidence ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-10 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.confidence}%` }} />
                          </div>
                          <span className="num text-[10px] text-slate-400">{c.confidence}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="text-[11px] text-slate-500">{timeAgo(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={cases.length ? 'لا نتائج مطابقة' : 'لا توجد قضايا بعد'}
          description={cases.length ? 'جرّب تعديل البحث أو إزالة الفلاتر.' : 'ابدأ بإنشاء أول قضية استرداد.'}
          action={
            <Link href="/new-case" className="btn-primary">
              <Plus size={14} /> قضية جديدة
            </Link>
          }
        />
      )}

      {selected ? <CaseDetail record={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}
