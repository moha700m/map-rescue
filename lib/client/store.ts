'use client';

import { useEffect, useState } from 'react';
import type { CaseRecord, DiagnosisResult, EvidenceDoc } from '../types';
import type { UsageEntry } from '../ai/contracts';
import { uid } from '../utils';

const CASES_KEY = 'mra.cases.v2';
const USAGE_KEY = 'mra.usage.v2';
const SEEDED_KEY = 'mra.seeded.v2';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_DATA === '1';

const EVENT = 'mra:store';

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

/* ------------------------------------------------------------------ */
/* Usage log                                                           */
/* ------------------------------------------------------------------ */

export function getUsageRows(): UsageEntry[] {
  return read<UsageEntry[]>(USAGE_KEY, []);
}

export function pushUsage(entry: UsageEntry) {
  const rows = getUsageRows();
  rows.unshift(entry);
  write(USAGE_KEY, rows.slice(0, 400));
  emit();
}

export function clearUsage() {
  write(USAGE_KEY, []);
  emit();
}

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

export function getCases(): CaseRecord[] {
  return read<CaseRecord[]>(CASES_KEY, []);
}

export function setCases(cases: CaseRecord[]) {
  write(CASES_KEY, cases);
  emit();
}

export function upsertCase(record: CaseRecord) {
  const cases = getCases();
  const idx = cases.findIndex((c) => c.id === record.id);
  const next = { ...record, updatedAt: new Date().toISOString() };
  if (idx >= 0) cases[idx] = next;
  else cases.unshift(next);
  write(CASES_KEY, cases);
  emit();
  return next;
}

export function deleteCase(id: string) {
  setCases(getCases().filter((c) => c.id !== id));
}

export function nextCaseCode() {
  const year = new Date().getFullYear();
  const count = getCases().length + 1;
  return `MRA-${year}-${String(count).padStart(4, '0')}`;
}

export function newCaseDraft(): CaseRecord {
  const now = new Date().toISOString();
  return {
    id: uid('case'),
    code: nextCaseCode(),
    createdAt: now,
    updatedAt: now,
    customerName: '',
    customerPhone: '',
    businessName: '',
    category: '',
    city: '',
    country: 'SA',
    address: '',
    status: 'new',
    isStorefront: true,
    customersVisit: true,
    hasSignage: false,
    documents: [],
    timeline: [{ at: now, label: 'تم إنشاء القضية', tone: 'neutral' }],
  };
}

export function makeDoc(partial: Partial<EvidenceDoc> & { name: string; mimeType: string }): EvidenceDoc {
  return {
    id: uid('doc'),
    size: 0,
    category: 'other',
    addedAt: new Date().toISOString(),
    status: 'pending',
    ...partial,
  } as EvidenceDoc;
}

/* ------------------------------------------------------------------ */
/* React bindings                                                      */
/* ------------------------------------------------------------------ */

function useStoreValue<T>(selector: () => T, deps: unknown[] = []): T {
  const [value, setValue] = useState<T>(selector);

  useEffect(() => {
    const update = () => setValue(selector());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

export function useCases() {
  return useStoreValue<CaseRecord[]>(getCases, []);
}

export function useUsageRows() {
  return useStoreValue<UsageEntry[]>(getUsageRows, []);
}

/* ------------------------------------------------------------------ */
/* Demo seed (used by the static preview build)                         */
/* ------------------------------------------------------------------ */

const iso = (daysAgo: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.toISOString();
};

function demoDiagnosis(kind: 'address' | 'name' | 'category' | 'operation'): DiagnosisResult {
  const map: Record<string, DiagnosisResult> = {
    address: {
      rootCause: {
        label: 'عنوان غير مطابق للمستند الرسمي (Address mismatch)',
        confidence: 78,
        evidence: [
          'سجل تجاري يذكر رقم وحدة مختلفًا عن العنوان في الملف',
          'فاتورة كهرباء باسم المالك القديم',
          'لا يوجد لافتة دائمة في الموقع',
        ],
        sourcePolicy: 'Business Profile — Address & Representation policies',
      },
      policyViolations: [
        { policy: 'Address accuracy', riskLevel: 'high', explanation: 'العنوان يجب أن يطابق المستند الرسمي بالكامل مع رقم الوحدة.' },
        { policy: 'Storefront requirement', riskLevel: 'medium', explanation: 'النشاط يستقبل عملاء لكن لا توجد لافتة دائمة.' },
      ],
      missingDocuments: ['سجل تجاري محدّث برقم الوحدة الصحيح', 'عقد إيجار ساري', 'صورة واضحة للواجهة واللافتة'],
      evidenceGaps: ['لا يوجد دليل مصوّر على وجود لافتة', 'تاريخ بداية النشاط غير موثّق'],
      recommendedCorrection:
        'تحديث العنوان ليحاكي السجل التجاري حرفيًا (رقم المبنى، الشارع، الوحدة)، ثم تصوير اللافتة والواجهة مع موقع GPS قبل الاستئناف.',
      riskLevel: 'high',
      confidence: 76,
      recoveryPlan: [
        { step: 1, title: 'تصحيح العنوان', detail: 'تعديل حقل العنوان ليطابق السجل التجاري بالكامل خلال 24 ساعة.', owner: 'agency' },
        { step: 2, title: 'توثيق الواجهة', detail: 'صور + فيديو قصير للافتة والواجهة مع إظهار الشارع.', owner: 'owner' },
        { step: 3, title: 'تقديم الاستئناف', detail: 'استئناف من صفحة Reinstatement الرسمية مع المستندات.', owner: 'agency' },
        { step: 4, title: 'متابعة', detail: 'مراجعة الحالة كل 72 ساعة حتى القرار.', owner: 'agency' },
      ],
      appealDraft: {
        ar: 'نود إعادة النظر في تعليق ملف نشاطنا. قمنا بتصحيح حقل العنوان ليطابق السجل التجاري رقم الوحدة، وأرفقنا السجل التجاري وعقد الإيجار وصورًا حديثة للواجهة واللافتة.',
        en: 'We respectfully request a review of the suspension. We corrected the address field to match our commercial registration (unit number) and attached the CR, lease, and recent photos of the storefront and signage.',
      },
      summary: 'التعارض في العنوان هو السبب الأرجح؛ التصحيح + توثيق الواجهة يرفع فرص القبول بشكل ملموس.',
      disclaimer: 'تحليل استشاري وليس قرارًا من Google.',
    },
    name: {
      rootCause: {
        label: 'اسم الملف لا يطابق الاسم الرسمي (Name mismatch)',
        confidence: 71,
        evidence: ['الاسم في الملف يحتوي إضافة تسويقية غير موجودة في السجل التجاري'],
        sourcePolicy: 'Business Profile — Name policy',
      },
      policyViolations: [
        { policy: 'Name accuracy', riskLevel: 'high', explanation: 'الاسم يجب أن يعكس الاسم الحقيقي للنشاط دون كلمات مفتاحية.' },
      ],
      missingDocuments: ['سجل تجاري', 'شعار النشاط (اختياري)'],
      evidenceGaps: ['لا يوجد إثبات لاستخدام الاسم التجاري في الفواتير'],
      recommendedCorrection: 'إزالة الكلمات التسويقية من الاسم وجعله مطابقًا للسجل التجاري قبل الاستئناف.',
      riskLevel: 'high',
      confidence: 71,
      recoveryPlan: [
        { step: 1, title: 'تعديل الاسم', detail: 'مطابقة الاسم مع السجل التجاري حرفيًا.', owner: 'agency' },
        { step: 2, title: 'تجميع الأدلة', detail: 'فواتير ومراسلات تُظهر الاسم الرسمي.', owner: 'owner' },
      ],
      summary: 'الاسم التسويقي في الملف يخالف سياسة الاسم؛ التصحيح شرط أساسي للاستئناف.',
      disclaimer: 'تحليل استشاري وليس قرارًا من Google.',
    },
    category: {
      rootCause: {
        label: 'فئة النشاط غير دقيقة (Category mismatch)',
        confidence: 64,
        evidence: ['الفئة الحالية أوسع من النشاط الفعلي', 'الموقع الإلكتروني يصف خدمة مختلفة'],
        sourcePolicy: 'Business Profile — Category guidelines',
      },
      policyViolations: [
        { policy: 'Category accuracy', riskLevel: 'medium', explanation: 'يجب اختيار الفئة الأدق التي تصف النشاط الأساسي.' },
      ],
      missingDocuments: ['رخصة النشاط', 'قائمة الخدمات'],
      evidenceGaps: ['لا يوجد وصف خدمة موحّد بين الموقع والملف'],
      recommendedCorrection: 'تضييق الفئة إلى الفئة الأساسية الأدق وتوحيد الوصف بين الموقع والملف.',
      riskLevel: 'medium',
      confidence: 64,
      recoveryPlan: [
        { step: 1, title: 'تصحيح الفئة', detail: 'اختيار فئة أساسية واحدة دقيقة.', owner: 'agency' },
        { step: 2, title: 'توحيد الوصف', detail: 'مطابقة الوصف بين الموقع والملف.', owner: 'agency' },
      ],
      summary: 'مشكلة فئة متوسطة الخطورة، قابلة للحل دون استئناف في بعض الحالات.',
      disclaimer: 'تحليل استشاري وليس قرارًا من Google.',
    },
    operation: {
      rootCause: {
        label: 'insufficient_evidence — نشاط لا يستقبل عملاء (Service area vs Storefront)',
        confidence: 42,
        evidence: ['الملف مضبوط كموقع خدمة لكن الفئة تتطلب واجهة', 'لا توجد صور للواجهة'],
      },
      policyViolations: [
        { policy: 'Eligibility — service area business', riskLevel: 'medium', explanation: 'الأنشطة الخدمية لا تعرض عنوانًا عامًا.' },
      ],
      missingDocuments: ['إثبات نطاق الخدمة', 'مستند يوضح نموذج العمل'],
      evidenceGaps: ['لا يوجد دليل يحدد ما إذا كان النشاط يستقبل عملاء في الموقع'],
      recommendedCorrection: 'تحديد نموذج العمل بدقة: إن كان النشاط خدميًا فحوّله إلى Service Area Business وأخفِ العنوان.',
      riskLevel: 'medium',
      confidence: 42,
      recoveryPlan: [
        { step: 1, title: 'تحديد النموذج', detail: 'استبيان مع المالك: هل يستقبل عملاء؟', owner: 'agency' },
        { step: 2, title: 'تصحيح النوع', detail: 'ضبط الملف حسب النموذج الفعلي.', owner: 'agency' },
      ],
      summary: 'الأدلة غير كافية لتحديد السبب؛ مطلوب تأكيد نموذج العمل من المالك أولًا.',
      disclaimer: 'تحليل استشاري وليس قرارًا من Google.',
    },
  };
  return map[kind];
}

interface SeedSpec {
  customer: string;
  phone: string;
  business: string;
  category: string;
  city: string;
  country: string;
  address: string;
  status: CaseRecord['status'];
  days: number;
  risk: 'low' | 'medium' | 'high';
  diagnosis?: 'address' | 'name' | 'category' | 'operation';
  docs: number;
  fee: number;
  message: string;
}

const SEED_SPECS: SeedSpec[] = [
  { customer: 'سارة العتيبي', phone: '+966 55 214 8890', business: 'مطعم بيت المندي', category: 'مطعم يمني', city: 'الرياض', country: 'SA', address: 'حي النرجس، طريق أنس بن مالك، مبنى 4412', status: 'appeal_ready', days: 12, risk: 'high', diagnosis: 'address', docs: 4, fee: 1800, message: 'تم تعليق ملفك التجاري بسبب مشاكل في الجودة. راجع إرشادات التمثيل.' },
  { customer: 'خالد المنصوري', phone: '+971 50 338 1120', business: 'صالون لمسة أنيقة', category: 'صالون تجميل', city: 'دبي', country: 'AE', address: 'المرقبات، شارع 12، محل 6', status: 'submitted', days: 9, risk: 'medium', diagnosis: 'category', docs: 3, fee: 1500, message: 'Your listing has been suspended for policy violations.' },
  { customer: 'منى الحربي', phone: '+966 53 771 0042', business: 'عيادة دنتال كير', category: 'عيادة أسنان', city: 'جدة', country: 'SA', address: 'حي الشاطئ، شارع الأمير سلطان، برج الياقوت، الدور 3', status: 'pending_docs', days: 7, risk: 'medium', diagnosis: 'operation', docs: 2, fee: 2200, message: 'We could not verify your business information.' },
  { customer: 'أحمد فتحي', phone: '+20 100 442 8891', business: 'ورشة النور للسيارات', category: 'ورشة صيانة سيارات', city: 'القاهرة', country: 'EG', address: 'مدينة نصر، شارع عباس العقاد، 22', status: 'reinstated', days: 26, risk: 'low', diagnosis: 'address', docs: 5, fee: 1200, message: 'Your profile is suspended.' },
  { customer: 'نورة القحطاني', phone: '+966 56 902 3311', business: 'مقهى ركن القهوة', category: 'مقهى', city: 'الدمام', country: 'SA', address: 'حي الفيصلية، شارع الملك فهد، 118', status: 'diagnosis_ready', days: 3, risk: 'high', diagnosis: 'name', docs: 2, fee: 1600, message: 'Suspended due to quality issues.' },
  { customer: 'يوسف الشمري', phone: '+965 900 44213', business: 'صيدلية الحياة', category: 'صيدلية', city: 'حولي', country: 'KW', address: 'شارع تونس، مبنى 9', status: 'new', days: 1, risk: 'medium', docs: 0, fee: 1400, message: 'Your Business Profile has been suspended.' },
  { customer: 'ريم السالم', phone: '+966 50 118 7723', business: 'بوتيك ريم', category: 'متجر ملابس', city: 'الرياض', country: 'SA', address: 'حي الياسمين، شارع أنس، 33', status: 'rejected', days: 18, risk: 'high', diagnosis: 'name', docs: 4, fee: 1800, message: 'Appeal decision: not approved.' },
  { customer: 'عبدالله الزهراني', phone: '+966 57 220 9981', business: 'مخبز السنابل', category: 'مخبز', city: 'مكة', country: 'SA', address: 'حي العزيزية، شارع الحج، 71', status: 'appeal_ready', days: 6, risk: 'medium', diagnosis: 'address', docs: 3, fee: 1500, message: 'Suspended for misrepresentation.' },
  { customer: 'هند العبيد', phone: '+971 55 881 2200', business: 'مركز لمسات للعناية', category: 'مركز عناية بالبشرة', city: 'الشارقة', country: 'AE', address: 'ممزر، شارع الوحدة، 14', status: 'analyzing', days: 0, risk: 'medium', docs: 1, fee: 1700, message: 'Your profile is under review.' },
  { customer: 'ماجد الدوسري', phone: '+966 54 337 6654', business: 'شركة ركاز للنقل', category: 'خدمة نقل', city: 'الرياض', country: 'SA', address: 'المنطقة الصناعية، شارع 8', status: 'reinstated', days: 40, risk: 'low', diagnosis: 'operation', docs: 6, fee: 2000, message: 'Suspended.' },
  { customer: 'لمياء الحسن', phone: '+966 59 441 2201', business: 'حضانة براعم المستقبل', category: 'حضانة أطفال', city: 'جدة', country: 'SA', address: 'حي الروضة، شارع الأمل، 5', status: 'submitted', days: 11, risk: 'medium', diagnosis: 'category', docs: 4, fee: 1900, message: 'Verification required.' },
  { customer: 'فهد البقمي', phone: '+966 55 993 1177', business: 'استوديو عدسة', category: 'استوديو تصوير', city: 'الطائف', country: 'SA', address: 'حي الشهار، شارع الأمير، 27', status: 'new', days: 2, risk: 'low', docs: 0, fee: 1300, message: 'Suspended for policy reasons.' },
];

function buildDemoCases(): CaseRecord[] {
  return SEED_SPECS.map((spec, i) => {
    const direction = spec.diagnosis;
    const diagnosis = direction ? demoDiagnosis(direction) : undefined;
    const createdAt = iso(spec.days + 2, 9 + (i % 6));
    const timeline: CaseRecord['timeline'] = [
      { at: createdAt, label: 'تم إنشاء القضية', tone: 'neutral' },
      { at: iso(spec.days + 1, 12), label: 'رفع المستندات الأولية', tone: 'neutral' },
    ];
    if (diagnosis) timeline.push({ at: iso(spec.days, 14), label: 'اكتمل التشخيص بالذكاء الاصطناعي', tone: 'good' });
    if (['appeal_ready', 'submitted', 'reinstated', 'rejected'].includes(spec.status)) {
      timeline.push({ at: iso(Math.max(0, spec.days - 2), 11), label: 'تمت صياغة الاستئناف', tone: 'neutral' });
    }
    if (['submitted', 'reinstated', 'rejected'].includes(spec.status)) {
      timeline.push({ at: iso(Math.max(0, spec.days - 4), 16), label: 'تم تقديم الاستئناف يدويًا', tone: 'warn' });
    }
    if (spec.status === 'reinstated') timeline.push({ at: iso(Math.max(0, spec.days - 12), 10), label: 'تمت استعادة الملف', tone: 'good' });
    if (spec.status === 'rejected') timeline.push({ at: iso(Math.max(0, spec.days - 9), 10), label: 'رفض الاستئناف', tone: 'bad' });

    return {
      id: `case_demo_${i + 1}`,
      code: `MRA-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      createdAt,
      updatedAt: iso(Math.max(0, spec.days - 1), 15),
      customerName: spec.customer,
      customerPhone: spec.phone,
      businessName: spec.business,
      category: spec.category,
      city: spec.city,
      country: spec.country,
      address: spec.address,
      website: `https://${spec.business.replace(/\s+/g, '-').slice(0, 14)}.example`,
      phone: spec.phone,
      status: spec.status,
      riskLevel: diagnosis?.riskLevel ?? spec.risk,
      confidence: diagnosis?.confidence,
      suspensionDate: iso(spec.days + 3, 8),
      suspensionMessage: spec.message,
      previousAppeals: spec.status === 'rejected' ? 'استئناف واحد مرفوض' : 'لا يوجد',
      isStorefront: true,
      customersVisit: true,
      hasSignage: diagnosis?.rootCause.label.includes('Storefront') ? false : true,
      diagnosis,
      appealAr: diagnosis?.appealDraft?.ar,
      appealEn: diagnosis?.appealDraft?.en,
      documents: Array.from({ length: spec.docs }).map((_, d) => ({
        id: `doc_${i}_${d}`,
        name: ['سجل-تجاري.pdf', 'صورة-الواجهة.jpg', 'فاتورة-كهرباء.pdf', 'لافتة.jpg', 'عقد-إيجار.pdf', 'رخصة-بلدية.pdf'][d % 6],
        mimeType: d % 2 === 1 ? 'image/jpeg' : 'application/pdf',
        size: 180_000 + d * 94_000,
        category: (['commercial_reg', 'storefront', 'utility', 'signage', 'other', 'license'] as const)[d % 6],
        addedAt: iso(spec.days + 1, 13),
        status: 'parsed' as const,
      })),
      timeline,
      fee: spec.fee,
    };
  });
}

function buildDemoUsage(): UsageEntry[] {
  const models = [
    { id: 'google/gemini-3.8-flash', costIn: 0.825, costOut: 4.125 },
    { id: 'openai/gpt-6.1-sol', costIn: 2, costOut: 10 },
    { id: 'anthropic/claude-sonnet-5', costIn: 2, costOut: 10 },
    { id: 'google/gemini-3.5-flash-lite', costIn: 0.3, costOut: 2.5 },
  ];
  const tasks = ['gbp-diagnosis', 'appeal-generation', 'document-analysis', 'case-summary', 'customer-report', 'policy-analysis'] as const;
  const rows: UsageEntry[] = [];
  for (let d = 13; d >= 0; d -= 1) {
    const count = 4 + Math.round(6 * Math.abs(Math.sin(d / 2.3)));
    for (let k = 0; k < count; k += 1) {
      const model = models[(d + k) % models.length];
      const task = tasks[(d * 3 + k) % tasks.length];
      const promptTokens = 1400 + ((d * 137 + k * 311) % 5200);
      const completionTokens = 400 + ((d * 91 + k * 173) % 2400);
      const failed = (d * 7 + k) % 29 === 0;
      rows.push({
        id: `seed_${d}_${k}`,
        at: iso(d, 8 + (k % 10)),
        task,
        model: model.id,
        requestedModel: model.id,
        fallbackUsed: !failed && k % 11 === 0,
        promptTokens: failed ? 0 : promptTokens,
        completionTokens: failed ? 0 : completionTokens,
        totalTokens: failed ? 0 : promptTokens + completionTokens,
        costUsd: failed ? 0 : Number(((promptTokens / 1e6) * model.costIn + (completionTokens / 1e6) * model.costOut).toFixed(6)),
        latencyMs: failed ? 1200 + ((d + k) % 900) : 1400 + ((d * 53 + k * 211) % 4200),
        status: failed ? 'error' : 'ok',
        httpStatus: failed ? 429 : undefined,
        errorCode: failed ? 'rate_limited' : undefined,
        errorMessage: failed ? 'Provider rate limited the request (429).' : undefined,
        source: 'server',
      });
    }
  }
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
}

let seedPromise: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!DEMO_MODE) return Promise.resolve();
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      if (window.localStorage.getItem(SEEDED_KEY) === '1') return;
      if (!getCases().length) write(CASES_KEY, buildDemoCases());
      if (!getUsageRows().length) write(USAGE_KEY, buildDemoUsage());
      window.localStorage.setItem(SEEDED_KEY, '1');
      emit();
    } catch {
      /* ignore */
    }
  })();
  return seedPromise;
}

export function resetDemo() {
  write(CASES_KEY, buildDemoCases());
  write(USAGE_KEY, buildDemoUsage());
  if (typeof window !== 'undefined') window.localStorage.setItem(SEEDED_KEY, '1');
  emit();
}

export function clearWorkspace() {
  write(CASES_KEY, []);
  write(USAGE_KEY, []);
  if (typeof window !== 'undefined') window.localStorage.setItem(SEEDED_KEY, '1');
  emit();
}
