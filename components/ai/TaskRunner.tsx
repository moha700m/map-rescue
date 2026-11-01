'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileUp, Loader2, Play, RefreshCw, Settings2, Sparkles, TriangleAlert, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ModelSelect from '@/components/ai/ModelSelect';
import ResultView from '@/components/ai/ResultView';
import { AI_TASKS, type AiTaskId } from '@/lib/ai/tasks';
import type { Attachment } from '@/lib/ai/messages';
import type { ModelInfo } from '@/lib/ai/models';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import { fetchSettings, listModels, runTask } from '@/lib/client/ai';
import { toast } from '@/lib/client/toast';
import { cn, formatTokens, formatUsd } from '@/lib/utils';

export default function TaskRunner({
  taskId,
  input,
  caseCode,
  label,
  variant = 'primary',
  className,
  attachments: presetAttachments,
  onComplete,
}: {
  taskId: AiTaskId;
  input: Record<string, unknown>;
  caseCode?: string;
  label?: string;
  variant?: 'primary' | 'ghost' | 'subtle';
  className?: string;
  attachments?: Attachment[];
  onComplete?: (result: RunTaskResponse) => void;
}) {
  const task = AI_TASKS[taskId];
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [model, setModel] = useState('');
  const [payload, setPayload] = useState(() => JSON.stringify(input, null, 2));
  const [editPayload, setEditPayload] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(presetAttachments || []);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunTaskResponse | null>(null);

  const load = useCallback(async () => {
    setLoadingModels(true);
    try {
      const [catalog, settings] = await Promise.all([listModels(), fetchSettings()]);
      setModels(catalog.models);
      setModel((prev) => prev || settings.taskModels[taskId] || settings.defaultModel);
    } catch {
      /* ignore */
    } finally {
      setLoadingModels(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && !models.length) load();
  }, [open, models.length, load]);

  useEffect(() => {
    if (open) setPayload(JSON.stringify(input, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsFiles = task.needs.includes('image') || task.needs.includes('file');

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      if (file.size > 8 * 1024 * 1024) {
        toast('الملف كبير جدًا', { description: `${file.name} يتجاوز 8MB`, tone: 'warn' });
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      }).catch(() => '');
      if (dataUrl) next.push({ name: file.name, mimeType: file.type || 'application/octet-stream', dataUrl, size: file.size });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
  }

  async function run() {
    setRunning(true);
    setResult(null);
    let parsedPayload: Record<string, unknown> = input;
    if (editPayload) {
      try {
        parsedPayload = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        setRunning(false);
        toast('صيغة JSON غير صالحة', { description: 'راجع الحمولة قبل التشغيل.', tone: 'error' });
        return;
      }
    }
    const res = await runTask({ taskId, input: parsedPayload, model, attachments, caseCode });
    setResult(res);
    setRunning(false);
    if (res.ok) {
      toast('اكتملت المهمة', { description: `${res.model} · ${formatUsd(res.usage.costUsd)}`, tone: 'success' });
    } else {
      toast('فشل تشغيل المهمة', { description: res.error, tone: 'error' });
    }
    onComplete?.(res);
  }

  const btnClass = variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-subtle';

  return (
    <>
      <button type="button" className={cn(btnClass, className)} onClick={() => setOpen(true)}>
        <Sparkles size={14} />
        {label || task.titleAr}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={task.titleAr}
        description={task.descAr}
        size="xl"
        footer={
          <>
            <button type="button" className="btn-subtle" onClick={() => setOpen(false)}>
              إغلاق
            </button>
            <button type="button" className="btn-primary" onClick={run} disabled={running || !model}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? 'جارٍ التشغيل…' : 'تشغيل عبر OpenRouter'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="label">النموذج المستخدم</span>
              <ModelSelect value={model} onChange={setModel} models={models} loading={loadingModels} compact />
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                <Settings2 size={10} />
                يُدار من إعدادات الذكاء الاصطناعي — يمكن تغييره دون إعادة نشر.
              </p>
            </div>
            <div>
              <span className="label">بيانات الجلسة</span>
              <div className="rounded-xl border border-line bg-ink-900/60 p-2.5 text-[11px] text-slate-400">
                <p>
                  كود القضية: <span className="num text-slate-200">{caseCode || '—'}</span>
                </p>
                <p className="mt-0.5">
                  نوع المخرجات: <span className="text-slate-200">{task.output === 'json' ? 'JSON منظم' : task.output === 'markdown' ? 'Markdown' : 'نص'}</span>
                </p>
              </div>
            </div>
          </div>

          {needsFiles ? (
            <div>
              <span className="label">المرفقات (صور / PDF)</span>
              <div className="rounded-xl border border-dashed border-line bg-ink-900/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="btn-ghost btn-sm cursor-pointer">
                    <FileUp size={13} />
                    رفع ملفات
                    <input type="file" multiple accept="image/*,application/pdf,text/plain" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </label>
                  <span className="text-[10px] text-slate-500">حتى 4 ملفات · 8MB لكل ملف</span>
                </div>
                {attachments.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {attachments.map((a, i) => (
                      <span key={`${a.name}-${i}`} className="badge-muted">
                        {a.name}
                        <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} aria-label="إزالة">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">حمولة الإدخال</span>
              <button type="button" onClick={() => setEditPayload((v) => !v)} className="text-[10px] font-semibold text-brand-300 hover:text-brand-200">
                {editPayload ? 'عرض فقط' : 'تعديل JSON'}
              </button>
            </div>
            {editPayload ? (
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={10}
                dir="ltr"
                className="input font-mono text-[11px] leading-relaxed"
              />
            ) : (
              <pre
                dir="ltr"
                className="max-h-52 overflow-auto rounded-xl border border-line bg-ink-900/60 p-3 font-mono text-[11px] leading-relaxed text-slate-400"
              >
                {payload}
              </pre>
            )}
          </div>

          {running ? (
            <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
                <Loader2 size={14} className="animate-spin" />
                يتم إرسال الطلب إلى OpenRouter…
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ) : null}

          {result ? (
            result.ok ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-mint-500/25 bg-mint-500/[0.06] px-3 py-2">
                  <span className="badge-mint">اكتمل</span>
                  <span className="num text-[10px] text-slate-400" dir="ltr">
                    {result.model}
                  </span>
                  <span className="num ms-auto text-[10px] text-slate-400">
                    {formatTokens(result.usage.totalTokens)} رمز · {formatUsd(result.usage.costUsd)} · {result.latencyMs}ms
                  </span>
                </div>
                {result.warnings?.length ? (
                  <div className="rounded-lg border border-amberx-500/25 bg-amberx-500/[0.07] p-2.5 text-[11px] text-amberx-300">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="flex gap-1.5">
                        <TriangleAlert size={11} className="mt-1 shrink-0" /> {w}
                      </p>
                    ))}
                  </div>
                ) : null}
                <ResultView parsed={result.parsed} raw={result.content} />
              </div>
            ) : (
              <div className="rounded-xl border border-rosex-500/30 bg-rosex-500/[0.07] p-3.5">
                <p className="text-xs font-bold text-rosex-300">{result.error}</p>
                <p className="mt-1 text-[11px] text-slate-400" dir="ltr">
                  {result.code} · {result.status}
                </p>
                {result.suggestion ? <p className="mt-2 text-[11px] text-slate-300">{result.suggestion}</p> : null}
                <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => load()}>
                  <RefreshCw size={12} /> تحديث النماذج
                </button>
              </div>
            )
          ) : null}
        </div>
      </Modal>
    </>
  );
}
