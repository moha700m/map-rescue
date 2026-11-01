import type { CaseRecord } from './types';
import { suggestCategory } from './client/pipeline';

export type FixKey = 'name' | 'address' | 'category' | 'phone' | 'website' | 'description';

export interface FieldFix {
  key: FixKey;
  label: string;
  current: string;
  corrected: string;
  why: string;
  critical: boolean;
  done: boolean;
}

const MARKETING = [
  'أفضل', 'الافضل', 'الأفضل', 'أرخص', 'ارخص', 'أشهر', 'اشهر', 'الأول', 'الاول',
  'الراقي', 'راقي', 'مميز', 'الأميز', 'افخم', 'أفخم', 'رقم 1', 'رقم ١', 'الرياض', 'جدة', 'الدمام', 'مكة',
];

function cleanName(name: string) {
  let out = name.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');
  out = out.replace(/\([^)]*\)/g, ' ');
  for (const word of MARKETING) {
    out = out.replace(new RegExp(`(^|\\s)${word}(\\s|$)`, 'g'), ' ');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function normalizePhone(phone?: string) {
  if (!phone) return '';
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+966')) return digits;
  if (digits.startsWith('966')) return `+${digits}`;
  if (digits.startsWith('05')) return `+966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `+966${digits}`;
  return phone.trim();
}

function normalizeWebsite(url?: string) {
  if (!url) return '';
  let out = url.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(out)) out = `https://${out}`;
  return out.toLowerCase();
}

export function buildCorrections(record: CaseRecord) {
  const cause = record.diagnosis?.rootCause?.label ?? '';
  const nameIssue = /اسم/i.test(cause);
  const addressIssue = /عنوان/i.test(cause);
  const categoryIssue = /فئة|تصنيف/i.test(cause);

  const clean = cleanName(record.businessName);
  const suggested = suggestCategory(record.businessName) || record.category;
  const phone = normalizePhone(record.phone || record.customerPhone);
  const website = normalizeWebsite(record.website);
  const hasUnit = /وحدة|unit|محل|مكتب|دور|مبنى\s*\d+/i.test(record.address || '');
  const addressLine = record.address?.trim() || '';

  const done = record.corrections ?? {};

  const fixes: FieldFix[] = [
    {
      key: 'name',
      label: 'اسم النشاط',
      current: record.businessName,
      corrected: clean || record.businessName,
      why: 'لازم يطابق السجل التجاري حرفيًا — بدون كلمات تسويقية أو أسماء مدن.',
      critical: true,
      done: !!done.name,
    },
    {
      key: 'address',
      label: 'العنوان',
      current: record.address || '—',
      corrected:
        addressLine && !hasUnit
          ? `${addressLine} — وحدة (اكتب رقم الوحدة من السجل)`
          : addressLine || 'اكتب العنوان كامل: الحي، الشارع، المبنى، الوحدة',
      why: 'رقم الوحدة أكثر سبب للتعليق. لازم يطابق السجل حرفيًا.',
      critical: true,
      done: !!done.address,
    },
    {
      key: 'category',
      label: 'الفئة الأساسية',
      current: record.category || '—',
      corrected: suggested || record.category,
      why: 'اختر أدق فئة أساسية — وتجنّب تغييرها أكثر من مرة.',
      critical: categoryIssue,
      done: !!done.category,
    },
    {
      key: 'phone',
      label: 'رقم الجوال',
      current: record.phone || record.customerPhone || '—',
      corrected: phone || '—',
      why: 'خله بنفس الصيغة الدولية، وأضف الرقم الأرضي كرقم إضافي إن وُجد.',
      critical: false,
      done: !!done.phone,
    },
    {
      key: 'website',
      label: 'الموقع الإلكتروني',
      current: record.website || '—',
      corrected: website || '—',
      why: 'لازم يفتح مباشرة على الموقع الرسمي، وبدون روابط تتبع.',
      critical: false,
      done: !!done.website,
    },
    {
      key: 'description',
      label: 'الوصف',
      current: '—',
      corrected: `${record.businessName} — ${suggested || record.category} في ${record.city}. نستقبل عملاءنا في الموقع ونقدّم الخدمة مباشرة.`,
      why: 'وصف واضح بدون حشو كلمات مفتاحية، ومطابق للموقع.',
      critical: false,
      done: !!done.description,
    },
  ];

  const businessType: 'storefront' | 'sab' | 'unclear' = !record.customersVisit
    ? 'sab'
    : record.isStorefront
      ? 'storefront'
      : 'unclear';

  const critical = fixes.filter((f) => f.critical);
  const progress = Math.round((fixes.filter((f) => f.done).length / fixes.length) * 100);
  const blocking = fixes.filter((f) => f.critical && !f.done);
  const needsNewAppeal =
    !!record.appealSubmittedAt &&
    !!record.correctionsUpdatedAt &&
    new Date(record.correctionsUpdatedAt) > new Date(record.appealSubmittedAt);

  return { fixes, critical, progress, blocking, businessType, needsNewAppeal, addressIssue, nameIssue };
}

export function correctionsText(record: CaseRecord) {
  const { fixes } = buildCorrections(record);
  return [
    `لوحة التصحيح — ${record.businessName} (${record.code})`,
    '',
    ...fixes.map((f) => `• ${f.label}\n  الحالي: ${f.current}\n  الصحيح: ${f.corrected}`),
    '',
    'ملاحظة: تُطبَّق التصحيحات يدويًا في Business Profile Manager لأن قوقل لا تسمح بتعديل ملف معلّق برمجيًا.',
  ].join('\n');
}
