'use client';

import type { CaseRecord } from '../types';
import type { UsageEntry } from '../ai/contracts';
import type { AiHealth } from '../ai/contracts';
import { DEFAULT_AI_SETTINGS } from '../ai/config';
import { setCases, makeDoc, getCases } from './store';

const DEMO_KEY = 'mra.demo.v1';

export function isDemo(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

export function demoHealth(): AiHealth {
  return {
    ok: true,
    mode: 'direct',
    provider: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    version: '2.0.0-demo',
    key: { present: true, source: 'stored', fingerprint: 'sk-or-v1…demo' },
    settings: DEFAULT_AI_SETTINGS,
    checkedAt: new Date().toISOString(),
  };
}

const daysAgo = (n: number, h = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 20, 0, 0);
  return d.toISOString();
};

function demoCases(): CaseRecord[] {
  return [
    {
      id: 'demo_1',
      code: 'MRA-2026-0042',
      createdAt: daysAgo(0, 9),
      updatedAt: new Date().toISOString(),
      customerName: 'خالد المنصوري',
      customerPhone: '+966 50 338 1120',
      businessName: 'صالون لمسة أنيقة',
      category: 'صالون تجميل',
      city: 'جدة',
      country: 'SA',
      address: 'حي الملقا، شارع الأمير تركي، محل 6',
      website: 'https://lamsa-beauty.com',
      phone: '+966 12 661 4400',
      status: 'new',
      suspensionDate: daysAgo(2, 8),
      suspensionMessage: 'Your listing has been suspended for policy violations.',
      previousAppeals: 'ما فيه',
      isStorefront: true,
      customersVisit: true,
      hasSignage: true,
      documents: [
        makeDoc({ name: 'السجل-التجاري.pdf', mimeType: 'application/pdf', size: 380_000, category: 'commercial_reg', status: 'parsed' }),
        makeDoc({ name: 'لافتة-المحل.jpg', mimeType: 'image/jpeg', size: 980_000, category: 'signage', status: 'parsed' }),
        makeDoc({ name: 'فاتورة-كهرباء.pdf', mimeType: 'application/pdf', size: 210_000, category: 'utility', status: 'parsed' }),
      ],
      timeline: [{ at: daysAgo(0, 9), label: 'وصل الطلب من العميل', tone: 'neutral' }],
      fee: 1500,
    },
    {
      id: 'demo_2',
      code: 'MRA-2026-0041',
      createdAt: daysAgo(6, 9),
      updatedAt: daysAgo(0, 10),
      customerName: 'سارة العتيبي',
      customerPhone: '+966 55 214 8890',
      businessName: 'مطعم بيت المندي',
      category: 'مطعم يمني',
      city: 'الرياض',
      country: 'SA',
      address: 'حي النرجس، طريق أنس بن مالك، مبنى 4412 — وحدة 4',
      phone: '+966 11 442 7788',
      gbpProfileId: '1042 7781 3390 5521',
      status: 'appeal_ready',
      riskLevel: 'high',
      confidence: 86,
      suspensionDate: daysAgo(9, 8),
      suspensionMessage: 'Your Business Profile has been suspended due to quality issues. Review the representation guidelines.',
      previousAppeals: 'ما فيه',
      isStorefront: true,
      customersVisit: true,
      hasSignage: false,
      appealAr:
        'السلام عليكم، نطلب إعادة النظر في تعليق نشاطنا. صحّحنا حقل العنوان ليطابق السجل التجاري بالكامل (رقم المبنى والوحدة)، وأرفقنا السجل التجاري وعقد الإيجار وصورًا حديثة للواجهة واللافتة.',
      appealEn:
        'Hello, we kindly request a review of our suspension. We corrected the address field to match our commercial registration (building and unit number) and attached the CR, the lease, and recent photos of the storefront and signage.',
      documents: [
        makeDoc({ name: 'سجل-تجاري.pdf', mimeType: 'application/pdf', size: 412_000, category: 'commercial_reg', status: 'parsed' }),
        makeDoc({ name: 'صورة-الواجهة.jpg', mimeType: 'image/jpeg', size: 1_240_000, category: 'storefront', status: 'parsed' }),
        makeDoc({ name: 'فاتورة-كهرباء.pdf', mimeType: 'application/pdf', size: 228_000, category: 'utility', status: 'parsed' }),
        makeDoc({ name: 'عقد-إيجار.pdf', mimeType: 'application/pdf', size: 610_000, category: 'lease', status: 'parsed' }),
      ],
      timeline: [
        { at: daysAgo(6, 9), label: 'انفتحت القضية', tone: 'neutral' },
        { at: daysAgo(6, 12), label: 'ارتفعت المستندات', tone: 'neutral' },
        { at: daysAgo(5, 14), label: 'خلص التشخيص', tone: 'good' },
        { at: daysAgo(1, 11), label: 'جهزنا الاستئناف', tone: 'neutral' },
      ],
      fee: 1800,
    },
    {
      id: 'demo_3',
      code: 'MRA-2026-0039',
      createdAt: daysAgo(15, 10),
      updatedAt: daysAgo(2, 16),
      customerName: 'منى الحربي',
      customerPhone: '+966 53 771 0042',
      businessName: 'عيادة دنتال كير',
      category: 'عيادة أسنان',
      city: 'الدمام',
      country: 'SA',
      address: 'حي الشاطئ، شارع الأمير سلطان، برج الياقوت، الدور 3',
      phone: '+966 13 882 9900',
      status: 'submitted',
      riskLevel: 'medium',
      confidence: 74,
      suspensionDate: daysAgo(18, 8),
      suspensionMessage: 'We could not verify your business information.',
      previousAppeals: 'ما فيه',
      isStorefront: true,
      customersVisit: true,
      hasSignage: true,
      appealAr: 'نطلب مراجعة تعليق ملف العيادة. أرفقنا السجل التجاري والرخصة وصور الواجهة، والعنوان مطابق تمامًا للمستندات.',
      appealEn: 'We request a review of the clinic suspension. We attached the CR, license and storefront photos; the address matches our documents exactly.',
      appealSubmittedAt: daysAgo(2, 16),
      appealReference: 'GBP-8842-1193',
      documents: [
        makeDoc({ name: 'رخصة-البلدية.pdf', mimeType: 'application/pdf', size: 300_000, category: 'license', status: 'parsed' }),
        makeDoc({ name: 'واجهة-العيادة.jpg', mimeType: 'image/jpeg', size: 1_100_000, category: 'storefront', status: 'parsed' }),
      ],
      timeline: [
        { at: daysAgo(15, 10), label: 'انفتحت القضية', tone: 'neutral' },
        { at: daysAgo(14, 12), label: 'خلص التشخيص', tone: 'good' },
        { at: daysAgo(4, 11), label: 'جهزنا الاستئناف', tone: 'neutral' },
        { at: daysAgo(2, 16), label: 'انقدّم الاستئناف', tone: 'warn' },
      ],
      fee: 2200,
    },
  ];
}

function demoUsage(): UsageEntry[] {
  const rows: UsageEntry[] = [];
  const models = ['google/gemini-3.8-flash', 'openai/gpt-6.1-sol', 'anthropic/claude-sonnet-5'];
  const tasks = ['gbp-diagnosis', 'appeal-generation', 'document-analysis', 'case-summary'] as const;
  for (let d = 6; d >= 0; d -= 1) {
    for (let k = 0; k < 2 + ((d * 3) % 4); k += 1) {
      const prompt = 1500 + ((d * 211 + k * 97) % 3200);
      const completion = 500 + ((d * 131 + k * 53) % 1500);
      const model = models[(d + k) % models.length];
      rows.push({
        id: `d_${d}_${k}`,
        at: daysAgo(d, 9 + (k % 8)),
        task: tasks[(d + k) % tasks.length],
        model,
        requestedModel: model,
        fallbackUsed: false,
        promptTokens: prompt,
        completionTokens: completion,
        totalTokens: prompt + completion,
        costUsd: Number(((prompt / 1e6) * 1.2 + (completion / 1e6) * 5).toFixed(5)),
        latencyMs: 1600 + ((d * 71 + k * 137) % 2600),
        status: 'ok',
        source: 'server',
      });
    }
  }
  return rows;
}

export function startDemo() {
  if (typeof window === 'undefined') return null;
  const cases = demoCases();
  setCases(cases);
  try {
    window.localStorage.setItem('mra.usage.v3', JSON.stringify(demoUsage()));
    window.localStorage.setItem(DEMO_KEY, '1');
    window.dispatchEvent(new Event('mra:store'));
  } catch {
    /* ignore */
  }
  return cases[0];
}

export function stopDemo() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEMO_KEY);
    window.localStorage.setItem('mra.cases.v3', '[]');
    window.localStorage.setItem('mra.usage.v3', '[]');
    window.dispatchEvent(new Event('mra:store'));
  } catch {
    /* ignore */
  }
}

export function demoCaseCount() {
  return getCases().length;
}
