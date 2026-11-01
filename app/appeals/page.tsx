'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, Languages, PenLine, Sparkles, Wand2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskRunner from '@/components/ai/TaskRunner';
import { CopyButton, EmptyState, Field, PageHeader, Segmented, StatusBadge } from '@/components/ui/primitives';
import { caseTaskInput } from '@/lib/case-input';
import { useCases, upsertCase } from '@/lib/client/store';
import { toast } from '@/lib/client/toast';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import type { CaseRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AppealsPage() {
  const cases = useCases();
  const candidates = useMemo(
    () => cases.filter((c) => !['reinstated'].includes(c.status)),
    [cases],
  );
  const [selectedId, setSelectedId] = useState('');
  const [lang, setLang] = useState<'ar' | 'en' | 'both'>('both');
  const [ar, setAr] = useState('');
  const [en, setEn] = useState('');

  const selected = candidates.find((c) => c.id === selectedId) ?? candidates[0];

  useEffect(() => {
    if (!selectedId && candidates.length) setSelectedId(candidates[0].id);
  }, [candidates, selectedId]);

  useEffect(() => {
    setAr(selected?.appealAr ?? '');
    setEn(selected?.appealEn ?? '');
  }, [selected?.id, selected?.appealAr, selected?.appealEn]);

  function onGenerated(result: RunTaskResponse) {
    if (!result.ok) return;
    const parsed = result.parsed as { appeal?: { ar?: string; en?: string } } | null;
    if (!parsed?.appeal) return;
    setAr(parsed.appeal.ar ?? '');
    setEn(parsed.appeal.en ?? '');
    if (selected) {
      upsertCase({
        ...selected,
        appealAr: parsed.appeal.ar,
        appealEn: parsed.appeal.en,
        status: 'appeal_ready',
        timeline: [...selected.timeline, { at: new Date().toISOString(), label: 'تم توليد الاستئناف', tone: 'neutral' }],
      });
    }
    toast('تم توليد الاستئناف', { description: 'راجعه قبل التقديم اليدوي', tone: 'success' });
  }

  function save() {
    if (!selected) return;
    upsertCase({ ...selected, appealAr: ar, appealEn: en });
    toast('تم حفظ المسودة', { tone: 'success' });
  }

  function download() {
    const text = `MAP RESCUE AI — ${selected?.code}\n${selected?.businessName}\n\n[AR]\n${ar}\n\n[EN]\n${en}\n`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `appeal-${selected?.code ?? 'draft'}.txt`;
    a.click();
  }

  if (!candidates.length) {
    return (
      <AppShell>
        <PageHeader title="مولد الاستئناف" description="صياغة استئناف رسمي بالعربية والإنجليزية جاهز للتقديم اليدوي." />
        <EmptyState
          icon={FileText}
          title="ما فيه قضايا"
          description="أضف قضية أول، وبعدها نكتب لك الاستئناف."
          action={
            <Link href="/new-case" className="btn-primary">
              قضية جديدة
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="مولد الاستئناف"
        description="الاستئناف ينكتب عربي وإنجليزي من بيانات القضية. راجعه، عدّل عليه، وبعدها قدّمه بنفسك من صفحة قوقل."
        actions={
          selected ? (
            <TaskRunner
              taskId="appeal-generation"
              input={caseTaskInput(selected)}
              caseCode={selected.code}
              label="اكتب استئناف جديد"
              onComplete={onGenerated}
            />
          ) : null
        }
      />

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <div className="card p-3.5">
            <Field label="القضية">
              <select className="select" value={selected?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.businessName}
                  </option>
                ))}
              </select>
            </Field>
            {selected ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={selected.status} />
                  <span className="badge-muted">{selected.category}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {selected.diagnosis?.rootCause.label ?? 'لا يوجد تشخيص محفوظ — قدّمه للحصول على استئناف أدق.'}
                </p>
                <div className="rounded-lg border border-amberx-500/20 bg-amberx-500/[0.06] px-2.5 py-2 text-[10px] leading-relaxed text-amberx-300">
                  لا تقدّم الاستئناف قبل تصحيح الأخطاء المرصودة في التشخيص — الاستئناف مع تعارض قائم يقلل فرص القبول.
                </div>
              </div>
            ) : null}
          </div>

          <div className="card p-3.5">
            <p className="section-title mb-2">العرض</p>
            <Segmented
              value={lang}
              onChange={setLang}
              options={[
                { value: 'both', label: 'اللغتان' },
                { value: 'ar', label: 'عربي' },
                { value: 'en', label: 'English' },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" className="btn-ghost btn-sm" onClick={save}>
                <PenLine size={12} /> حفظ
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={download}>
                <Download size={12} /> تنزيل
              </button>
            </div>
          </div>
        </aside>

        <div className={cn('grid gap-3', lang === 'both' ? 'xl:grid-cols-2' : '')}>
          {lang !== 'en' ? (
            <section className="card flex flex-col overflow-hidden">
              <header className="flex items-center justify-between border-b border-line/60 px-4 py-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Languages size={13} /> النسخة العربية
                </span>
                <span className="num text-[10px] text-slate-500">{ar.split(/\s+/).filter(Boolean).length} كلمة</span>
              </header>
              <textarea
                value={ar}
                onChange={(e) => setAr(e.target.value)}
                placeholder="نص الاستئناف العربي بيطلع هنا — تقدر تعدّل عليه براحتك."
                className="min-h-[320px] flex-1 resize-none bg-transparent p-4 text-[13px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
              <footer className="flex items-center justify-between border-t border-line/60 px-4 py-2.5">
                <span className="text-[10px] text-slate-500">حرّر بحرية قبل النسخ</span>
                <CopyButton value={ar} />
              </footer>
            </section>
          ) : null}

          {lang !== 'ar' ? (
            <section className="card flex flex-col overflow-hidden" dir="ltr">
              <header className="flex items-center justify-between border-b border-line/60 px-4 py-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Languages size={13} /> English version
                </span>
                <span className="num text-[10px] text-slate-500">{en.split(/\s+/).filter(Boolean).length} words</span>
              </header>
              <textarea
                value={en}
                onChange={(e) => setEn(e.target.value)}
                placeholder="The generated English appeal will appear here."
                className="min-h-[320px] flex-1 resize-none bg-transparent p-4 text-start text-[13px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
              <footer className="flex items-center justify-between border-t border-line/60 px-4 py-2.5">
                <span className="text-[10px] text-slate-500">Edit freely before copying</span>
                <CopyButton value={en} />
              </footer>
            </section>
          ) : null}
        </div>
      </div>

      <div className="card mt-3 flex flex-wrap items-center gap-2 p-3.5">
        <Sparkles size={14} className="text-brand-300" />
        <p className="text-[11px] text-slate-400">لمسات إضافية عبر OpenRouter:</p>
        {selected ? (
          <>
            <TaskRunner taskId="bilingual-writing" input={{ kind: 'تحسين نبرة الاستئناف', text: `${ar}\n\n---\n\n${en}`, tone: 'formal' }} caseCode={selected.code} variant="ghost" className="btn-sm" label="تحسين الصياغة" />
            <TaskRunner taskId="evidence-comparison" input={caseTaskInput(selected)} caseCode={selected.code} variant="ghost" className="btn-sm" label="فحص التعارضات" />
            <TaskRunner taskId="policy-analysis" input={caseTaskInput(selected)} caseCode={selected.code} variant="ghost" className="btn-sm" label="تحليل السياسات" />
          </>
        ) : null}
        <span className="ms-auto flex items-center gap-1 text-[10px] text-slate-600">
          <Wand2 size={11} /> كل استدعاء يمر عبر بوابة OpenRouter
        </span>
      </div>
    </AppShell>
  );
}
