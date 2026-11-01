'use client';

import { useMemo, useState } from 'react';
import { FileUp, FolderOpen, ScanText, Trash2, FileText, FileSearch } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskRunner from '@/components/ai/TaskRunner';
import { DocBadge, EmptyState, Field, PageHeader } from '@/components/ui/primitives';
import { caseTaskInput } from '@/lib/case-input';
import { useCases, upsertCase, makeDoc } from '@/lib/client/store';
import { guessDocCategory } from '@/lib/client/pipeline';
import { putFile, dataUrlToBlob } from '@/lib/client/files';
import { toast } from '@/lib/client/toast';
import type { Attachment } from '@/lib/ai/messages';
import type { CaseRecord } from '@/lib/types';
import { bytes, formatDate } from '@/lib/utils';

export default function DocumentsPage() {
  const cases = useCases();
  const [caseId, setCaseId] = useState(cases[0]?.id ?? '');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const selected = cases.find((c) => c.id === caseId) ?? cases[0];

  const allDocs = useMemo(
    () => cases.flatMap((c) => c.documents.map((d) => ({ ...d, caseCode: c.code, caseId: c.id, business: c.businessName }))),
    [cases],
  );

  async function readFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > 10 * 1024 * 1024) {
        toast('الملف كبير جدًا', { description: file.name, tone: 'warn' });
        continue;
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (dataUrl) next.push({ name: file.name, mimeType: file.type || 'application/octet-stream', dataUrl, size: file.size });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 5));

    // Smart link: attach to the selected case right away, with a guessed type.
    if (selected && next.length) {
      const docs = next.map((a) =>
        makeDoc({
          name: a.name,
          mimeType: a.mimeType,
          size: a.size ?? 0,
          category: guessDocCategory(a.name) as CaseRecord['documents'][number]['category'],
          status: 'parsed',
        }),
      );
      for (let i = 0; i < docs.length; i += 1) {
        if (next[i]?.dataUrl) await putFile(docs[i].id, dataUrlToBlob(next[i].dataUrl));
      }
      upsertCase({
        ...selected,
        documents: [...selected.documents, ...docs],
        timeline: [...selected.timeline, { at: new Date().toISOString(), label: `انربطت ${docs.length} مستندات بالقضية`, tone: 'neutral' }],
      });
      toast('انربطت تلقائي', { description: `${docs.length} ملف على ${selected.code}`, tone: 'success' });
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="مركز المستندات"
        description="ارفع السجل والرخصة وصور الواجهة. الملفات تنربط بالقضية تلقائي، والذكاء يقراها ويقول لك وش ناقص."
      />

      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold text-slate-100">ارفع مستندات</h2>
          <Field label="ربط بالقضية">
            <select className="select" value={selected?.id ?? ''} onChange={(e) => setCaseId(e.target.value)}>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.businessName}
                </option>
              ))}
            </select>
          </Field>

          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-900/40 px-4 py-8 text-center transition-colors hover:border-brand-500/40 hover:bg-brand-500/[0.04]">
            <FileUp size={22} className="text-slate-500" />
            <p className="mt-2 text-xs font-semibold text-slate-300">اسحب الملفات أو اضغط للاختيار</p>
            <p className="mt-0.5 text-[10px] text-slate-500">PDF · JPG · PNG · TXT — حتى 10MB للملف</p>
            <input type="file" multiple accept="image/*,application/pdf,text/plain" className="hidden" onChange={(e) => readFiles(e.target.files)} />
          </label>

          {attachments.length ? (
            <ul className="mt-3 space-y-1.5">
              {attachments.map((a, i) => (
                <li key={`${a.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-line/60 bg-ink-900/60 px-2.5 py-2">
                  <FileText size={13} className="text-slate-500" />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{a.name}</span>
                  <span className="num text-[10px] text-slate-600">{bytes(a.size ?? 0)}</span>
                  <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} aria-label="إزالة">
                    <Trash2 size={12} className="text-slate-500 hover:text-rosex-400" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected ? (
              <>
                <TaskRunner
                  taskId="document-analysis"
                  input={caseTaskInput(selected)}
                  attachments={attachments}
                  caseCode={selected.code}
                  variant="ghost"
                  className="btn-sm"
                  label="تحليل المستندات"
                />
                <TaskRunner
                  taskId="ocr-interpretation"
                  input={{ caseCode: selected.code, notes: 'استخرج الحقول الرسمية بدقة' }}
                  attachments={attachments}
                  caseCode={selected.code}
                  variant="ghost"
                  className="btn-sm"
                  label="تفسير OCR"
                />
              </>
            ) : null}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
            الملف ينربط بالقضية أول ما تختاره — والتحليل يمر على OpenRouter بس.
          </p>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">مكتبة الأدلة</h2>
            <span className="badge-muted">{allDocs.length} مستند</span>
          </div>
          {allDocs.length ? (
            <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pe-1">
              {allDocs.map((doc) => (
                <li key={`${doc.caseId}-${doc.id}`} className="flex items-center gap-2 rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <FileSearch size={13} className="shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-slate-200">{doc.name}</p>
                    <p className="num truncate text-[10px] text-slate-600">
                      {doc.caseCode} · {formatDate(doc.addedAt)}
                    </p>
                  </div>
                  <DocBadge category={doc.category} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FolderOpen} title="ما فيه مستندات بعد" description="ارفع أول مستند لبدء التحليل." />
          )}
        </section>
      </div>

      <div className="card mt-3 p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-100">
          <ScanText size={14} className="text-brand-300" /> كيف تشتغل؟
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[
            { t: '1 · الرفع', d: 'يُقرأ الملف في المتصفح ويُحوَّل إلى base64 ثم يُرسل إلى مسار الخادم.' },
            { t: '2 · النموذج', d: 'يُختار نموذج يدعم الصور/الملفات تلقائيًا، وإلا يُرفض الطلب برسالة واضحة.' },
            { t: '3 · التسجيل', d: 'كل طلب يُسجَّل في سجل الاستخدام مع الرموز والتكلفة والزمن.' },
          ].map((s) => (
            <div key={s.t} className="rounded-xl border border-line/60 bg-ink-900/50 p-3">
              <p className="text-[11px] font-bold text-slate-200">{s.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
