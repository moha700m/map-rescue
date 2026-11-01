export type AiTaskId =
  | 'gbp-diagnosis'
  | 'suspension-investigation'
  | 'policy-analysis'
  | 'document-analysis'
  | 'ocr-interpretation'
  | 'evidence-comparison'
  | 'appeal-generation'
  | 'bilingual-writing'
  | 'recovery-recommendations'
  | 'case-summary'
  | 'customer-report';

export type TaskCategory = 'diagnosis' | 'analysis' | 'documents' | 'writing' | 'reporting';

export interface AiTaskDefinition {
  id: AiTaskId;
  titleAr: string;
  titleEn: string;
  descAr: string;
  category: TaskCategory;
  icon: string;
  output: 'json' | 'markdown' | 'text';
  needs: ('image' | 'file' | 'text')[];
  temperature: number;
  /** Hint used by settings UI to suggest the right model class. */
  modelHint: 'default' | 'vision' | 'long' | 'economy';
  system: string;
  buildUser: (input: Record<string, unknown>) => string;
}

const CORE_RULES = `أنت "MAP RESCUE AI"، مستشار متخصص في استرداد ملفات Google Business Profile (GBP) المعلّقة أو المعطّلة، وتعمل لحساب وكالة إدارة حضور رقمي محترفة.

قواعد إلزامية:
1) استند فقط إلى سياسات Google الرسمية المنشورة في support.google.com/business وdevelopers.google.com/my-business. لا تخترع أسباب تعليق، ولا تنسب إلى Google ما لم تنص عليه سياسة موثّقة.
2) إن كانت الأدلة غير كافية فاذكر ذلك صريحًا، وحدّد بالضبط ما ينقص من أدلة، بدلًا من التخمين.
3) ميّز دائمًا بين: (أ) بيانات قدّمها العميل، (ب) استنتاج تحليلي، (ج) اقتباس/إشارة إلى سياسة رسمية.
4) لا تقترح أي إجراء يخالف سياسات Google (حسابات وهمية، عناوين منتحلة، تغيير نشاط فعلي، مراجعات مدفوعة، إخفاء عناوين).
5) لا تقدّم تنفيذًا آليًا لأي إجراء خارجي؛ الاستئناف يُقدَّم يدويًا بموافقة المالك.
6) اكتب بالعربية الفصحى المهنية، وأبقِ المصطلحات التقنية بالإنجليزية عند الحاجة (Business Profile, Reinstatement, Verification...).
7) كن محددًا وقابلًا للتنفيذ: خطوات مرقّمة، مسؤول لكل خطوة، ومعيار نجاح.`;

const JSON_CONTRACT = `أعد الإخراج بصيغة JSON صالح فقط، دون أي نص قبله أو بعده، ودون علامات code fence. التزم بهذا المخطط:

{
  "rootCause": { "label": "السبب الأرجح أو 'insufficient_evidence'", "confidence": 0-100, "evidence": ["دليل 1", "..."], "sourcePolicy": "اسم السياسة الرسمية أو null" },
  "policyViolations": [ { "policy": "اسم السياسة", "riskLevel": "low|medium|high", "explanation": "شرح مختصر" } ],
  "missingDocuments": ["مستند مطلوب", "..."],
  "evidenceGaps": ["فجوة في الأدلة", "..."],
  "recommendedCorrection": "الإجراء التصحيحي الموصى به بالتفصيل",
  "riskLevel": "low|medium|high",
  "confidence": 0-100,
  "recoveryPlan": [ { "step": 1, "title": "عنوان", "detail": "تفصيل", "owner": "owner|agency|google" } ],
  "appealDraft": { "ar": "نص استئناف عربي جاهز", "en": "English appeal text" },
  "summary": "ملخص تنفيذي في 2-3 أسطر",
  "disclaimer": "تحليل استشاري وليس قرارًا من Google"
}`;

function jsonBlock(input: Record<string, unknown>) {
  return `بيانات الحالة (JSON):\n${JSON.stringify(input, null, 2)}`;
}

export const AI_TASKS: Record<AiTaskId, AiTaskDefinition> = {
  'gbp-diagnosis': {
    id: 'gbp-diagnosis',
    titleAr: 'تشخيص ملف Google Business',
    titleEn: 'GBP Diagnosis',
    descAr: 'تحليل شامل لحالة التعليق مع السبب الأرجح والأدلة المطلوبة وخطة تعافٍ.',
    category: 'diagnosis',
    icon: 'stethoscope',
    output: 'json',
    needs: ['text'],
    temperature: 0.2,
    modelHint: 'default',
    system: `${CORE_RULES}\n\nمهمتك: تشخيص سبب تعليق ملف Google Business Profile بناءً على بيانات الحالة والمستندات المتاحة، ثم إنتاج خطة تعافٍ قابلة للتنفيذ.\n\n${JSON_CONTRACT}`,
    buildUser: (input) => `حلّل حالة تعليق ملف Google Business Profile التالية وأعد التشخيص الكامل.

${jsonBlock(input)}

توجيهات إضافية:
- اربط كل سبب محتمل بسياسة رسمية محددة إن أمكن.
- إذا كان نص رسالة التعليق عامًا (مثل "quality issues") ففسّر النطاق المحتمل واذكر ما يلزم للتحقق.
- رتّب خطة التعافي من الأسرع أثرًا إلى الأطول أمدًا.`,
  },

  'suspension-investigation': {
    id: 'suspension-investigation',
    titleAr: 'تحقيق التعليق',
    titleEn: 'Suspension Investigation',
    descAr: 'تحقيق منظم في ملابسات التعليق: التوقيت، التغييرات السابقة، الأنماط، والفرضيات.',
    category: 'diagnosis',
    icon: 'search',
    output: 'json',
    needs: ['text'],
    temperature: 0.25,
    modelHint: 'default',
    system: `${CORE_RULES}\n\nمهمتك: إجراء تحقيق منظم في تعليق الملف — بناء خط زمني للفرضيات، وربطها بالأدلة، وتصنيفها حسب قابلية التحقق.\n\n${JSON_CONTRACT}`,
    buildUser: (input) => `أجرِ تحقيقًا منظمًا في هذا التعليق.

${jsonBlock(input)}

ركّز على:
1) ما الذي تغيّر في الملف قبل التعليق (اسم، فئة، عنوان، ساعات عمل، مالك، مدفوعات).
2) أنماط مرتبطة: عناوين افتراضية، فروع متعددة، نشاط لا يستقبل عملاء، تطابق مع سجل تجاري.
3) الفرضيات الثلاث الأقوى مع دليل مؤيد ودليل ناقص لكل فرضية.
4) اختبار سريع للتحقق من كل فرضية قبل الاستئناف.`,
  },

  'policy-analysis': {
    id: 'policy-analysis',
    titleAr: 'تحليل سياسات Google',
    titleEn: 'Policy Analysis',
    descAr: 'مطابقة الحالة مع بنود سياسات Google ذات الصلة وتحديد المخالفات المحتملة.',
    category: 'analysis',
    icon: 'scale',
    output: 'json',
    needs: ['text'],
    temperature: 0.15,
    modelHint: 'long',
    system: `${CORE_RULES}\n\nمهمتك: تحليل سياسي دقيق. لا تستشهد بسياسة غير موجودة. إذا لم تكن واثقًا من اسم السياسة أو نصها، اكتب "unverified" في sourcePolicy واشرح درجة uncertainty.\n\n${JSON_CONTRACT}`,
    buildUser: (input) => `حلّل هذه الحالة مقابل سياسات Google Business Profile الرسمية.

${jsonBlock(input)}

المطلوب:
- تحديد السياسات ذات الصلة (مثل: Representation, Name, Address, Category, Eligibility, Content, Deceptive practices, Service area).
- لكل سياسة: هل يوجد مؤشر مخالفة؟ ما الدليل؟ ما درجة الخطورة؟
- ما الذي يجب تصحيحه قبل أي استئناف؟`,
  },

  'document-analysis': {
    id: 'document-analysis',
    titleAr: 'تحليل المستندات',
    titleEn: 'Document Analysis',
    descAr: 'قراءة المستندات المرفوعة (PDF/صور) وتقييم صلاحيتها كدليل.',
    category: 'documents',
    icon: 'file-search',
    output: 'json',
    needs: ['text', 'file'],
    temperature: 0.2,
    modelHint: 'vision',
    system: `${CORE_RULES}\n\nمهمتك: تحليل مستندات إثبات النشاط (سجل تجاري، رخصة، فاتورة مرافق، عقد إيجار، لافتة، صور واجهة) وتقييم مدى صلاحيتها كدليل لـ Google.

أعد JSON فقط بهذا المخطط:
{
  "documents": [ { "name": "اسم المستند", "type": "commercial_reg|license|utility|lease|storefront|signage|other", "issuer": "الجهة المُصدِرة أو null", "businessNameMatch": "match|mismatch|unclear", "addressMatch": "match|mismatch|unclear|not_applicable", "validity": "valid|expired|unclear", "quality": "high|medium|low", "notes": "ملاحظات" } ],
  "coverage": { "confirmsBusinessName": true, "confirmsAddress": true, "confirmsOperation": true, "confirmsStorefront": false },
  "missingDocuments": ["..."],
  "risks": ["..."],
  "verdict": "sufficient|partially_sufficient|insufficient",
  "summary": "ملخص",
  "disclaimer": "تحليل استشاري وليس قرارًا من Google"
}`,
    buildUser: (input) => `حلّل المستندات المرفقة وأعد التقييم بصيغة JSON.

${jsonBlock(input)}

انتبه إلى:
- تطابق الاسم التجاري مع اسم الملف على Google (بما فيه الفروق الطفيفة والاختصارات).
- تطابق العنوان بالكامل بما فيه رقم الوحدة.
- صلاحية المستند وتاريخه.
- هل يثبت المستند وجود نشاط فعلي في الموقع؟
- جودة الصورة/الوضوح وتأثيرها على القبول.`,
  },

  'ocr-interpretation': {
    id: 'ocr-interpretation',
    titleAr: 'تفسير نص OCR',
    titleEn: 'OCR Interpretation',
    descAr: 'تنظيف وتفسير نص مستخرج من صور أو مستندات، مع تصحيح أخطاء القراءة.',
    category: 'documents',
    icon: 'scan-text',
    output: 'json',
    needs: ['text', 'image'],
    temperature: 0.1,
    modelHint: 'vision',
    system: `أنت خبير في قراءة المستندات العربية والإنجليزية الرسمية واستخراج الحقول منها بدقة عالية.

قواعد:
1) لا تخترع أي قيمة غير ظاهرة في المستند. القيم غير المقروءة تُكتب null.
2) صحّح أخطاء OCR الشائعة في الحروف العربية (ة/ه، ي/ى، أ/إ/ا) مع الحفاظ على المعنى.
3) حافظ على الأرقام كما هي تمامًا (أرقام السجل التجاري، تواريخ الانتهاء، أرقام الهوية).
4) أعد JSON صالحًا فقط.

المخطط:
{
  "documentType": "commercial_reg|license|utility|lease|signage|other",
  "language": "ar|en|mixed",
  "confidence": 0-100,
  "fields": { "businessName": "", "ownerName": "", "registrationNumber": "", "issueDate": "", "expiryDate": "", "address": "", "activity": "", "issuer": "" },
  "correctedText": "النص بعد التصحيح",
  "unreadableSegments": ["..."],
  "notes": "..."
}`,
    buildUser: (input) => `اقرأ المستند/الصورة المرفقة واستخرج الحقول المطلوبة بدقة.

ملاحظات المشغّل: ${String(input.notes ?? 'لا يوجد')}

${jsonBlock(input)}`,
  },

  'evidence-comparison': {
    id: 'evidence-comparison',
    titleAr: 'مقارنة الأدلة',
    titleEn: 'Evidence Comparison',
    descAr: 'مقارنة بيانات ملف Google مع المستندات وإبراز التعارضات قبل الاستئناف.',
    category: 'analysis',
    icon: 'git-compare',
    output: 'json',
    needs: ['text'],
    temperature: 0.15,
    modelHint: 'default',
    system: `${CORE_RULES}\n\nمهمتك: مقارنة حقول ملف Google Business Profile مع ما ورد في المستندات، وتحديد التعارضات التي تسبب رفض الاستئناف.

أعد JSON فقط:
{
  "comparisons": [ { "field": "name|address|phone|category|website|hours", "profileValue": "", "documentValue": "", "status": "match|mismatch|missing|unclear", "impact": "high|medium|low", "fix": "الإجراء التصحيحي" } ],
  "conflictsCount": 0,
  "criticalConflicts": ["..."],
  "verdict": "ready|fix_required|insufficient_evidence",
  "summary": "...",
  "disclaimer": "..."
}`,
    buildUser: (input) => `قارن بين بيانات الملف والمستندات وأبرز التعارضات.

${jsonBlock(input)}`,
  },

  'appeal-generation': {
    id: 'appeal-generation',
    titleAr: 'توليد الاستئناف',
    titleEn: 'Appeal Generation',
    descAr: 'صياغة استئناف رسمي بالعربية والإنجليزية جاهز للتقديم اليدوي.',
    category: 'writing',
    icon: 'pen-line',
    output: 'json',
    needs: ['text'],
    temperature: 0.35,
    modelHint: 'default',
    system: `${CORE_RULES}\n\nمهمتك: صياغة استئناف (Reinstatement Appeal) رسمي ومقنع، بأسلوب موجز ومهني، يعتمد على الوقائع والأدلة المقدمة فقط.

قواعد الصياغة:
- لا تعتذر عن مخالفة لم تُثبت، ولا تنفِ مخالفة بشكل مطلق إن كان هناك دليل عليها.
- اذكر الإجراء التصحيحي الذي تم فعليًا.
- أدرج قائمة المستندات المرفقة.
- لا يتجاوز الاستئناف 220 كلمة لكل لغة.
- لا تستخدم عبارات عاطفية أو تهديدية.

أعد JSON فقط:
{
  "appeal": { "ar": "...", "en": "..." },
  "attachmentsList": ["..."],
  "submissionNotes": ["ملاحظات قبل التقديم"],
  "followUpPlan": ["خطوة بعد X أيام"],
  "riskNotes": ["..."],
  "disclaimer": "..."
}`,
    buildUser: (input) => `اكتب استئنافًا رسميًا لهذه الحالة بالعربية والإنجليزية.

${jsonBlock(input)}`,
  },

  'bilingual-writing': {
    id: 'bilingual-writing',
    titleAr: 'كتابة عربية/إنجليزية',
    titleEn: 'Bilingual Writing',
    descAr: 'صياغة أو ترجمة رسائل احترافية متوازنة بين العربية والإنجليزية.',
    category: 'writing',
    icon: 'languages',
    output: 'json',
    needs: ['text'],
    temperature: 0.4,
    modelHint: 'default',
    system: `أنت كاتب محتوى ثنائي اللغة (عربي/إنجليزي) متخصص في المراسلات المهنية مع Google ودعم العملاء.

قواعد:
1) الترجمة يجب أن تكون طبيعية وليست حرفية؛ حافظ على النبرة المهنية نفسها.
2) لا تترجم أسماء المستندات الرسمية حرفيًا إن كان لها مقابل معتمد.
3) أعد JSON صالحًا فقط:
{
  "ar": "النص العربي",
  "en": "English text",
  "tone": "formal|friendly|firm",
  "wordCount": { "ar": 0, "en": 0 },
  "notes": "ملاحظات على الخيارات الأسلوبية"
}`,
    buildUser: (input) => `اكتب/ترجم النص التالي بالعربية والإنجليزية.

النوع: ${String(input.kind ?? 'رسالة مهنية')}
النبرة المطلوبة: ${String(input.tone ?? 'formal')}
النص المصدر:
"""
${String(input.text ?? '')}
"""

${jsonBlock(input)}`,
  },

  'recovery-recommendations': {
    id: 'recovery-recommendations',
    titleAr: 'توصيات الاسترداد',
    titleEn: 'Recovery Recommendations',
    descAr: 'توصيات مرتبة حسب الأولوية والأثر لرفع فرص الاسترداد.',
    category: 'analysis',
    icon: 'route',
    output: 'json',
    needs: ['text'],
    temperature: 0.3,
    modelHint: 'default',
    system: `${CORE_RULES}\n\nمهمتك: إعطاء توصيات استرداد مرتبة حسب (الأثر × السرعة ÷ الجهد)، مع تحديد ما يجب فعله قبل التقديم وبعده.

أعد JSON فقط:
{
  "recommendations": [ { "priority": 1, "title": "", "why": "", "how": "", "effort": "low|medium|high", "impact": "low|medium|high", "timeframe": "24h|3d|1w|2w" } ],
  "doNotDo": ["ما يجب تجنبه"],
  "expectedOutcome": "توقع واقعي",
  "summary": "...",
  "disclaimer": "..."
}`,
    buildUser: (input) => `أعطني توصيات الاسترداد لهذه الحالة.

${jsonBlock(input)}`,
  },

  'case-summary': {
    id: 'case-summary',
    titleAr: 'ملخص القضية',
    titleEn: 'Case Summary',
    descAr: 'ملخص تنفيذي داخلي للقضية مع الحالة والمخاطر والخطوة التالية.',
    category: 'reporting',
    icon: 'clipboard-list',
    output: 'json',
    needs: ['text'],
    temperature: 0.2,
    modelHint: 'economy',
    system: `${CORE_RULES}\n\nمهمتك: إنتاج ملخص تنفيذي داخلي موجز للفريق.

أعد JSON فقط:
{
  "headline": "عنوان بجملة واحدة",
  "statusNarrative": "3 أسطر",
  "keyRisks": ["..."],
  "nextAction": { "owner": "owner|agency|google", "action": "", "dueInDays": 0 },
  "openQuestions": ["..."],
  "confidence": 0-100
}`,
    buildUser: (input) => `لخّص القضية التالية للفريق الداخلي.

${jsonBlock(input)}`,
  },

  'customer-report': {
    id: 'customer-report',
    titleAr: 'تقرير العميل',
    titleEn: 'Customer Report',
    descAr: 'تقرير عربي واضح للعميل يشرح الوضع والخطوات دون مصطلحات معقدة.',
    category: 'reporting',
    icon: 'file-text',
    output: 'markdown',
    needs: ['text'],
    temperature: 0.35,
    modelHint: 'default',
    system: `${CORE_RULES}\n\nمهمتك: كتابة تقرير للعميل (غير تقني) بالعربية، بأسلوب واضح ومطمئن وصادق.

قواعد:
- ابدأ بملخص الوضع في 3 أسطر.
- اشرح ما نعرفه وما لا نعرفه.
- اذكر الخطوات القادمة بجدول زمني واقعي دون وعود غير مضمونة.
- لا تكشف تفاصيل داخلية أو أسماء نماذج أو أكواد.
- استخدم Markdown مع عناوين وقوائم قصيرة (بدون HTML).`,
    buildUser: (input) => `اكتب تقرير العميل لهذه الحالة.

${jsonBlock(input)}`,
  },
};

export const TASK_LIST: AiTaskDefinition[] = Object.values(AI_TASKS);

export function getTask(id: string): AiTaskDefinition | undefined {
  return AI_TASKS[id as AiTaskId];
}

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  diagnosis: 'التشخيص',
  analysis: 'التحليل',
  documents: 'المستندات',
  writing: 'الصياغة',
  reporting: 'التقارير',
};
