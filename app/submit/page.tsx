'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Flag,
  Inbox,
  Loader2,
  Package,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskRunner from '@/components/ai/TaskRunner';
import { CopyButton, EmptyState, Field, PageHeader, Progress, RiskBadge, SectionCard, Segmented, StatusBadge } from '@/components/ui/primitives';
import { Ring } from '@/components/ui/charts';
import { useCases, upsertCase, makeDoc } from '@/lib/client/store';
import { guessDocCategory } from '@/lib/client/pipeline';
import { getFile, putFile, dataUrlToBlob } from '@/lib/client/files';
import { makeZip, type ZipEntry } from '@/lib/zip';
import {
  appealNotesAr,
  appealNotesEn,
  buildReadiness,
  documentsChecklist,
  followUp,
  forumPost,
  packFileName,
  REINSTATEMENT_FORM,
  submissionSteps,
} from '@/lib/appeal-kit';
import { caseTaskInput } from '@/lib/case-input';
import { toast } from '@/lib/client/toast';
import type { CaseRecord } from '@/lib/types';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import { cn, formatDate } from '@/lib/utils';

export default function SubmitPage() {
  const cases = useCases();
  const [caseId, setCaseId] = useState('');
  const [live, setLive] = useState<CaseRecord | null>(null);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [notesAr, setNotesAr] = useState('');
  const [notesEn, setNotesEn] = useState('');
  const [profileId, setProfileId] = useState('');
  const [ref, setRef] = useState('');
  const [packing, setPacking] = useState(false);

  const candidates = useMemo(() => cases.filter((c) => c.status !== 'reinstated'), [cases]);

  useEffect(() => {
    if (!caseId && candidates.length) setCaseId(candidates[0].id);
  }, [candidates, caseId]);

  useEffect(() => {
    const found = candidates.find((c) => c.id === caseId) ?? null;
    setLive(found);
    if (found) {
      setNotesAr(found.appealAr || appealNotesAr(found));
      setNotesEn(found.appealEn || appealNotesEn(found));
      setProfileId(found.gbpProfileId || '');
      setRef(found.appealReference || '');
    }
  }, [caseId, cases, candidates]);

  const readiness = useMemo(() => (live ? buildReadiness(live) : null), [live]);
  const fu = live ? followUp(live) : null;

  function patch(next: Partial<CaseRecord>) {
    if (!live) return;
    const updated = { ...live, ...next, updatedAt: new Date().toISOString() };
    upsertCase(updated);
    setLive(updated);
  }

  function onGenerated(res: RunTaskResponse) {
    if (!res.ok) return;
    const parsed = res.parsed as { appeal?: { ar?: string; en?: string } } | null;
    if (!parsed?.appeal) return;
    setNotesAr(parsed.appeal.ar ?? '');
    setNotesEn(parsed.appeal.en ?? '');
    patch({ appealAr: parsed.appeal.ar, appealEn: parsed.appeal.en });
    toast('انكتب الاستئناف', { description: 'راجعه قبل التقديم', tone: 'success' });
  }

  async function addFiles(list: FileList | null) {
    if (!list || !live) return;
    const docs: CaseRecord['documents'] = [];
    for (const file of Array.from(list).slice(0, 6)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (!dataUrl) continue;
      const doc = makeDoc({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        category: guessDocCategory(file.name) as CaseRecord['documents'][number]['category'],
        status: 'parsed',
      });
      await putFile(doc.id, dataUrlToBlob(dataUrl));
      docs.push(doc);
    }
    if (docs.length) {
      patch({ documents: [...live.documents, ...docs] });
      toast('انربطت المستندات', { description: `${docs.length} ملف`, tone: 'success' });
    }
  }

  async function downloadPack() {
    if (!live) return;
    setPacking(true);
    try {
      const encoder = new TextEncoder();
      const entries: ZipEntry[] = [
        { name: '01-ملاحظات-الاستئناف-عربي.txt', data: encoder.encode(notesAr) },
        { name: '02-appeal-notes-en.txt', data: encoder.encode(notesEn) },
        { name: '03-قائمة-المستندات.txt', data: encoder.encode(documentsChecklist(live)) },
        {
          name: '04-خطوات-التقديم.txt',
          data: encoder.encode(`${submissionSteps(live).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nنموذج الاستئناف: ${REINSTATEMENT_FORM}`),
        },
        { name: '05-رسالة-تصعيد-للمنتدى.txt', data: encoder.encode(forumPost(live)) },
        {
          name: '06-بيانات-القضية.json',
          data: encoder.encode(
            JSON.stringify(
              {
                code: live.code,
                businessName: live.businessName,
                profileId: live.gbpProfileId,
                city: live.city,
                category: live.category,
                status: live.status,
                suspensionMessage: live.suspensionMessage,
                diagnosis: live.diagnosis,
                documents: live.documents.map((d) => d.name),
              },
              null,
              2,
            ),
          ),
        },
      ];

      let missing = 0;
      for (const doc of live.documents) {
        const blob = await getFile(doc.id);
        if (!blob) {
          missing += 1;
          continue;
        }
        const buffer = new Uint8Array(await blob.arrayBuffer());
        entries.push({ name: `مستندات/${doc.name}`, data: buffer });
      }

      const zip = makeZip(entries);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packFileName(live)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast('نزلت الحزمة', {
        description: missing ? `${missing} ملف ما كان محفوظ — ارفعه من جديد لو تبي` : 'كل الملفات داخل الحزمة',
        tone: missing ? 'warn' : 'success',
      });
    } catch (err) {
      toast('ما قدرنا نجهز الحزمة', { description: err instanceof Error ? err.message : '', tone: 'error' });
    } finally {
      setPacking(false);
    }
  }

  if (!candidates.length) {
    return (
      <AppShell>
        <PageHeader title="حزمة التقديم" description="نجهز لك كل شي للتقديم: النص، المستندات، والخطوات." />
        <EmptyState
          icon={Package}
          title="ما فيه قضايا جاهزة"
          description="أضف قضية أول، وبعدها نجهز حزمة التقديم."
          action={
            <Link href="/new-case" className="btn-primary">
              أضف قضية
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="حزمة التقديم"
        description="هذي الصفحة اللي تطلع منها الاستئناف صح من أول مرة: النص، الملفات، الخطوات، والمتابعة."
        actions={
          live ? (
            <>
              <TaskRunner taskId="appeal-generation" input={caseTaskInput(live)} caseCode={live.code} variant="ghost" label="ولّد النص بالذكاء" onComplete={onGenerated} />
              <button type="button" className="btn-primary" onClick={downloadPack} disabled={packing}>
                {packing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                نزّل الحزمة
              </button>
            </>
          ) : null
        }
      />

      <div className="card mb-3 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <Field label="القضية" className="sm:flex-1">
          <select className="select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.businessName}
              </option>
            ))}
          </select>
        </Field>
        {live ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={live.status} />
            {live.riskLevel ? <RiskBadge level={live.riskLevel} /> : null}
            <span className="num text-[11px] text-slate-500">{live.code}</span>
          </div>
        ) : null}
      </div>

      {live && readiness ? (
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <SectionCard
              title="جاهزية الملف"
              description="لا تقدّم الاستئناف قبل ما تنتهي البنود الحمراء"
              action={
                <span className={cn('badge', readiness.score >= 80 ? 'badge-mint' : readiness.score >= 50 ? 'badge-amber' : 'badge-rose')}>
                  {readiness.score}% جاهز
                </span>
              }
            >
              <Progress value={readiness.score} tone={readiness.score >= 80 ? 'mint' : readiness.score >= 50 ? 'amber' : 'rose'} className="mb-3" />
              <ul className="space-y-1.5">
                {readiness.items.map((item) => (
                  <li
                    key={item.key}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-2.5 py-2',
                      item.ok
                        ? 'border-line/50 bg-ink-900/40'
                        : item.critical
                          ? 'border-rosex-500/25 bg-rosex-500/[0.05]'
                          : 'border-amberx-500/20 bg-amberx-500/[0.04]',
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {item.ok ? <Check size={13} className="text-mint-400" /> : <X size={13} className={item.critical ? 'text-rosex-400' : 'text-amberx-400'} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-200">{item.label}</p>
                      {!item.ok ? <p className="text-[10px] leading-relaxed text-slate-500">{item.fix}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="ملاحظات الاستئناف"
              description="الصقها زي ما هي في أداة الاستئناف — نسخة وحدة فقط"
              action={
                <Segmented
                  value={lang}
                  onChange={setLang}
                  size="sm"
                  options={[
                    { value: 'ar', label: 'عربي' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              }
            >
              <textarea
                value={lang === 'ar' ? notesAr : notesEn}
                onChange={(e) => (lang === 'ar' ? setNotesAr(e.target.value) : setNotesEn(e.target.value))}
                dir={lang === 'en' ? 'ltr' : 'rtl'}
                className="min-h-[220px] w-full resize-y rounded-xl border border-line bg-ink-900/60 p-3 text-[12px] leading-relaxed text-slate-200 focus:border-brand-500/60 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <CopyButton value={lang === 'ar' ? notesAr : notesEn} label="انسخ النص" />
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    patch({ appealAr: notesAr, appealEn: notesEn });
                    toast('انحفظ النص في القضية', { tone: 'success' });
                  }}
                >
                  احفظ في القضية
                </button>
                <span className="ms-auto text-[10px] text-slate-600">{lang === 'ar' ? 'عربي' : 'English'} · جاهز للصق</span>
              </div>
            </SectionCard>

            <SectionCard title="خطوات التقديم" description="بالترتيب — لا تقفز خطوة">
              <ol className="space-y-2">
                {submissionSteps(live).map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-500/15 text-[10px] font-bold text-brand-200">
                      {i + 1}
                    </span>
                    <span className="text-[11px] leading-relaxed text-slate-300">{step}</span>
                  </li>
                ))}
              </ol>
              <a href={REINSTATEMENT_FORM} target="_blank" rel="noreferrer" className="btn-primary mt-3 w-full justify-center">
                <ExternalLink size={15} /> افتح أداة الاستئناف الرسمية
              </a>
            </SectionCard>
          </div>

          <div className="space-y-3">
            <SectionCard title="حالة الحزمة" description="النص والمستندات والجاهزية">
              <div className="flex items-center gap-4">
                <Ring value={readiness.score} size={78} tone={readiness.score >= 80 ? 'mint' : readiness.score >= 50 ? 'amber' : 'rose'} sublabel="جاهزية" />
                <div className="min-w-0 space-y-1 text-[11px]">
                  <p className="text-slate-300">
                    مستندات: <span className="num text-white">{live.documents.length}</span>
                  </p>
                  <p className="text-slate-300">
                    عوائق: <span className={cn('num', readiness.blockers.length ? 'text-rosex-400' : 'text-mint-400')}>{readiness.blockers.length}</span>
                  </p>
                  <p className="text-slate-300">
                    النص: <span className={notesAr ? 'text-mint-400' : 'text-rosex-400'}>{notesAr ? 'جاهز' : 'ناقص'}</span>
                  </p>
                </div>
              </div>
              <button type="button" className="btn-ghost btn-sm mt-3 w-full justify-center" onClick={downloadPack} disabled={packing}>
                <Package size={12} /> نزّل ZIP كامل
              </button>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
                الحزمة فيها: النص العربي والإنجليزي، قائمة المستندات، الخطوات، رسالة تصعيد، وكل ملف رفعته.
              </p>
            </SectionCard>

            <SectionCard title="رقم الملف + المتابعة" description="من هنا نعرف وين وصل الاستئناف">
              <Field label="Profile ID" hint="الملف ← الثلاث نقاط ← Business profile settings ← Advanced settings">
                <div className="flex gap-1.5">
                  <input
                    className="input flex-1 font-mono text-xs"
                    dir="ltr"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    placeholder="1234 5678 9012 3456 7890"
                  />
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={() => {
                      patch({ gbpProfileId: profileId.trim() });
                      toast('انحفظ رقم الملف', { tone: 'success' });
                    }}
                  >
                    حفظ
                  </button>
                </div>
              </Field>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  className="btn-ghost btn-sm justify-center"
                  onClick={() => {
                    patch({ appealSubmittedAt: new Date().toISOString(), appealReference: ref, status: 'submitted' });
                    toast('سجلنا التقديم', { description: 'لا ترسل ثاني قبل ٧ أيام', tone: 'success' });
                  }}
                >
                  <Send size={12} /> قدّمت الاستئناف
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm justify-center"
                  onClick={() => {
                    patch({ decisionAt: new Date().toISOString(), status: 'reinstated' });
                    toast('مبروك — رجع الملف', { tone: 'success' });
                  }}
                >
                  <CircleCheck size={12} /> انفك التعليق
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm justify-center"
                  onClick={() => {
                    patch({ decisionAt: new Date().toISOString(), status: 'rejected' });
                    toast('سجلنا الرفض', { description: 'شوف رسالة التصعيد تحت', tone: 'warn' });
                  }}
                >
                  <Flag size={12} /> انرفض
                </button>
                <Link href={`/documents`} className="btn-ghost btn-sm justify-center">
                  <Inbox size={12} /> المستندات
                </Link>
              </div>

              <Field label="رقم الاستئناف (اختياري)" className="mt-3">
                <input className="input font-mono text-xs" dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Appeal reference" />
              </Field>

              {live.appealSubmittedAt ? (
                <p className="mt-2 rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2 text-[10px] text-slate-400">
                  قدّمت بتاريخ {formatDate(live.appealSubmittedAt)} — {fu?.message}
                </p>
              ) : (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amberx-500/20 bg-amberx-500/[0.05] px-2.5 py-2 text-[10px] leading-relaxed text-amberx-300">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  لا ترسل استئناف قبل ما تنتهي البواقي الحمراء فوق.
                </p>
              )}
            </SectionCard>

            <SectionCard title="لو انرفض" description="رسالة جاهزة للمنتدى الرسمي">
              <div className="max-h-52 overflow-y-auto rounded-xl border border-line/60 bg-ink-900/60 p-2.5">
                <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-400" dir="ltr">
                  {forumPost(live)}
                </pre>
              </div>
              <div className="mt-2 flex gap-1.5">
                <CopyButton value={forumPost(live)} label="انسخ الرسالة" />
                <a href="https://support.google.com/business/community" target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                  <ExternalLink size={12} /> المنتدى
                </a>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-600">لا تنشر المستندات في المنتدى — عام ومكشوف.</p>
            </SectionCard>

            <SectionCard title="أضف مستند ناقص">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-ink-900/40 px-3 py-3 transition-colors hover:border-brand-500/40">
                <FileUp size={14} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-300">ارفع ملف</span>
                <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </label>
              <ul className="mt-2 space-y-1">
                {live.documents.slice(-4).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-line/50 bg-ink-900/40 px-2 py-1.5">
                    <span className="truncate text-[10px] text-slate-300">{d.name}</span>
                    <span className="text-[9px] text-slate-600">{d.category}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {live ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <Sparkles size={11} /> كل النصوص والمستندات تخص قضيتك — ما نقدّم أي استئناف عنك.
        </p>
      ) : null}
    </AppShell>
  );
}
