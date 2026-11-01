import type { CaseRecord } from './types';
import { COUNTRY_META } from './constants';

export const REINSTATEMENT_FORM = 'https://support.google.com/business/workflow/13569690';
export const GBP_HELP = 'https://support.google.com/business/community';
export const GBP_RESTRICTIONS = 'https://myaccount.google.com/restrictions';

export interface ReadinessItem {
  key: string;
  label: string;
  ok: boolean;
  critical: boolean;
  fix: string;
}

export function buildReadiness(record: CaseRecord): { items: ReadinessItem[]; score: number; blockers: ReadinessItem[] } {
  const has = (cat: string) => record.documents.some((d) => d.category === cat);
  const cause = record.diagnosis?.rootCause?.label ?? '';
  const nameIssue = /اسم/i.test(cause);
  const addressIssue = /عنوان/i.test(cause);
  const daysSinceAppeal = record.appealSubmittedAt
    ? Math.floor((Date.now() - new Date(record.appealSubmittedAt).getTime()) / 86_400_000)
    : null;

  const items: ReadinessItem[] = [
    {
      key: 'profile-id',
      label: 'رقم الملف (Profile ID) موجود',
      ok: !!record.gbpProfileId,
      critical: true,
      fix: 'افتح الملف ← الثلاث نقاط ← Business profile settings ← Advanced settings ← انسخ الرقم.',
    },
    {
      key: 'diagnosis',
      label: 'التشخيص خلص',
      ok: !!record.diagnosis,
      critical: true,
      fix: 'من القضية اضغط «شغّل كل شي» عشان نعرف السبب الحقيقي.',
    },
    {
      key: 'appeal-text',
      label: 'نص الاستئناف جاهز',
      ok: !!(record.appealAr || record.appealEn),
      critical: true,
      fix: 'اضغط «ولّد النص» فوق — يطلع لك عربي وإنجليزي.',
    },
    {
      key: 'name-fixed',
      label: nameIssue ? 'الاسم ما زال يحتاج تعديل قبل التقديم' : 'الاسم مطابق للسجل',
      ok: !nameIssue,
      critical: true,
      fix: 'احذف الكلمات التسويقية من الاسم وخله نفس السجل التجاري حرفيًا.',
    },
    {
      key: 'address-fixed',
      label: addressIssue ? 'العنوان يحتاج تصحيح (رقم الوحدة)' : 'العنوان مطابق',
      ok: !addressIssue,
      critical: true,
      fix: 'اكتب العنوان كامل: الحي، الشارع، رقم المبنى، رقم الوحدة.',
    },
    {
      key: 'message',
      label: 'رسالة قوقل محفوظة',
      ok: !!record.suspensionMessage,
      critical: false,
      fix: 'انسخ رسالة التعليق من البريد أو اللوحة وحطها في القضية.',
    },
    {
      key: 'cr',
      label: 'السجل التجاري مرفوع',
      ok: has('commercial_reg'),
      critical: true,
      fix: 'ارفع صورة واضحة للسجل التجاري من صفحة المستندات.',
    },
    {
      key: 'license',
      label: 'الرخصة مرفوعة',
      ok: has('license'),
      critical: false,
      fix: 'رخصة البلدية أو وزارة التجارة ترفع فرص القبول.',
    },
    {
      key: 'proof-location',
      label: 'صور الواجهة أو اللافتة',
      ok: has('storefront') || has('signage'),
      critical: false,
      fix: '٣ صور للواجهة واللافتة + صورة لرقم المبنى.',
    },
    {
      key: 'utility',
      label: 'فاتورة أو عقد إيجار',
      ok: has('utility') || has('lease') || has('other'),
      critical: false,
      fix: 'فاتورة كهرباء أو عقد إيجار باسم النشاط أو المالك.',
    },
    {
      key: 'no-recent-appeal',
      label:
        daysSinceAppeal !== null && daysSinceAppeal < 7
          ? `قدّمت استئناف قبل ${daysSinceAppeal} يوم — انتظر الرد`
          : 'ما فيه استئناف حديث عالق',
      ok: !(daysSinceAppeal !== null && daysSinceAppeal < 7),
      critical: false,
      fix: 'لا ترسل استئناف ثاني قبل الرد أو قبل ٧ أيام — الطلبات المكررة تُهمل.',
    },
  ];

  const okCount = items.filter((i) => i.ok).length;
  return {
    items,
    score: Math.round((okCount / items.length) * 100),
    blockers: items.filter((i) => i.critical && !i.ok),
  };
}

function correctionLine(record: CaseRecord) {
  return (
    record.diagnosis?.recommendedCorrection ||
    'راجعنا بيانات الملف وصححنا الحقول غير المطابقة للمستندات الرسمية.'
  );
}

export function appealNotesAr(record: CaseRecord): string {
  const docs = record.documents.map((d) => `• ${d.name}`).join('\n') || '• (تُرفق المستندات)';
  return `السلام عليكم،

بخصوص ملف النشاط «${record.businessName}» في ${record.city}${
    record.gbpProfileId ? ` (رقم الملف: ${record.gbpProfileId})` : ''
  }.

الملف معلّق${record.suspensionDate ? ` بتاريخ ${record.suspensionDate}` : ''}${
    record.suspensionMessage ? `، ورسالة التعليق: «${record.suspensionMessage}»` : ''
  }.

ما قمنا به قبل التقديم:
${correctionLine(record)}

المستندات المرفقة:
${docs}

الاسم والعنوان في الملف يطابقان السجل التجاري حرفيًا، ونرجو إعادة النظر في استعادة الملف.

شاكرين لكم.`;
}

export function appealNotesEn(record: CaseRecord): string {
  const docs = record.documents.map((d) => `- ${d.name}`).join('\n') || '- Documents attached';
  return `Hello,

Regarding the Business Profile "${record.businessName}" in ${record.city}${
    record.gbpProfileId ? ` (Profile ID: ${record.gbpProfileId})` : ''
  }.

The profile was suspended${record.suspensionDate ? ` on ${record.suspensionDate}` : ''}${
    record.suspensionMessage ? `, with the following notice: "${record.suspensionMessage}"` : ''
  }.

What we fixed before submitting:
${correctionLine(record)}

Attached documents:
${docs}

The name and address on the profile now match our commercial registration exactly. We kindly request a review and reinstatement.

Thank you.`;
}

export function documentsChecklist(record: CaseRecord): string {
  const expected: [string, string[]][] = [
    ['السجل التجاري', ['commercial_reg']],
    ['الرخصة', ['license']],
    ['عقد الإيجار / فاتورة مرافق', ['lease', 'utility']],
    ['صور الواجهة واللافتة', ['storefront', 'signage']],
  ];
  const lines = expected.map(([label, cats]) => {
    const found = record.documents.filter((d) => cats.includes(d.category));
    return `${found.length ? '[x]' : '[ ]'} ${label}${found.length ? ` — ${found.map((f) => f.name).join(' / ')}` : ''}`;
  });
  return `قائمة مستندات الاستئناف — ${record.code}\n\n${lines.join('\n')}\n\nملاحظة: أداة الاستئناف تقبل ٤ مرفقات. لو عندك أكثر، اضغط كل الملفات في ملف ZIP واحد، أو ارفعها Google Drive وحط الرابط في خانة الملاحظات (مشاركة: أي شخص عنده الرابط).`;
}

export function submissionSteps(record: CaseRecord): string[] {
  return [
    'تأكد إن كل البنود الحمراء في «جاهزية الملف» انتهت.',
    `احفظ رقم الملف (Profile ID)${record.gbpProfileId ? ` — رقمك: ${record.gbpProfileId}` : ' من: الملف ← الثلاث نقاط ← Business profile settings ← Advanced settings'}.`,
    'افتح أداة الاستئناف الرسمية من الرابط فوق، وسجّل بنفس حساب قوقل اللي عليه الملف.',
    'اختر النشاط، وعبّ الأسئلة بصدق.',
    'الصق «ملاحظات الاستئناف» في خانة الملاحظات — نسخة وحدة فقط، بدون تكرار.',
    'ارفع المستندات: ٤ مرفقات كحد أقصى، أو ملف ZIP واحد، أو رابط Drive.',
    'أرسل، وبعدها سجّل تاريخ التقديم هنا عشان نتابع.',
    'لا ترسل استئناف ثاني قبل الرد أو قبل ٧ أيام.',
  ];
}

export function forumPost(record: CaseRecord): string {
  return `العنوان: Suspended GBP – ${record.category} in ${record.city} – Need guidance on reinstatement

Business name: ${record.businessName}
Primary category: ${record.category}
Profile ID: ${record.gbpProfileId || '(not available)'}
Issue type: Suspension (${record.status})
Date issue started: ${record.suspensionDate || '(unknown)'}

Reason for suspension (from Google's email)
- ${record.suspensionMessage || '(no message received)'}

What I've already confirmed
- Business name matches legal documents and signage.
- Address matches the commercial registration, including unit number.
- Profile data (name, address, phone, website) matches the website and key directories.

Documents submitted to Google (not attached here)
- Commercial registration, business license, lease/utility bill, storefront photos.

Additional context (facts only)
- ${correctionLine(record)}

Notes
- I understand Product Experts are volunteers and not Google staff. I'm looking for guidance on compliance gaps or evidence to add.`;
}

export function followUp(record: CaseRecord) {
  if (!record.appealSubmittedAt) return null;
  const days = Math.floor((Date.now() - new Date(record.appealSubmittedAt).getTime()) / 86_400_000);
  const canReapply = days >= 7;
  return {
    days,
    canReapply,
    message: canReapply
      ? `مرّ ${days} يوم على التقديم. إذا ما وصل رد، تقدر تعيد بنسخة أقوى بعد ما تضيف دليل جديد.`
      : `مرّ ${days} يوم. لا ترسل استئناف ثاني الآن — انتظر ${7 - days} يوم أو رد قوقل.`,
  };
}

export function packFileName(record: CaseRecord) {
  return `submission-pack-${record.code.replace(/[^\w-]/g, '')}`;
}

export function countryLabel(code: string) {
  return COUNTRY_META[code]?.label ?? code;
}
