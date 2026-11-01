'use client';

import type { AiTaskId } from '../ai/tasks';
import type { RunTaskResponse } from '../ai/contracts';
import type { DiagnosisResult } from '../types';
import { uid } from '../utils';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Scenario = 'address' | 'name' | 'verify' | 'quality';

function facts(input: Record<string, unknown>) {
  return {
    name: String(input.businessName ?? 'النشاط'),
    city: String(input.city ?? 'الرياض'),
    category: String(input.category ?? 'نشاط تجاري'),
    message: String(input.suspensionMessage ?? ''),
    profileId: String(input.gbpProfileId ?? ''),
  };
}

function pickScenario(input: Record<string, unknown>): Scenario {
  const m = String(input.suspensionMessage ?? '').toLowerCase();
  if (/address|عنوان/.test(m)) return 'address';
  if (/misrepresent|name|اسم|تضليل/.test(m)) return 'name';
  if (/verif|تحقق/.test(m)) return 'verify';
  return 'quality';
}

function diagnosis(scenario: Scenario, f: ReturnType<typeof facts>): DiagnosisResult {
  if (scenario === 'name') {
    return {
      rootCause: {
        label: 'الاسم فيه كلمات مو موجودة في السجل التجاري',
        confidence: 81,
        evidence: ['اسم الملف فيه إضافة تسويقية', 'الفواتير تستخدم الاسم المختصر', 'اللافتة تحمل الاسم الرسمي'],
        sourcePolicy: 'Business Profile — Name policy',
      },
      policyViolations: [{ policy: 'دقة الاسم', riskLevel: 'high', explanation: 'الاسم لازم يكون الاسم الحقيقي بدون كلمات مفتاحية أو أسماء مدن.' }],
      missingDocuments: ['السجل التجاري', 'فاتورة رسمية باسم النشاط'],
      evidenceGaps: ['ما فيه إثبات لاستخدام الاسم الرسمي'],
      recommendedCorrection: 'احذف الإضافات من الاسم وخله مطابق للسجل حرفيًا، وبعدها قدّم الاستئناف.',
      riskLevel: 'high',
      confidence: 81,
      recoveryPlan: [
        { step: 1, title: 'عدّل الاسم', detail: 'خله مطابق للسجل بدون إضافات.', owner: 'agency' },
        { step: 2, title: 'جهّز إثبات', detail: 'فاتورة أو عقد بالاسم الرسمي.', owner: 'owner' },
        { step: 3, title: 'قدّم الاستئناف', detail: 'مع توضيح التصحيح.', owner: 'agency' },
      ],
      appealDraft: {
        ar: `نطلب مراجعة تعليق ملف «${f.name}». عدّلنا الاسم ليطابق السجل التجاري حرفيًا وحذفنا أي إضافات، والمستندات مرفقة.`,
        en: `We request a review of "${f.name}". We updated the name to match our commercial registration exactly and removed all additions.`,
      },
      summary: 'الاسم هو السبب. تعديله شرط قبل أي استئناف.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
    };
  }

  if (scenario === 'verify') {
    return {
      rootCause: {
        label: 'قوقل تبي تحقق من النشاط',
        confidence: 78,
        evidence: ['الرسالة تطلب تحقق', 'الملف جديد', 'ما فيه مستند مرفوع'],
        sourcePolicy: 'Business Profile — Verification',
      },
      policyViolations: [],
      missingDocuments: ['السجل التجاري', 'رخصة البلدية', 'صورة الواجهة'],
      evidenceGaps: ['ما فيه مستند رسمي مرفوع'],
      recommendedCorrection: 'ارفع السجل والرخصة وصور الواجهة، واطلب التحقق من داخل الملف.',
      riskLevel: 'medium',
      confidence: 78,
      recoveryPlan: [
        { step: 1, title: 'ارفع المستندات', detail: 'سجل + رخصة + واجهة.', owner: 'owner' },
        { step: 2, title: 'اطلب التحقق', detail: 'من داخل الملف.', owner: 'agency' },
        { step: 3, title: 'انتظر', detail: 'من ٣ إلى ٧ أيام عمل.', owner: 'google' },
      ],
      appealDraft: {
        ar: `بخصوص ملف «${f.name}» في ${f.city}، أرفقنا السجل والرخصة وصور الواجهة لإكمال التحقق.`,
        en: `Regarding "${f.name}" in ${f.city}, we attached the CR, license and storefront photos to complete verification.`,
      },
      summary: 'الموضوع تحقق مو تعليق — المستندات هي المفتاح.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
    };
  }

  if (scenario === 'quality') {
    return {
      rootCause: {
        label: 'بيانات الملف ناقصة أو غير متسقة',
        confidence: 63,
        evidence: ['رسالة التعليق عامة', 'ما فيه صور حديثة', 'الوصف غير مطابق للموقع'],
        sourcePolicy: 'Business Profile — Content & Representation',
      },
      policyViolations: [{ policy: 'اكتمال البيانات', riskLevel: 'medium', explanation: 'الملف يحتاج بيانات مكتملة ومتسقة مع بقية الحضور الرقمي.' }],
      missingDocuments: ['صور الواجهة واللافتة', 'فاتورة مرافق حديثة'],
      evidenceGaps: ['ما فيه دليل مصوّر حديث'],
      recommendedCorrection: 'أكمل الوصف والساعات والصور، ووحّدها مع الموقع، وأضف فاتورة حديثة.',
      riskLevel: 'medium',
      confidence: 63,
      recoveryPlan: [
        { step: 1, title: 'أكمل البيانات', detail: 'وصف + ساعات + خدمات + صور.', owner: 'agency' },
        { step: 2, title: 'وحّد المعلومات', detail: 'نفس المعلومة في كل مكان.', owner: 'agency' },
        { step: 3, title: 'قدّم الاستئناف', detail: 'مع المستندات الجديدة.', owner: 'agency' },
      ],
      appealDraft: {
        ar: `نطلب إعادة النظر في تعليق «${f.name}». أكملنا البيانات وحدّثنا الصور ووحّدنا المعلومات مع الموقع.`,
        en: `We request a review of "${f.name}". We completed the profile data, updated photos and aligned the information with our website.`,
      },
      summary: 'الرسالة عامة، فالمطلوب إكمال البيانات وإثبات النشاط بالصور.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
    };
  }

  return {
    rootCause: {
      label: 'العنوان ما يطابق السجل التجاري (رقم الوحدة ناقص)',
      confidence: 86,
      evidence: ['السجل فيه «وحدة ٤» والملف فيه رقم المبنى فقط', 'فاتورة الكهرباء باسم المالك السابق', 'ما فيه صورة لافتة دائمة'],
      sourcePolicy: 'Business Profile — Address & Representation',
    },
    policyViolations: [
      { policy: 'دقة العنوان', riskLevel: 'high', explanation: 'قوقل تقارن العنوان حرفيًا مع المستند؛ أي فرق في رقم الوحدة يوقف المراجعة.' },
      { policy: 'اشتراط وجود واجهة', riskLevel: 'medium', explanation: 'النشاط يستقبل عملاء، فلازم لافتة وواجهة موثّقة.' },
    ],
    missingDocuments: ['سجل تجاري فيه رقم الوحدة', 'عقد إيجار ساري', 'صور واضحة للواجهة واللافتة'],
    evidenceGaps: ['ما فيه دليل مصوّر للافتة'],
    recommendedCorrection: 'عدّل العنوان ليطابق السجل حرفيًا (المبنى، الشارع، الوحدة)، وصوّر اللافتة والواجهة قبل التقديم.',
    riskLevel: 'high',
    confidence: 86,
    recoveryPlan: [
      { step: 1, title: 'صحّح العنوان', detail: 'خله مطابق للسجل بالكامل مع رقم الوحدة.', owner: 'agency' },
      { step: 2, title: 'وثّق الواجهة', detail: '٣ صور للافتة والواجهة + مقطع قصير.', owner: 'owner' },
      { step: 3, title: 'قدّم الاستئناف', detail: 'من أداة الاستئناف الرسمية.', owner: 'agency' },
      { step: 4, title: 'تابع كل ٣ أيام', detail: 'لا ترسل ثاني قبل الرد.', owner: 'agency' },
    ],
    appealDraft: {
      ar: `السلام عليكم، نطلب إعادة النظر في تعليق نشاطنا. صحّحنا العنوان ليطابق السجل التجاري بالكامل (رقم المبنى والوحدة)، وأرفقنا السجل وعقد الإيجار وصور حديثة للواجهة واللافتة.`,
      en: `Hello, we kindly request a review of our suspension. We corrected the address to match our commercial registration (building and unit number) and attached the CR, lease and recent storefront photos.`,
    },
    summary: 'المشكلة الأساسية في العنوان. صحّحه ووثّق الواجهة، وبعدها فرصة الاستئناف عالية.',
    disclaimer: 'تحليل استشاري، والقرار لقوقل.',
  };
}

export async function simulateTask(opts: {
  taskId: AiTaskId;
  input: Record<string, unknown>;
  caseCode?: string;
}): Promise<RunTaskResponse> {
  const f = facts(opts.input);
  const scenario = pickScenario(opts.input);
  const started = Date.now();
  await wait(800 + Math.random() * 900);

  let parsed: unknown = null;
  let content = '';

  switch (opts.taskId) {
    case 'gbp-diagnosis':
    case 'suspension-investigation':
      parsed = diagnosis(scenario, f);
      break;
    case 'policy-analysis':
      parsed = {
        policyAnalysis: [
          { policy: 'Representation', status: 'review', note: 'الاسم والعنوان لازم يطابقان المستندات.' },
          { policy: 'Eligibility', status: 'ok', note: 'النشاط يستقبل عملاء في موقع ثابت.' },
          { policy: 'Content', status: 'review', note: 'يحتاج صور حديثة ووصف مطابق.' },
        ],
        verdict: 'fix_required',
        summary: 'أهم بندين: تطابق العنوان، واكتمال المحتوى.',
      };
      break;
    case 'evidence-comparison':
      parsed = {
        comparisons: [
          { field: 'name', profileValue: f.name, documentValue: f.name, status: 'match', impact: 'low', fix: 'ما يحتاج تعديل' },
          { field: 'address', profileValue: 'العنوان بدون رقم الوحدة', documentValue: 'العنوان كامل مع الوحدة', status: 'mismatch', impact: 'high', fix: 'أضف رقم الوحدة' },
          { field: 'phone', profileValue: 'مطابق', documentValue: 'مطابق', status: 'match', impact: 'low', fix: 'تمام' },
        ],
        conflictsCount: 1,
        criticalConflicts: ['رقم الوحدة ناقص'],
        verdict: 'fix_required',
        summary: 'تعارض واحد فقط في العنوان.',
      };
      break;
    case 'appeal-generation':
      parsed = {
        appeal: {
          ar: `السلام عليكم،\n\nبخصوص ملف النشاط «${f.name}» في ${f.city}.\n\nصحّحنا بيانات الملف لتطابق السجل التجاري، وأرفقنا السجل والرخصة وصور الواجهة.\n\nنرجو إعادة النظر في استعادة الملف.\n\nشاكرين لكم.`,
          en: `Hello,\n\nRegarding "${f.name}" in ${f.city}.\n\nWe corrected the profile data to match our commercial registration and attached the CR, license and storefront photos.\n\nWe kindly request reinstatement.\n\nThank you.`,
        },
        attachmentsList: ['السجل التجاري', 'الرخصة', 'عقد الإيجار', 'صور الواجهة'],
        riskNotes: ['لا ترسل ثاني قبل الرد', 'تأكد من تطابق الاسم والعنوان'],
        followUpPlan: ['متابعة بعد ٤٨ ساعة', 'إعادة المحاولة بعد ٧ أيام'],
        submissionNotes: ['أداة الاستئناف الرسمية', '٤ مرفقات كحد أقصى أو ZIP'],
        disclaimer: 'تحليل استشاري، والقرار لقوقل.',
      };
      break;
    case 'recovery-recommendations':
      parsed = {
        recommendations: [
          { priority: 1, title: 'صحّح العنوان', why: 'سبب التعليق الأقرب', how: 'عدّل الحقل من Business Profile Manager', effort: 'low', impact: 'high', timeframe: '24h' },
          { priority: 2, title: 'وثّق الواجهة', why: 'تثبت وجود النشاط', how: '٣ صور + مقطع قصير', effort: 'low', impact: 'medium', timeframe: '3d' },
          { priority: 3, title: 'لا تستعجل الاستئناف', why: 'التكرار يضر', how: 'انتظر ٧ أيام بعد الرفض', effort: 'low', impact: 'medium', timeframe: '1w' },
        ],
        doNotDo: ['لا تنشئ ملف جديد', 'لا تغيّر الفئة أكثر من مرة'],
        expectedOutcome: 'فرصة استرداد جيدة بعد التصحيح.',
        summary: 'الصح ثم الاستئناف.',
      };
      break;
    case 'case-summary':
      parsed = {
        headline: `${f.name} — تعليق قابل للمعالجة`,
        statusNarrative: 'الملف معلّق بسبب تعارض في البيانات، والتصحيح مسار واضح.',
        keyRisks: ['تعارض العنوان', 'نقص صور الواجهة'],
        nextAction: { owner: 'agency', action: 'تصحيح البيانات ثم تقديم الاستئناف', dueInDays: 2 },
        openQuestions: ['هل عند العميل صور حديثة؟'],
        confidence: 80,
      };
      break;
    case 'document-analysis':
      parsed = {
        documents: [
          { name: 'السجل التجاري', type: 'commercial_reg', issuer: 'وزارة التجارة', businessNameMatch: 'match', addressMatch: 'match', validity: 'valid', quality: 'high', notes: 'الاسم والعنوان مطابقان.' },
          { name: 'صورة الواجهة', type: 'storefront', issuer: null, businessNameMatch: 'match', addressMatch: 'unclear', validity: 'valid', quality: 'medium', notes: 'تحتاج صورة أوضح للافتة.' },
        ],
        coverage: { confirmsBusinessName: true, confirmsAddress: true, confirmsOperation: true, confirmsStorefront: false },
        missingDocuments: ['صورة لافتة أوضح'],
        risks: ['جودة صورة الواجهة متوسطة'],
        verdict: 'partially_sufficient',
        summary: 'المستندات كافية مبدئيًا، ينقص توضيح اللافتة.',
      };
      break;
    case 'ocr-interpretation':
      parsed = {
        documentType: 'commercial_reg',
        language: 'ar',
        confidence: 94,
        fields: { businessName: f.name, registrationNumber: '1010XXXXXX', issueDate: '2023-04-12', expiryDate: '2027-04-11', address: f.city, issuer: 'وزارة التجارة' },
        correctedText: `${f.name} — سجل تجاري ساري`,
        unreadableSegments: [],
        notes: 'استخراج واضح.',
      };
      break;
    case 'bilingual-writing':
      parsed = { ar: `نص عربي محسّن لـ ${f.name}.`, en: `Improved English copy for ${f.name}.`, tone: 'formal', wordCount: { ar: 6, en: 6 }, notes: 'نبرة مهنية.' };
      break;
    case 'customer-report':
      content = `## تقرير حالة — ${f.name}\n\n**الوضع الحالي:** الملف معلّق في ${f.city}.\n\n**اللي نعرفه:** ${diagnosis(scenario, f).rootCause.label}.\n\n**الخطوة الجاية:** تصحيح البيانات ثم تقديم الاستئناف من حسابك.\n\n**المدة المتوقعة:** من ٣ إلى ١٤ يوم عمل بعد التقديم.\n\n_القرار بيد قوقل._`;
      break;
    default:
      content = `تم تنفيذ المهمة على «${f.name}».`;
  }

  const promptTokens = 1500 + Math.round(JSON.stringify(opts.input).length / 3);
  const completionTokens = content ? 320 : 780;

  return {
    ok: true,
    taskId: opts.taskId,
    model: 'google/gemini-3.8-flash',
    requestedModel: 'google/gemini-3.8-flash',
    fallbackUsed: false,
    content: content || JSON.stringify(parsed, null, 2),
    parsed,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costUsd: Number(((promptTokens / 1e6) * 0.825 + (completionTokens / 1e6) * 4.125).toFixed(6)),
    },
    latencyMs: Date.now() - started,
    logId: uid('sim'),
    warnings: [],
  };
}

export async function simulateConnection() {
  await wait(650);
  return {
    ok: true,
    steps: [
      { name: 'المصادقة على المفتاح', ok: true, detail: 'مفتاح العرض التجريبي', ms: 210 },
      { name: 'النموذج متاح', ok: true, detail: 'google/gemini-3.8-flash', ms: 0 },
      { name: 'طلب تجريبي', ok: true, detail: 'تم بنجاح', ms: 430 },
    ],
    latencyMs: 640,
    key: { label: 'demo', usage: 3.42, limit: 50, isFreeTier: false },
    model: 'google/gemini-3.8-flash',
    sample: 'ok',
    usage: { promptTokens: 8, completionTokens: 1, totalTokens: 9, costUsd: 0.00001 },
  };
}
