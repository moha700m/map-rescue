import type { CaseStatus, RiskLevel } from './types';

export const STATUS_META: Record<
  CaseStatus,
  { label: string; className: string; dot: string; description: string }
> = {
  new: { label: 'جديدة', className: 'badge-muted', dot: 'bg-slate-400', description: 'بانتظار البدء في التحليل' },
  analyzing: { label: 'قيد التحليل', className: 'badge-sky', dot: 'bg-skyx-400', description: 'تحليل AI جارٍ' },
  diagnosis_ready: { label: 'التشخيص جاهز', className: 'badge-brand', dot: 'bg-brand-400', description: 'النتيجة متاحة للمراجعة' },
  appeal_ready: { label: 'الاستئناف جاهز', className: 'badge-amber', dot: 'bg-amberx-400', description: 'بانتظار تقديم يدوي' },
  submitted: { label: 'مُقدَّم', className: 'badge-sky', dot: 'bg-skyx-500', description: 'تم التقديم — بانتظار قرار Google' },
  reinstated: { label: 'مُستعاد', className: 'badge-mint', dot: 'bg-mint-400', description: 'تمت استعادة الملف' },
  rejected: { label: 'مرفوض', className: 'badge-rose', dot: 'bg-rosex-400', description: 'قرار سلبي — إعادة بناء الملف' },
  pending_docs: { label: 'بانتظار مستندات', className: 'badge-amber', dot: 'bg-amberx-500', description: 'نواقص في الأدلة' },
};

export const STATUS_ORDER: CaseStatus[] = [
  'new',
  'analyzing',
  'diagnosis_ready',
  'pending_docs',
  'appeal_ready',
  'submitted',
  'reinstated',
  'rejected',
];

export const RISK_META: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: 'منخفض', className: 'badge-mint' },
  medium: { label: 'متوسط', className: 'badge-amber' },
  high: { label: 'مرتفع', className: 'badge-rose' },
};

export const CATEGORY_META: Record<string, { label: string; className: string }> = {
  commercial_reg: { label: 'سجل تجاري', className: 'badge-brand' },
  license: { label: 'رخصة', className: 'badge-sky' },
  utility: { label: 'فاتورة مرافق', className: 'badge-amber' },
  lease: { label: 'عقد إيجار', className: 'badge-muted' },
  storefront: { label: 'واجهة المحل', className: 'badge-mint' },
  signage: { label: 'لافتة', className: 'badge-mint' },
  video: { label: 'فيديو', className: 'badge-sky' },
  email: { label: 'بريد', className: 'badge-muted' },
  screenshot: { label: 'لقطة شاشة', className: 'badge-muted' },
  other: { label: 'أخرى', className: 'badge-muted' },
};

export const COUNTRY_META: Record<string, { label: string; flag: string }> = {
  SA: { label: 'السعودية', flag: '🇸🇦' },
  AE: { label: 'الإمارات', flag: '🇦🇪' },
  EG: { label: 'مصر', flag: '🇪🇬' },
  KW: { label: 'الكويت', flag: '🇰🇼' },
  QA: { label: 'قطر', flag: '🇶🇦' },
  BH: { label: 'البحرين', flag: '🇧🇭' },
  OM: { label: 'عمان', flag: '🇴🇲' },
  JO: { label: 'الأردن', flag: '🇯🇴' },
  MA: { label: 'المغرب', flag: '🇲🇦' },
};

export const TASK_LABEL: Record<string, string> = {
  'gbp-diagnosis': 'تشخيص الملف',
  'suspension-investigation': 'تحقيق التعليق',
  'policy-analysis': 'تحليل السياسات',
  'document-analysis': 'تحليل المستندات',
  'ocr-interpretation': 'تفسير OCR',
  'evidence-comparison': 'مقارنة الأدلة',
  'appeal-generation': 'توليد الاستئناف',
  'bilingual-writing': 'كتابة AR/EN',
  'recovery-recommendations': 'توصيات الاسترداد',
  'case-summary': 'ملخص القضية',
  'customer-report': 'تقرير العميل',
  'connection-test': 'اختبار الاتصال',
  custom: 'مخصص',
};
