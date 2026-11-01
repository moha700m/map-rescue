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

/**
 * Reads from localStorage after mount only. The first client render must match
 * the server-rendered HTML (which has no stored data) to avoid hydration errors.
 */
function useStoreValue<T>(selector: () => T, empty: T): T {
  const [value, setValue] = useState<T>(empty);

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
  }, []);

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

function demoDiagnosis(kind: 'address' | 'name' | 'category' | 'operation' | 'verify'): DiagnosisResult {
  const map: Record<string, DiagnosisResult> = {
    address: {
      rootCause: {
        label: 'العنوان في الملف ما يطابق السجل التجاري',
        confidence: 82,
        evidence: [
          'السجل التجاري مكتوب فيه «وحدة 4» والملف فيه رقم المبنى بس',
          'فاتورة الكهرباء باسم المالك الأول، مو الاسم الحالي',
          'ما فيه صورة للافتة الدائمة على الواجهة',
        ],
        sourcePolicy: 'Business Profile — Address & Representation',
      },
      policyViolations: [
        { policy: 'دقة العنوان', riskLevel: 'high', explanation: 'قوقل تقارن العنوان حرفيًا مع المستند الرسمي، وأي فرق في رقم الوحدة يوقف المراجعة.' },
        { policy: 'اشتراط وجود واجهة', riskLevel: 'medium', explanation: 'النشاط يستقبل عملاء، فلازم تكون فيه لافتة وواجهة موثّقة.' },
      ],
      missingDocuments: ['سجل تجاري فيه رقم الوحدة', 'عقد إيجار ساري', 'صور واضحة للواجهة واللافتة'],
      evidenceGaps: ['ما فيه دليل مصوّر للافتة', 'تاريخ بداية النشاط غير موثّق'],
      recommendedCorrection:
        'عدّل العنوان بحيث يطابق السجل التجاري حرفيًا (المبنى، الشارع، الوحدة)، وبعدها صوّر اللافتة والواجهة مع الشارع قبل ما تقدّم الاستئناف.',
      riskLevel: 'high',
      confidence: 82,
      recoveryPlan: [
        { step: 1, title: 'صحّح العنوان', detail: 'خله مطابق للسجل التجاري بالكامل، بما فيه رقم الوحدة.', owner: 'agency' },
        { step: 2, title: 'صوّر الواجهة', detail: 'صور + مقطع قصير للافتة والشارع ورقم المبنى.', owner: 'owner' },
        { step: 3, title: 'قدّم الاستئناف', detail: 'من صفحة Reinstatement الرسمية مع المستندات.', owner: 'agency' },
        { step: 4, title: 'تابع كل 3 أيام', detail: 'لا ترسل استئناف ثاني قبل ما يردون على الأول.', owner: 'agency' },
      ],
      appealDraft: {
        ar: 'السلام عليكم، نطلب إعادة النظر في تعليق نشاطنا. صحّحنا حقل العنوان ليطابق السجل التجاري بالكامل (رقم المبنى والوحدة)، وأرفقنا السجل التجاري وعقد الإيجار وصور حديثة للواجهة واللافتة.',
        en: 'Hello, we kindly request a review of our suspension. We corrected the address field to match our commercial registration (building and unit number) and attached the CR, the lease, and recent photos of the storefront and signage.',
      },
      summary: 'المشكلة الأساسية في العنوان. صحّحه ووثّق الواجهة، وبعدها الاستئناف فرصته عالية.',
      disclaimer: 'هذا تحليل استشاري، والقرار النهائي لقوقل.',
    },
    name: {
      rootCause: {
        label: 'الاسم فيه كلمات تسويقية مو في السجل',
        confidence: 76,
        evidence: ['اسم الملف فيه «الأفضل» و«الرياض» وهي مو في السجل التجاري', 'الاسم في الفواتير مختصر'],
        sourcePolicy: 'Business Profile — Name policy',
      },
      policyViolations: [
        { policy: 'دقة الاسم', riskLevel: 'high', explanation: 'الاسم لازم يكون الاسم الحقيقي للنشاط، بدون كلمات مفتاحية أو أسماء مدن.' },
      ],
      missingDocuments: ['السجل التجاري', 'فاتورة رسمية باسم النشاط'],
      evidenceGaps: ['ما فيه إثبات استخدام الاسم الرسمي في التعاملات'],
      recommendedCorrection: 'احذف الكلمات الإضافية من الاسم وخله مثل السجل التجاري حرفيًا، وبعدها قدّم الاستئناف.',
      riskLevel: 'high',
      confidence: 76,
      recoveryPlan: [
        { step: 1, title: 'عدّل الاسم', detail: 'خله مطابق للسجل بدون أي إضافة.', owner: 'agency' },
        { step: 2, title: 'جهّز إثبات', detail: 'فاتورة أو عقد فيه الاسم الرسمي.', owner: 'owner' },
        { step: 3, title: 'استئناف', detail: 'اشرح إن الاسم صار مطابق والملف انضبط.', owner: 'agency' },
      ],
      appealDraft: {
        ar: 'نطلب مراجعة تعليق الملف. عدّلنا اسم النشاط ليطابق السجل التجاري حرفيًا وحذفنا أي إضافات، والمستندات مرفقة.',
        en: 'We request a review of the suspension. We updated the business name to match our commercial registration exactly and removed all additions. Supporting documents are attached.',
      },
      summary: 'الاسم هو السبب. تعديله شرط قبل أي استئناف.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
    },
    category: {
      rootCause: {
        label: 'فئة النشاط أوسع من النشاط الفعلي',
        confidence: 68,
        evidence: ['الفئة الحالية «صالون تجميل» والخدمة الأساسية عناية بالبشرة', 'الموقع الإلكتروني يذكر خدمات مختلفة'],
        sourcePolicy: 'Business Profile — Category guidelines',
      },
      policyViolations: [
        { policy: 'دقة الفئة', riskLevel: 'medium', explanation: 'لازم تختار أدق فئة أساسية تصف النشاط، مو أوسع فئة.' },
      ],
      missingDocuments: ['رخصة النشاط', 'قائمة الخدمات'],
      evidenceGaps: ['وصف الخدمة مختلف بين الموقع والملف'],
      recommendedCorrection: 'ضيّق الفئة لأدق وصف، ووحّد الوصف بين الموقع والملف والسوشال.',
      riskLevel: 'medium',
      confidence: 68,
      recoveryPlan: [
        { step: 1, title: 'اضبط الفئة', detail: 'اختر فئة أساسية واحدة دقيقة.', owner: 'agency' },
        { step: 2, title: 'وحّد الوصف', detail: 'خله نفس الوصف في كل مكان.', owner: 'agency' },
        { step: 3, title: 'راقب أسبوع', detail: 'إذا ما رجع الملف، قدّم استئناف.', owner: 'agency' },
      ],
      summary: 'مشكلة فئة، غالبًا تنحل بدون استئناف إذا ضبطت الوصف.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
    },
    operation: {
      rootCause: {
        label: 'غير واضح هل النشاط يستقبل عملاء في الموقع',
        confidence: 45,
        evidence: ['الملف مسجّل كموقع خدمة لكن الفئة تتطلب واجهة', 'ما فيه صور للواجهة', 'المالك ما أكّد طريقة العمل'],
      },
      policyViolations: [
        { policy: 'أهلية النشاط', riskLevel: 'medium', explanation: 'الأنشطة الخدمية ما تعرض عنوان عام، والأنشطة اللي لها محل لازم يكون لها عنوان.' },
      ],
      missingDocuments: ['إثبات نطاق الخدمة', 'ما يوضح نموذج العمل'],
      evidenceGaps: ['ما فيه دليل يحدد هل فيه محل فعلي'],
      recommendedCorrection: 'أكد مع المالك طريقة العمل: إذا يستقبل عملاء اضبطه كمحل، وإذا خدمي حوّله لـ Service Area Business وأخف العنوان.',
      riskLevel: 'medium',
      confidence: 45,
      recoveryPlan: [
        { step: 1, title: 'اسأل المالك', detail: 'هل فيه محل يستقبل عملاء؟', owner: 'agency' },
        { step: 2, title: 'اضبط النوع', detail: 'عدّل الملف حسب الإجابة.', owner: 'agency' },
      ],
      summary: 'الأدلة ناقصة. لازم تأكيد من المالك قبل أي خطوة.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
    },
    verify: {
      rootCause: {
        label: 'قوقل تبي تحقق من النشاط (Verification)',
        confidence: 80,
        evidence: ['الرسالة تطلب تحقق', 'الملف جديد نسبيًا', 'ما فيه سجل تجاري مرفوع'],
      },
      policyViolations: [],
      missingDocuments: ['السجل التجاري', 'رخصة البلدية', 'صورة الواجهة'],
      evidenceGaps: ['ما فيه أي مستند رسمي مرفوع'],
      recommendedCorrection: 'ارفع السجل والرخصة وصور الواجهة، واطلب التحقق من داخل الملف نفسه، ولا تعيد إنشاء الملف.',
      riskLevel: 'medium',
      confidence: 80,
      recoveryPlan: [
        { step: 1, title: 'ارفع المستندات', detail: 'سجل + رخصة + واجهة.', owner: 'owner' },
        { step: 2, title: 'اطلب التحقق', detail: 'من داخل الملف، واختر الطريقة المتاحة.', owner: 'agency' },
        { step: 3, title: 'انتظر', detail: 'غالبًا من 3 إلى 7 أيام عمل.', owner: 'google' },
      ],
      summary: 'الموضوع تحقق مو تعليق. المستندات هي المفتاح.',
      disclaimer: 'تحليل استشاري، والقرار لقوقل.',
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
  district: string;
  country: string;
  status: CaseRecord['status'];
  days: number;
  risk: 'low' | 'medium' | 'high';
  diagnosis?: 'address' | 'name' | 'category' | 'operation' | 'verify';
  docs: number;
  fee: number;
  message: string;
}

const SEED_SPECS: SeedSpec[] = [
  {
    customer: 'سارة العتيبي',
    phone: '+966 55 214 8890',
    business: 'مطعم بيت المندي',
    category: 'مطعم يمني',
    city: 'الرياض',
    district: 'حي النرجس، طريق أنس بن مالك، مبنى 4412 — وحدة 4',
    country: 'SA',
    status: 'appeal_ready',
    days: 12,
    risk: 'high',
    diagnosis: 'address',
    docs: 4,
    fee: 1800,
    message: 'Your Business Profile has been suspended due to quality issues. Review the representation guidelines.',
  },
  {
    customer: 'خالد المنصوري',
    phone: '+966 50 338 1120',
    business: 'صالون لمسة أنيقة',
    category: 'صالون تجميل',
    city: 'الرياض',
    district: 'حي الملقا، شارع الأمير تركي، محل 6',
    country: 'SA',
    status: 'submitted',
    days: 9,
    risk: 'medium',
    diagnosis: 'category',
    docs: 3,
    fee: 1500,
    message: 'Your listing has been suspended for policy violations.',
  },
  {
    customer: 'منى الحربي',
    phone: '+966 53 771 0042',
    business: 'عيادة دنتال كير',
    category: 'عيادة أسنان',
    city: 'جدة',
    district: 'حي الشاطئ، شارع الأمير سلطان، برج الياقوت، الدور 3',
    country: 'SA',
    status: 'pending_docs',
    days: 7,
    risk: 'medium',
    diagnosis: 'operation',
    docs: 2,
    fee: 2200,
    message: 'We could not verify your business information.',
  },
  {
    customer: 'سلطان القحطاني',
    phone: '+966 56 902 3311',
    business: 'ورشة النور للسيارات',
    category: 'ورشة صيانة سيارات',
    city: 'الدمام',
    district: 'حي الفيصلية، شارع الملك فهد، 118',
    country: 'SA',
    status: 'reinstated',
    days: 26,
    risk: 'low',
    diagnosis: 'address',
    docs: 5,
    fee: 1200,
    message: 'Your profile is suspended.',
  },
  {
    customer: 'نورة الشهري',
    phone: '+966 54 118 7723',
    business: 'مقهى ركن القهوة',
    category: 'مقهى',
    city: 'الخبر',
    district: 'حي العقربية، شارع الظهران، 22',
    country: 'SA',
    status: 'diagnosis_ready',
    days: 3,
    risk: 'high',
    diagnosis: 'name',
    docs: 2,
    fee: 1600,
    message: 'Suspended due to quality issues.',
  },
  {
    customer: 'يوسف الشمري',
    phone: '+966 59 442 1310',
    business: 'صيدلية الحياة',
    category: 'صيدلية',
    city: 'حفر الباطن',
    district: 'حي الخالدية، شارع الملك عبدالعزيز، مبنى 9',
    country: 'SA',
    status: 'new',
    days: 1,
    risk: 'medium',
    docs: 0,
    fee: 1400,
    message: 'Your Business Profile has been suspended.',
  },
  {
    customer: 'ريم السالم',
    phone: '+966 55 118 7723',
    business: 'بوتيك ريم',
    category: 'متجر ملابس',
    city: 'الرياض',
    district: 'حي الياسمين، شارع أنس بن مالك، 33',
    country: 'SA',
    status: 'rejected',
    days: 18,
    risk: 'high',
    diagnosis: 'name',
    docs: 4,
    fee: 1800,
    message: 'Appeal decision: not approved.',
  },
  {
    customer: 'عبدالله الزهراني',
    phone: '+966 57 220 9981',
    business: 'مخبز السنابل',
    category: 'مخبز وحلويات',
    city: 'مكة المكرمة',
    district: 'حي العزيزية، شارع الحج، 71',
    country: 'SA',
    status: 'appeal_ready',
    days: 6,
    risk: 'medium',
    diagnosis: 'address',
    docs: 3,
    fee: 1500,
    message: 'Suspended for misrepresentation.',
  },
  {
    customer: 'هند العبيد',
    phone: '+966 58 881 2200',
    business: 'مركز لمسات للعناية',
    category: 'مركز عناية بالبشرة',
    city: 'الرياض',
    district: 'حي الصحافة، شارع التخصصي، 14',
    country: 'SA',
    status: 'analyzing',
    days: 0,
    risk: 'medium',
    docs: 1,
    fee: 1700,
    message: 'Your profile is under review.',
  },
  {
    customer: 'ماجد الدوسري',
    phone: '+966 54 337 6654',
    business: 'شركة ركاز للنقل',
    category: 'خدمة نقل',
    city: 'الرياض',
    district: 'المنطقة الصناعية، شارع 8، مستودع 12',
    country: 'SA',
    status: 'reinstated',
    days: 40,
    risk: 'low',
    diagnosis: 'operation',
    docs: 6,
    fee: 2000,
    message: 'Suspended.',
  },
  {
    customer: 'لمياء الحسن',
    phone: '+966 59 441 2201',
    business: 'حضانة براعم المستقبل',
    category: 'حضانة أطفال',
    city: 'جدة',
    district: 'حي الروضة، شارع الأمل، 5',
    country: 'SA',
    status: 'submitted',
    days: 11,
    risk: 'medium',
    diagnosis: 'verify',
    docs: 4,
    fee: 1900,
    message: 'Verification required for your business profile.',
  },
  {
    customer: 'فهد البقمي',
    phone: '+966 55 993 1177',
    business: 'استوديو عدسة',
    category: 'استوديو تصوير',
    city: 'الطائف',
    district: 'حي الشهار، شارع الأمير سلطان، 27',
    country: 'SA',
    status: 'new',
    days: 2,
    risk: 'low',
    docs: 0,
    fee: 1300,
    message: 'Suspended for policy reasons.',
  },
  {
    customer: 'سعد الغامدي',
    phone: '+966 56 771 4402',
    business: 'مغسلة الغيمة',
    category: 'مغسلة ملابس',
    city: 'بريدة',
    district: 'حي الصفرا، شارع عمر بن الخطاب، 63',
    country: 'SA',
    status: 'diagnosis_ready',
    days: 4,
    risk: 'medium',
    diagnosis: 'address',
    docs: 2,
    fee: 1400,
    message: 'Your listing has been suspended.',
  },
  {
    customer: 'هاني العلي',
    phone: '+966 50 664 2211',
    business: 'فلافل الشام',
    category: 'مطعم سندويشات',
    city: 'الرياض',
    district: 'حي العليا، شارع العروبة، 8',
    country: 'SA',
    status: 'appeal_ready',
    days: 5,
    risk: 'high',
    diagnosis: 'name',
    docs: 3,
    fee: 1500,
    message: 'Suspended for misrepresentation.',
  },
  {
    customer: 'د. رنا الشهري',
    phone: '+966 53 990 1187',
    business: 'عيادة سما الجلدية',
    category: 'عيادة جلدية',
    city: 'أبها',
    district: 'حي المنسك، طريق الملك فهد، مجمع 3',
    country: 'SA',
    status: 'reinstated',
    days: 33,
    risk: 'low',
    diagnosis: 'verify',
    docs: 5,
    fee: 2400,
    message: 'Verification required.',
  },
  {
    customer: 'الجوهرة الدوسري',
    phone: '+966 58 220 4499',
    business: 'ورد وياسمين',
    category: 'محل ورد',
    city: 'الرياض',
    district: 'حي الملز، شارع الأحساء، 12',
    country: 'SA',
    status: 'pending_docs',
    days: 8,
    risk: 'medium',
    diagnosis: 'operation',
    docs: 1,
    fee: 1200,
    message: 'We could not verify your business information.',
  },
];

const DOC_NAMES = ['سجل-تجاري.pdf', 'صورة-الواجهة.jpg', 'فاتورة-كهرباء.pdf', 'لافتة-المحل.jpg', 'عقد-إيجار.pdf', 'رخصة-البلدية.pdf'];
const DOC_CATS = ['commercial_reg', 'storefront', 'utility', 'signage', 'other', 'license'] as const;

function buildDemoCases(): CaseRecord[] {
  return SEED_SPECS.map((spec, i) => {
    const diagnosis = spec.diagnosis ? demoDiagnosis(spec.diagnosis) : undefined;
    const createdAt = iso(spec.days + 2, 9 + (i % 6));
    const timeline: CaseRecord['timeline'] = [
      { at: createdAt, label: 'انفتحت القضية', tone: 'neutral' },
      { at: iso(spec.days + 1, 12), label: 'ارتفعت المستندات', tone: 'neutral' },
    ];
    if (diagnosis) timeline.push({ at: iso(spec.days, 14), label: 'خلص التشخيص', tone: 'good' });
    if (['appeal_ready', 'submitted', 'reinstated', 'rejected'].includes(spec.status)) {
      timeline.push({ at: iso(Math.max(0, spec.days - 2), 11), label: 'جهزنا الاستئناف', tone: 'neutral' });
    }
    if (['submitted', 'reinstated', 'rejected'].includes(spec.status)) {
      timeline.push({ at: iso(Math.max(0, spec.days - 4), 16), label: 'انقدّم الاستئناف', tone: 'warn' });
    }
    if (spec.status === 'reinstated') timeline.push({ at: iso(Math.max(0, spec.days - 12), 10), label: 'رجع الملف', tone: 'good' });
    if (spec.status === 'rejected') timeline.push({ at: iso(Math.max(0, spec.days - 9), 10), label: 'قوقل رفضت', tone: 'bad' });

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
      address: spec.district,
      website: `https://${['mandi-house', 'lamsa-beauty', 'dentalcare', 'alnoor-cars', 'corner-coffee', 'alhaya-pharma', 'reem-boutique', 'alsanabel', 'lamsat-care', 'rikaz-logistics', 'baraem', 'adasah-studio', 'alghaima', 'sham-falafel', 'sama-clinic', 'ward-yasmin'][i] ?? 'example'}.com`,
      phone: spec.phone,
      status: spec.status,
      riskLevel: diagnosis?.riskLevel ?? spec.risk,
      confidence: diagnosis?.confidence,
      suspensionDate: iso(spec.days + 3, 8),
      suspensionMessage: spec.message,
      previousAppeals: spec.status === 'rejected' ? 'استئناف واحد وانرفض' : 'ما فيه',
      isStorefront: true,
      customersVisit: true,
      hasSignage: spec.diagnosis === 'address' ? false : true,
      diagnosis,
      appealAr: diagnosis?.appealDraft?.ar,
      appealEn: diagnosis?.appealDraft?.en,
      intel: diagnosis
        ? {
            evidence: {
              comparisons: [
                {
                  field: 'name',
                  profileValue: spec.business,
                  documentValue: spec.business,
                  status: 'match',
                  impact: 'low',
                  fix: 'ما يحتاج تعديل',
                },
                {
                  field: 'address',
                  profileValue: spec.district.split('،')[0],
                  documentValue: spec.district,
                  status: spec.diagnosis === 'address' ? 'mismatch' : 'match',
                  impact: spec.diagnosis === 'address' ? 'high' : 'low',
                  fix: spec.diagnosis === 'address' ? 'اكتب العنوان كامل مع رقم الوحدة' : 'تمام',
                },
              ],
              conflictsCount: spec.diagnosis === 'address' ? 1 : 0,
              criticalConflicts: spec.diagnosis === 'address' ? ['رقم الوحدة ناقص في الملف'] : [],
              verdict: spec.diagnosis === 'address' ? 'fix_required' : 'ready',
              summary: 'قارنّا الاسم والعنوان والجوال مع المستندات.',
            },
            recommendations: {
              recommendations: [
                {
                  priority: 1,
                  title: spec.diagnosis === 'address' ? 'صحّح العنوان أول' : 'اضبط الاسم أول',
                  why: 'هذا السبب الأقرب لرفض الاستئناف',
                  how: 'عدّل الحقل من لوحة قوقل Business Profile Manager',
                  effort: 'low',
                  impact: 'high',
                  timeframe: '24h',
                },
                {
                  priority: 2,
                  title: 'جهّز صور الواجهة',
                  why: 'تثبت إن النشاط موجود فعليًا',
                  how: 'صور من زاويتين + مقطع 10 ثواني',
                  effort: 'low',
                  impact: 'medium',
                  timeframe: '3d',
                },
                {
                  priority: 3,
                  title: 'لا ترسل استئناف ثاني قبل الرد',
                  why: 'الاستئنافات المتكررة تأخر القرار',
                  how: 'انتظر رد قوقل أو 7 أيام',
                  effort: 'low',
                  impact: 'medium',
                  timeframe: '1w',
                },
              ],
              doNotDo: ['لا تغيّر الفئة أكثر من مرة', 'لا تنشئ ملف جديد بدل المعلّق'],
              expectedOutcome: 'فرصة الاسترداد جيدة إذا التزمت بالتصحيح قبل التقديم.',
              summary: 'أهم شي التصحيح قبل الاستئناف.',
            },
            summary: {
              headline: `${spec.business} — ${diagnosis.rootCause.label}`,
              statusNarrative: 'القضية متقدمة والأدلة شبه مكتملة. الخطوة الجاية تقديم الاستئناف بعد التصحيح.',
              keyRisks: ['تعارض العنوان', 'نقص صور الواجهة'],
              nextAction: { owner: 'agency', action: 'تقديم الاستئناف اليدوي', dueInDays: 2 },
              openQuestions: ['هل المالك يقدر يوفر صور حديثة؟'],
              confidence: diagnosis.confidence,
            },
          }
        : undefined,
      documents: Array.from({ length: spec.docs }).map((_, d) => ({
        id: `doc_${i}_${d}`,
        name: DOC_NAMES[d % DOC_NAMES.length],
        mimeType: d % 2 === 1 ? 'image/jpeg' : 'application/pdf',
        size: 180_000 + d * 94_000,
        category: DOC_CATS[d % DOC_CATS.length],
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
