'use client';

import { AI_TASKS, type AiTaskId } from '@/lib/ai/tasks';
import { pickModelForTask } from '@/lib/ai/models';
import type { RunTaskResponse } from '@/lib/ai/contracts';
import type { Attachment } from '@/lib/ai/messages';
import type { CaseRecord, DiagnosisResult } from '@/lib/types';
import { fetchSettings, listModels, runTask } from './ai';
import { upsertCase } from './store';
import { isDemo } from './demo';
import { caseTaskInput } from '@/lib/case-input';

export type StepStatus = 'run' | 'ok' | 'skip' | 'fail';

export interface PipelineEvent {
  id: string;
  step: AiTaskId | 'documents' | 'start' | 'done';
  title: string;
  status: StepStatus;
  detail?: string;
  model?: string;
  ms?: number;
}

export interface PipelineResult {
  record: CaseRecord;
  events: PipelineEvent[];
  ok: boolean;
}

function ev(step: PipelineEvent['step'], title: string, status: StepStatus, extra: Partial<PipelineEvent> = {}): PipelineEvent {
  return { id: `${step}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, step, title, status, ...extra };
}

/**
 * The "just do it" pipeline: runs every relevant AI task in the right order,
 * picks the right model per task, and saves each result into the case as it lands.
 */
export async function runCasePipeline(
  record: CaseRecord,
  opts: { onEvent?: (e: PipelineEvent) => void; attachments?: Attachment[]; webKeyMissing?: boolean } = {},
): Promise<PipelineResult> {
  const events: PipelineEvent[] = [];
  const push = (e: PipelineEvent) => {
    events.push(e);
    opts.onEvent?.(e);
  };

  const [settings, catalog] = await Promise.all([fetchSettings(), listModels()]);
  const models = catalog.models;
  const modelFor = (taskId: AiTaskId) => pickModelForTask(AI_TASKS[taskId], models, settings);

  let current: CaseRecord = {
    ...record,
    status: 'analyzing',
    timeline: [...record.timeline, { at: new Date().toISOString(), label: 'بدأ التحليل التلقائي', tone: 'neutral' }],
  };
  upsertCase(current);
  push(ev('start', 'بدينا — نجهّز القضية ونختار النموذج المناسب', 'run'));

  const call = async (taskId: AiTaskId, input: Record<string, unknown>, attachments?: Attachment[]) => {
    const model = modelFor(taskId);
    const started = Date.now();
    push(ev(taskId, AI_TASKS[taskId].titleAr, 'run', { model }));
    const res: RunTaskResponse = await runTask({ taskId, input, attachments, model, caseCode: current.code });
    if (!res.ok) {
      push(ev(taskId, AI_TASKS[taskId].titleAr, 'fail', { detail: res.error, model, ms: Date.now() - started }));
      return null;
    }
    push(
      ev(taskId, AI_TASKS[taskId].titleAr, 'ok', {
        detail: `${res.usage.totalTokens.toLocaleString('en-US')} رمز`,
        model: res.model,
        ms: res.latencyMs,
      }),
    );
    return res;
  };

  // 1) Documents (only when files are available)
  // In demo mode we run the document step too, so the walkthrough shows the full pipeline.
  const hasFiles = (opts.attachments?.length ?? 0) > 0 || (isDemo() && record.documents.length > 0);
  if (hasFiles) {
    const docRes = await call('document-analysis', caseTaskInput(current), opts.attachments);
    if (docRes?.parsed) {
      current = {
        ...current,
        intel: { ...current.intel, documents: docRes.parsed },
        timeline: [
          ...current.timeline,
          { at: new Date().toISOString(), label: 'تم تحليل المستندات', tone: 'good' },
        ],
      };
      upsertCase(current);
    }
  } else {
    push(ev('documents', 'تحليل المستندات', 'skip', { detail: 'ما فيه ملفات مرفوعة — نكمل بدونها' }));
  }

  // 2) Diagnosis (the core)
  const diagRes = await call('gbp-diagnosis', caseTaskInput(current));
  if (!diagRes) {
    const failed = { ...current, status: 'new' as const };
    upsertCase(failed);
    push(ev('done', 'وقفنا — التشخيص ما نجح. راجع المفتاح أو النموذج ثم أعد المحاولة', 'fail'));
    return { record: failed, events, ok: false };
  }

  const parsed = diagRes.parsed as DiagnosisResult | null;
  if (parsed && parsed.rootCause) {
    current = {
      ...current,
      diagnosis: parsed,
      riskLevel: parsed.riskLevel ?? current.riskLevel,
      confidence: parsed.confidence ?? parsed.rootCause.confidence,
      status: 'diagnosis_ready',
      timeline: [...current.timeline, { at: new Date().toISOString(), label: 'خلص التشخيص', tone: 'good' }],
    };
    upsertCase(current);
  }

  // 3) Evidence comparison + 4) appeal + 5) recommendations, in parallel-safe sequence
  const evidence = await call('evidence-comparison', caseTaskInput(current));
  if (evidence?.parsed) {
    current = { ...current, intel: { ...current.intel, evidence: evidence.parsed } };
    upsertCase(current);
  }

  const appeal = await call('appeal-generation', caseTaskInput(current));
  const appealParsed = appeal?.parsed as { appeal?: { ar?: string; en?: string } } | null;
  if (appealParsed?.appeal) {
    current = {
      ...current,
      appealAr: appealParsed.appeal.ar ?? current.appealAr,
      appealEn: appealParsed.appeal.en ?? current.appealEn,
      status: 'appeal_ready',
      timeline: [...current.timeline, { at: new Date().toISOString(), label: 'جهّزنا الاستئناف', tone: 'neutral' }],
    };
    upsertCase(current);
  }

  const reco = await call('recovery-recommendations', caseTaskInput(current));
  if (reco?.parsed) {
    current = { ...current, intel: { ...current.intel, recommendations: reco.parsed } };
    upsertCase(current);
  }

  const summary = await call('case-summary', caseTaskInput(current));
  if (summary?.parsed) {
    current = { ...current, intel: { ...current.intel, summary: summary.parsed } };
  }

  current = {
    ...current,
    timeline: [...current.timeline, { at: new Date().toISOString(), label: 'خلص كل شي تلقائيًا', tone: 'good' }],
  };
  upsertCase(current);
  push(ev('done', 'خلصنا — راجع النتيجة وقدّم الاستئناف بنفسك', 'ok'));

  return { record: current, events, ok: true };
}

/** Suggests the Google category from the business name (simple, offline). */
export function suggestCategory(name: string): string {
  const n = name.toLowerCase();
  const rules: [RegExp, string][] = [
    [/مطعم|مندي|مشويات|برجر|فطائر|مأكولات/, 'مطعم'],
    [/مقهى|كافيه|قهوة|بن/, 'مقهى'],
    [/صالون|تجميل|حلاق|باربر|مشغل/, 'صالون تجميل'],
    [/عيادة|أسنان|دنتال|طبي|مركز صحي/, 'عيادة'],
    [/صيدلية|فارمسي/, 'صيدلية'],
    [/بقالة|سوبرماركت|تموينات/, 'بقالة'],
    [/ملابس|بوتيك|أزياء|عبايات/, 'متجر ملابس'],
    [/ورشة|سيارات|صيانة/, 'ورشة صيانة سيارات'],
    [/مخبز|معجنات|حلويات/, 'مخبز وحلويات'],
    [/حضانة|روضة|أطفال/, 'حضانة أطفال'],
    [/استوديو|تصوير/, 'استوديو تصوير'],
    [/نقل|شحن|توصيل/, 'خدمة نقل'],
    [/عقار|عقاري|وساطة/, 'وساطة عقارية'],
    [/جيم|نادي|لياقة/, 'نادي رياضي'],
  ];
  for (const [re, value] of rules) if (re.test(n)) return value;
  return '';
}

/** Guesses the evidence type from a filename so documents link themselves. */
export function guessDocCategory(filename: string): 'commercial_reg' | 'utility' | 'license' | 'lease' | 'storefront' | 'signage' | 'email' | 'screenshot' | 'other' {
  const n = filename.toLowerCase();
  if (/سجل|cr|commercial/.test(n)) return 'commercial_reg';
  if (/رخص|license|بلدي/.test(n)) return 'license';
  if (/فاتور|كهرب|utility|bill|water/.test(n)) return 'utility';
  if (/ايجار|إيجار|عقد|lease/.test(n)) return 'lease';
  if (/لافت|sign|شعار/.test(n)) return 'signage';
  if (/واج|واجه|محل|store|front/.test(n)) return 'storefront';
  if (/ايميل|بريد|email|mail/.test(n)) return 'email';
  if (/لقط|screenshot|screen/.test(n)) return 'screenshot';
  return 'other';
}

/** Reads a Google suspension message and pulls out the useful signals. */
export function readSuspensionMessage(message: string): {
  severity: 'high' | 'medium' | 'low';
  flags: string[];
  hint: string;
  suggest: { isStorefront?: boolean; customersVisit?: boolean; hasSignage?: boolean };
} {
  const m = message.toLowerCase();
  const flags: string[] = [];
  const suggest: { isStorefront?: boolean; customersVisit?: boolean; hasSignage?: boolean } = {};
  let severity: 'high' | 'medium' | 'low' = 'medium';
  let hint = 'التعليق عام — نحتاج نشوف المستندات عشان نحدد السبب.';

  if (/address|عنوان|location/.test(m)) {
    flags.push('مشكلة عنوان');
    hint = 'الرسالة تشير للعنوان: طابق العنوان مع السجل التجاري حرفيًا قبل أي استئناف.';
    severity = 'high';
  }
  if (/name|اسم/.test(m)) {
    flags.push('مشكلة اسم');
    hint = 'الرسالة تشير للاسم: احذف أي كلمات تسويقية وخله مطابق للسجل.';
    severity = 'high';
  }
  if (/quality|جودة/.test(m)) {
    flags.push('مشكلة جودة');
    hint = 'كلمة "quality" غالبًا تعني بيانات ناقصة أو غير دقيقة — راجع كل الحقول.';
  }
  if (/verif|تحقق|verification/.test(m)) {
    flags.push('تحقق مطلوب');
    hint = 'قوقل تبي تتحقق من النشاط: جهّز السجل والرخصة وصور الواجهة.';
  }
  if (/misrepresent|تضليل|impersonat/.test(m)) {
    flags.push('تضليل');
    hint = 'التضليل أخطر نوع؛ لا تقدّم استئناف قبل تصحيح الاسم والعنوان والفئة.';
    severity = 'high';
  }
  if (/duplicate|مكرر/.test(m)) {
    flags.push('ملف مكرر');
    hint = 'فيه ملف ثاني لنفس النشاط — لازم تحدد الملف الصح وتحذف الباقي.';
  }
  if (/service area|نطاق خدمة/.test(m)) {
    flags.push('نطاق خدمة');
    suggest.customersVisit = false;
  }
  return { severity, flags, hint, suggest };
}
