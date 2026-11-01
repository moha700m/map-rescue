'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Gauge,
  History,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  Zap,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import ModelSelect from '@/components/ai/ModelSelect';
import { Field, PageHeader, Progress, SectionCard, Stat, Tabs } from '@/components/ui/primitives';
import { HBar, Ring, UsageBars } from '@/components/ui/charts';
import { AI_TASKS, TASK_LIST, type AiTaskId } from '@/lib/ai/tasks';
import type { AiSettings } from '@/lib/ai/config';
import { DEFAULT_AI_SETTINGS } from '@/lib/ai/config';
import type { AiHealth, TestResult, UsagePayload } from '@/lib/ai/contracts';
import type { ModelInfo } from '@/lib/ai/models';
import { contextLabel, pricePerMillion } from '@/lib/ai/models';
import {
  fetchSettings,
  fetchUsage,
  getHealth,
  listModels,
  refreshHealth,
  removeApiKey,
  saveApiKey,
  saveSettings,
  testConnection,
} from '@/lib/client/ai';
import { toast } from '@/lib/client/toast';
import { TASK_LABEL } from '@/lib/constants';
import { cn, formatDateTime, formatTokens, formatUsd, timeAgo } from '@/lib/utils';

type TabKey = 'connection' | 'models' | 'usage' | 'history' | 'errors' | 'budget';

const TAB_LIST: { value: TabKey; label: string; icon: typeof KeyRound }[] = [
  { value: 'connection', label: 'الاتصال', icon: KeyRound },
  { value: 'models', label: 'النماذج', icon: Layers },
  { value: 'usage', label: 'الاستخدام', icon: Activity },
  { value: 'history', label: 'سجل الطلبات', icon: History },
  { value: 'errors', label: 'الأخطاء', icon: AlertOctagon },
  { value: 'budget', label: 'الميزانية', icon: Wallet },
];

export default function AiSettingsPage() {
  const [tab, setTab] = useState<TabKey>('connection');
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [draft, setDraft] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [catalogMeta, setCatalogMeta] = useState<{ source: 'live' | 'snapshot'; fetchedAt: string; error?: string } | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [modelQuery, setModelQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'ok' | 'error'>('all');

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  const loadAll = useCallback(async () => {
    const [h, s, c] = await Promise.all([getHealth(), fetchSettings(), listModels()]);
    setHealth(h);
    setSettings(s);
    setDraft(s);
    setModels(c.models);
    setCatalogMeta({ source: c.source, fetchedAt: c.fetchedAt, error: c.error });
    setLoadingModels(false);
    fetchUsage(14)
      .then(setUsage)
      .catch(() => undefined)
      .finally(() => setLoadingUsage(false));
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as TabKey;
    if (TAB_LIST.some((t) => t.value === hash)) setTab(hash);
    loadAll();
  }, [loadAll]);

  const refresh = useCallback(
    async (force = false) => {
      const [h, c] = await Promise.all([refreshHealth(), listModels(force)]);
      setHealth(h);
      setModels(c.models);
      setCatalogMeta({ source: c.source, fetchedAt: c.fetchedAt, error: c.error });
      fetchUsage(14).then(setUsage).catch(() => undefined);
    },
    [],
  );

  async function handleSave() {
    setBusy('save');
    try {
      const next = await saveSettings(draft);
      setSettings(next);
      setDraft(next);
      toast('تم حفظ الإعدادات', { description: 'تُطبَّق فورًا دون إعادة نشر.', tone: 'success' });
    } catch (err) {
      toast('تعذّر الحفظ', { description: err instanceof Error ? err.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveKey() {
    if (keyInput.trim().length < 20) {
      toast('مفتاح غير صالح', { description: 'الصق مفتاح OpenRouter كاملًا (يبدأ عادة بـ sk-or-).', tone: 'error' });
      return;
    }
    setBusy('key');
    try {
      const res = await saveApiKey(keyInput);
      setKeyInput('');
      await refresh();
      toast('تم حفظ المفتاح', { description: `${res.fingerprint} · ${res.mode === 'server' ? 'على الخادم' : 'محليًا في المتصفح'}`, tone: 'success' });
    } catch (err) {
      toast('فشل حفظ المفتاح', { description: err instanceof Error ? err.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function handleRemoveKey() {
    setBusy('remove');
    try {
      await removeApiKey();
      await refresh();
      toast('تم حذف المفتاح', { tone: 'warn' });
    } finally {
      setBusy(null);
    }
  }

  async function handleTest() {
    setBusy('test');
    setTest(null);
    try {
      const res = await testConnection({ model: draft.defaultModel });
      setTest(res);
      toast(res.ok ? 'الاتصال يعمل' : 'فشل الاختبار', { description: res.ok ? `${res.model}` : res.error, tone: res.ok ? 'success' : 'error' });
    } catch (err) {
      toast('فشل الاختبار', { description: err instanceof Error ? err.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    const list = q ? models.filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(q)) : models;
    return list.slice(0, 40);
  }, [models, modelQuery]);

  const totals = usage?.summary.totals;
  const budgetPct = usage?.budget.pct ?? 0;
  const presetCards: { key: keyof AiSettings; label: string; hint: string; tone: 'brand' | 'mint' | 'amber' | 'sky' }[] = [
    { key: 'defaultModel', label: 'النموذج الافتراضي', hint: 'يُستخدم إن لم تُحدَّد مهمة', tone: 'brand' },
    { key: 'fallbackModel', label: 'النموذج الاحتياطي', hint: 'يُستدعى تلقائيًا عند فشل الأساسي', tone: 'amber' },
    { key: 'visionModel', label: 'نموذج الصور والملفات', hint: 'لتحليل المستندات وOCR', tone: 'sky' },
    { key: 'longContextModel', label: 'نموذج السياق الطويل', hint: 'للملفات والعقود الكبيرة', tone: 'mint' },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI gateway · openrouter"
        title="إعدادات الذكاء الاصطناعي"
        description="المصدر الوحيد لكل عمليات AI: الاتصال، النماذج، التوجيه، الاستخدام، التكلفة، والسجل — دون إعادة نشر."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => refresh(true)}>
              <RefreshCw size={15} /> تحديث
            </button>
            <button type="button" className="btn-ghost" onClick={handleTest} disabled={busy === 'test'}>
              {busy === 'test' ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              اختبار الاتصال
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!dirty || busy === 'save'}>
              {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {dirty ? 'حفظ التغييرات' : 'محفوظ'}
            </button>
          </>
        }
      />

      <div className="card mb-3 flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', health?.key.present ? 'bg-mint-400 animate-pulse-ring' : 'bg-rosex-400')} />
          <span className="text-xs font-bold text-slate-100">
            {health?.key.present ? 'OpenRouter متصل' : 'غير متصل — أضف المفتاح'}
          </span>
        </div>
        <span className="badge-muted">
          <Server size={10} /> {health?.mode === 'server' ? 'نمط الخادم' : 'نمط مباشر (متصفح)'}
        </span>
        <span className="badge-brand">
          <Cpu size={10} /> {draft.defaultModel}
        </span>
        <span className="badge-muted">
          <Layers size={10} /> {models.length} نموذج · {catalogMeta?.source === 'live' ? 'كتالوج حي' : 'لقطة محلية'}
        </span>
        <span className="ms-auto num text-[11px] text-slate-500">
          {totals ? `${formatTokens(totals.totalTokens)} رمز · ${formatUsd(totals.costUsd)} هذا الشهر` : '—'}
        </span>
      </div>

      <div className="mb-3">
        <Tabs tabs={TAB_LIST.map((t) => ({ ...t, count: t.value === 'errors' ? usage?.summary.totals.errors : undefined }))} value={tab} onChange={setTab} />
      </div>

      {tab === 'connection' ? (
        <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
          <SectionCard title="حالة الاتصال" description="OpenRouter هو المزوّد الوحيد لكل طلبات الذكاء الاصطناعي">
            <div className="rounded-2xl border border-line/70 bg-gradient-to-br from-brand-500/[0.08] via-transparent to-transparent p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-300">Gateway</p>
                  <p className="mt-1 text-lg font-bold text-white">OpenRouter API v1</p>
                  <p className="num mt-0.5 text-[11px] text-slate-500" dir="ltr">
                    POST https://openrouter.ai/api/v1/chat/completions
                  </p>
                </div>
                <span className={health?.key.present ? 'badge-mint' : 'badge-rose'}>
                  {health?.key.present ? <CheckCircle2 size={10} /> : <TriangleAlert size={10} />}
                  {health?.key.present ? 'جاهز' : 'مفتاح مفقود'}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-line/60 bg-ink-900/60 p-2.5">
                  <p className="text-[10px] text-slate-500">نمط التشغيل</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-200">
                    {health?.mode === 'server' ? 'خادم — المفتاح مخفي' : 'مباشر — المفتاح محلي'}
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-ink-900/60 p-2.5">
                  <p className="text-[10px] text-slate-500">مصدر المفتاح</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-200">
                    {health?.key.source === 'env' ? 'متغير بيئة' : health?.key.source === 'stored' ? 'مخزّن مشفّرًا' : 'غير مضبوط'}
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-ink-900/60 p-2.5">
                  <p className="text-[10px] text-slate-500">البصمة</p>
                  <p className="num mt-0.5 truncate text-xs font-semibold text-slate-200" dir="ltr">
                    {health?.key.fingerprint ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {test ? (
              <div className="mt-3 space-y-2">
                {test.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-line/60 bg-ink-900/50 p-2.5">
                    {step.ok ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-mint-400" />
                    ) : (
                      <AlertOctagon size={14} className="mt-0.5 shrink-0 text-rosex-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-200">{step.name}</p>
                      <p className="text-[10px] text-slate-500" dir="auto">
                        {step.detail}
                      </p>
                    </div>
                    {step.ms ? <span className="num text-[10px] text-slate-600">{step.ms}ms</span> : null}
                  </div>
                ))}
                {test.ok ? (
                  <div className="rounded-lg border border-mint-500/25 bg-mint-500/[0.06] p-2.5 text-[11px] text-mint-300">
                    نجح الاختبار في {test.latencyMs}ms — النموذج: <span className="num">{test.model}</span>
                    {test.key?.limit ? ` · حد الحساب ${formatUsd(test.key.limit)}` : ''}
                  </div>
                ) : (
                  <div className="rounded-lg border border-rosex-500/25 bg-rosex-500/[0.06] p-2.5 text-[11px] text-rosex-300">{test.error}</div>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-ink-900/40 p-4 text-center">
                <Zap size={18} className="mx-auto text-slate-500" />
                <p className="mt-1.5 text-[11px] text-slate-400">لم يُجرَ اختبار بعد — اضغط «اختبار الاتصال» للتحقق من المفتاح والنموذج.</p>
              </div>
            )}
          </SectionCard>

          <div className="space-y-3">
            <SectionCard title="مفتاح API" description="يُشفّر بـ AES-256-GCM على الخادم، ولا يظهر في الواجهة">
              <Field label="مفتاح OpenRouter" hint="احصل عليه من openrouter.ai/keys — لا تشاركه في أي مكان آخر">
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="sk-or-v1-…"
                    dir="ltr"
                    autoComplete="off"
                    className="input flex-1 font-mono text-xs"
                  />
                  <button type="button" className="btn-primary shrink-0" onClick={handleSaveKey} disabled={busy === 'key'}>
                    {busy === 'key' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    حفظ
                  </button>
                </div>
              </Field>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                <span className="num text-[10px] text-slate-500" dir="ltr">
                  {health?.key.fingerprint ?? 'لا مفتاح محفوظ'}
                </span>
                <button type="button" className="text-[10px] font-semibold text-rosex-400 hover:text-rosex-300" onClick={handleRemoveKey}>
                  حذف المفتاح
                </button>
              </div>
              {health?.mode === 'direct' ? (
                <p className="mt-2 rounded-lg border border-amberx-500/25 bg-amberx-500/[0.06] p-2.5 text-[10px] leading-relaxed text-amberx-300">
                  هذه نسخة معاينة ثابتة (GitHub Pages): يُخزَّن المفتاح في هذا المتصفح فقط ويُرسل مباشرة إلى OpenRouter. للنشر الإنتاجي استخدم نمط الخادم
                  على Vercel ليظل المفتاح سريًا.
                </p>
              ) : (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-600">
                  <ShieldCheck size={11} className="mt-0.5 shrink-0 text-mint-400" />
                  في نمط الخادم لا يعود المفتاح إلى المتصفح أبدًا؛ كل الطلبات تُنفَّذ server-side.
                </p>
              )}
            </SectionCard>

            <SectionCard title="حدود الحساب" description="من نقطة /key الرسمية">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <span className="text-[11px] text-slate-400">الاستهلاك الكلي</span>
                  <span className="num text-[11px] text-slate-200">{test?.key?.usage != null ? formatUsd(test.key.usage) : '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <span className="text-[11px] text-slate-400">الحد الأقصى</span>
                  <span className="num text-[11px] text-slate-200">{test?.key?.limit != null ? formatUsd(test.key.limit) : 'غير محدود'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                  <span className="text-[11px] text-slate-400">نوع الحساب</span>
                  <span className="text-[11px] text-slate-200">{test?.key?.isFreeTier ? 'مجاني' : 'مدفوع'}</span>
                </div>
                <p className="text-[10px] text-slate-600">اضغط «اختبار الاتصال» لتحديث هذه القيم.</p>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'models' ? (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {presetCards.map((card) => (
              <div key={card.key} className="card p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-200">{card.label}</p>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      card.tone === 'brand' ? 'bg-brand-400' : card.tone === 'amber' ? 'bg-amberx-400' : card.tone === 'sky' ? 'bg-skyx-400' : 'bg-mint-400',
                    )}
                  />
                </div>
                <ModelSelect
                  value={String(draft[card.key])}
                  onChange={(id) => setDraft((prev) => ({ ...prev, [card.key]: id }))}
                  models={models}
                  loading={loadingModels}
                  compact
                />
                <p className="mt-1 text-[10px] text-slate-500">{card.hint}</p>
              </div>
            ))}
          </div>

          <SectionCard
            title="توجيه المهام"
            description="لكل مهمة نموذجها — اتركه فارغًا لاستخدام الافتراضي"
            action={<span className="text-[10px] text-slate-500">{TASK_LIST.length} مهمة</span>}
          >
            <div className="grid gap-2 lg:grid-cols-2">
              {TASK_LIST.map((task) => {
                const override = draft.taskModels[task.id];
                const effective = override || draft.defaultModel;
                const info = models.find((m) => m.id === effective);
                const needsMedia = task.needs.includes('image') || task.needs.includes('file');
                const supportsMedia = needsMedia
                  ? task.needs.filter((n) => n === 'image' || n === 'file').every((n) => info?.inputModalities.includes(n as 'image' | 'file'))
                  : true;
                return (
                  <div key={task.id} className="rounded-xl border border-line/70 bg-ink-900/40 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-slate-200">{task.titleAr}</p>
                        <p className="truncate text-[10px] text-slate-500">{task.descAr}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => {
                            const next = { ...prev.taskModels };
                            if (next[task.id]) delete next[task.id];
                            else next[task.id] = prev.defaultModel;
                            return { ...prev, taskModels: next };
                          })
                        }
                        className={cn('badge shrink-0 transition-colors', override ? 'badge-brand' : 'badge-muted')}
                      >
                        {override ? 'مخصص' : 'افتراضي'}
                      </button>
                    </div>
                    <ModelSelect
                      value={effective}
                      onChange={(id) => setDraft((prev) => ({ ...prev, taskModels: { ...prev.taskModels, [task.id]: id } }))}
                      models={models}
                      loading={loadingModels}
                      compact
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="badge-muted">{task.output === 'json' ? 'JSON' : task.output === 'markdown' ? 'Markdown' : 'نص'}</span>
                      {task.needs
                        .filter((n) => n !== 'text')
                        .map((n) => (
                          <span key={n} className={supportsMedia ? 'badge-mint' : 'badge-rose'}>
                            {n === 'image' ? 'صور' : 'ملفات'}
                          </span>
                        ))}
                      {!supportsMedia ? <span className="text-[10px] font-semibold text-rosex-400">النموذج لا يدعم الوسائط المطلوبة</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="كتالوج النماذج"
            description={catalogMeta?.source === 'live' ? `حي من OpenRouter · ${formatDateTime(catalogMeta.fetchedAt)}` : 'لقطة محلية — تعذّر الوصول للكتالوج الحي'}
            action={
              <button type="button" className="btn-subtle btn-sm" onClick={() => refresh(true)}>
                <RefreshCw size={12} /> تحديث الكتالوج
              </button>
            }
          >
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-line bg-ink-900/70 px-3">
              <Search size={14} className="text-slate-500" />
              <input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="ابحث في النماذج…"
                className="h-9 flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-600">{models.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>النموذج</th>
                    <th>السياق</th>
                    <th>الإدخال</th>
                    <th>السعر / مليون</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((m) => {
                    const price = pricePerMillion(m);
                    const active = m.id === draft.defaultModel;
                    return (
                      <tr key={m.id}>
                        <td>
                          <p className="num text-[11px] font-semibold text-slate-200" dir="ltr">
                            {m.id}
                          </p>
                          <p className="text-[10px] text-slate-500">{m.name}</p>
                        </td>
                        <td className="num text-[11px]">{contextLabel(m.contextLength)}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {m.inputModalities.map((mod) => (
                              <span
                                key={mod}
                                className={cn(
                                  'rounded px-1 py-0.5 text-[9px] font-semibold',
                                  mod === 'image' ? 'bg-skyx-500/15 text-skyx-400' : mod === 'file' ? 'bg-mint-500/15 text-mint-400' : 'bg-white/5 text-slate-500',
                                )}
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="num text-[10px] text-slate-400">
                          ${price.prompt} / ${price.completion}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setDraft((prev) => ({ ...prev, defaultModel: m.id }))}
                            className={cn('btn-sm', active ? 'btn-subtle text-mint-400' : 'btn-ghost')}
                          >
                            {active ? 'الافتراضي' : 'تعيين'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'usage' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            <Stat label="الطلبات" value={totals?.requests ?? 0} icon={Activity} tone="brand" hint={`${totals?.ok ?? 0} ناجح`} />
            <Stat label="الرموز" value={formatTokens(totals?.totalTokens ?? 0)} icon={Cpu} tone="sky" hint={`${formatTokens(totals?.promptTokens ?? 0)} إدخال`} />
            <Stat label="التكلفة" value={formatUsd(totals?.costUsd ?? 0)} icon={Wallet} tone="amber" hint="تقديري من أسعار الكتالوج" />
            <Stat label="متوسط الزمن" value={`${((totals?.avgLatencyMs ?? 0) / 1000).toFixed(1)}s`} icon={Gauge} tone="mint" hint="لكل طلب" />
            <Stat label="نسبة الأخطاء" value={`${totals?.errorRate ?? 0}%`} icon={AlertOctagon} tone="rose" hint={`${totals?.errors ?? 0} خطأ`} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard
              title="الاستهلاك اليومي"
              description="آخر 14 يومًا"
              action={
                <button type="button" className="btn-subtle btn-sm" onClick={() => fetchUsage(14).then(setUsage)}>
                  <RefreshCw size={12} /> تحديث
                </button>
              }
            >
              {loadingUsage ? <div className="skeleton h-[150px]" /> : usage ? <UsageBars data={usage.summary.byDay} height={150} /> : null}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
                <div>
                  <p className="text-[10px] text-slate-500">أعلى يوم</p>
                  <p className="num text-xs font-bold text-slate-200">
                    {formatTokens(Math.max(...(usage?.summary.byDay.map((d) => d.tokens) ?? [0])))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">متوسط يومي</p>
                  <p className="num text-xs font-bold text-slate-200">
                    {formatTokens(Math.round((totals?.totalTokens ?? 0) / 14))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">تكلفة/طلب</p>
                  <p className="num text-xs font-bold text-slate-200">
                    {formatUsd(totals && totals.requests ? totals.costUsd / totals.requests : 0, 4)}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="الميزانية الشهرية" description={`${formatUsd(usage?.budget.spentUsd ?? 0)} من ${formatUsd(usage?.budget.monthlyBudgetUsd ?? 0)}`}>
              <div className="flex items-center gap-4">
                <Ring value={budgetPct} size={92} tone={budgetPct > 85 ? 'rose' : budgetPct > 60 ? 'amber' : 'brand'} sublabel="مستخدم" />
                <div className="flex-1 space-y-2">
                  <Progress value={budgetPct} tone={budgetPct > 85 ? 'rose' : budgetPct > 60 ? 'amber' : 'brand'} />
                  <p className="text-[10px] text-slate-500">
                    المتبقي: <span className="num text-slate-200">{formatUsd(Math.max(0, (usage?.budget.monthlyBudgetUsd ?? 0) - (usage?.budget.spentUsd ?? 0)))}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">التنبيه عند {draft.alertThresholdPct}%</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <p className="section-title">أعلى النماذج</p>
                <HBar
                  items={(usage?.summary.byModel.slice(0, 4) ?? []).map((m) => ({ label: m.model.split('/')[1] ?? m.model, value: m.requests, tone: 'brand' }))}
                  formatter={(n) => `${n}`}
                />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="التوزيع حسب المهمة" description="أين يذهب استهلاكك">
            {usage?.summary.byTask.length ? (
              <HBar
                items={usage.summary.byTask.map((t) => ({ label: TASK_LABEL[t.task] ?? t.task, value: t.tokens, tone: 'mint' }))}
                formatter={(n) => formatTokens(n)}
              />
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">لا استهلاك مسجّل</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'history' ? (
        <SectionCard
          title="سجل الطلبات"
          description="كل استدعاء إلى OpenRouter موثّق بالرموز والتكلفة والزمن"
          action={
            <div className="flex items-center gap-1.5">
              {(['all', 'ok', 'error'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setHistoryFilter(f)}
                  className={cn('badge transition-colors', historyFilter === f ? 'badge-brand' : 'badge-muted')}
                >
                  {f === 'all' ? 'الكل' : f === 'ok' ? 'ناجح' : 'خطأ'}
                </button>
              ))}
            </div>
          }
          bodyClassName="p-0"
        >
          {usage?.rows.length ? (
            <div className="max-h-[560px] overflow-auto">
              <table className="table">
                <thead className="sticky top-0 bg-ink-850">
                  <tr>
                    <th>الوقت</th>
                    <th>المهمة</th>
                    <th>النموذج</th>
                    <th>الرموز</th>
                    <th>التكلفة</th>
                    <th>الزمن</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.rows
                    .filter((r) => (historyFilter === 'all' ? true : r.status === historyFilter))
                    .slice(0, 80)
                    .map((r) => (
                      <tr key={r.id}>
                        <td className="num whitespace-nowrap text-[10px] text-slate-500">{formatDateTime(r.at)}</td>
                        <td className="whitespace-nowrap text-[11px] text-slate-300">{TASK_LABEL[r.task] ?? r.task}</td>
                        <td>
                          <span className="num text-[10px] text-slate-400" dir="ltr">
                            {r.model}
                          </span>
                          {r.fallbackUsed ? <span className="badge-amber ms-1">احتياطي</span> : null}
                        </td>
                        <td className="num text-[10px] text-slate-400">{formatTokens(r.totalTokens)}</td>
                        <td className="num text-[10px] text-slate-400">{formatUsd(r.costUsd, 4)}</td>
                        <td className="num text-[10px] text-slate-400">{r.latencyMs}ms</td>
                        <td>
                          <span className={r.status === 'ok' ? 'badge-mint' : 'badge-rose'}>{r.status === 'ok' ? 'ناجح' : 'خطأ'}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <History size={22} className="mx-auto text-slate-600" />
              <p className="mt-2 text-xs text-slate-500">لا طلبات مسجّلة بعد.</p>
              <button type="button" className="btn-ghost btn-sm mt-3" onClick={handleTest}>
                <Zap size={12} /> تسجيل أول طلب (اختبار)
              </button>
            </div>
          )}
        </SectionCard>
      ) : null}

      {tab === 'errors' ? (
        <SectionCard title="سجل الأخطاء" description="آخر الأخطاء مع الرمز والتوجيه">
          {usage?.summary.errors.length ? (
            <div className="space-y-2">
              {usage.summary.errors.map((err) => (
                <div key={err.id} className="rounded-xl border border-rosex-500/20 bg-rosex-500/[0.04] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-rose">{err.errorCode || `http_${err.httpStatus}`}</span>
                    <span className="num text-[10px] text-slate-400" dir="ltr">
                      {err.model}
                    </span>
                    <span className="num ms-auto text-[10px] text-slate-600">{formatDateTime(err.at)}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300" dir="auto">
                    {err.errorMessage}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {err.httpStatus === 401
                      ? 'المفتاح غير صالح — حدّثه من تبويب الاتصال.'
                      : err.httpStatus === 402
                        ? 'الرصيد غير كافٍ — أضف رصيدًا إلى OpenRouter.'
                        : err.httpStatus === 429
                          ? 'تجاوز حد الطلبات — أعد المحاولة أو فعّل النموذج الاحتياطي.'
                          : 'راجع النموذج أو المرفقات ثم أعد المحاولة.'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-ink-900/40 p-8 text-center">
              <CheckCircle2 size={22} className="mx-auto text-mint-400" />
              <p className="mt-2 text-xs text-slate-400">لا أخطاء مسجّلة — كل الطلبات ناجحة.</p>
            </div>
          )}
        </SectionCard>
      ) : null}

      {tab === 'budget' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard title="ضبط التكلفة والسلوك" description="يُطبَّق على كل المهام">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="الميزانية الشهرية (USD)">
                <input
                  type="number"
                  className="input"
                  value={draft.monthlyBudgetUsd}
                  onChange={(e) => setDraft((p) => ({ ...p, monthlyBudgetUsd: Number(e.target.value) }))}
                />
              </Field>
              <Field label="حد التنبيه (%)">
                <input
                  type="number"
                  className="input"
                  value={draft.alertThresholdPct}
                  onChange={(e) => setDraft((p) => ({ ...p, alertThresholdPct: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Temperature" hint="0 = حتمي، 1.5 = إبداعي">
                <input
                  type="number"
                  step="0.05"
                  className="input"
                  value={draft.temperature}
                  onChange={(e) => setDraft((p) => ({ ...p, temperature: Number(e.target.value) }))}
                />
              </Field>
              <Field label="أقصى رموز للإخراج">
                <input
                  type="number"
                  className="input"
                  value={draft.maxTokens}
                  onChange={(e) => setDraft((p) => ({ ...p, maxTokens: Number(e.target.value) }))}
                />
              </Field>
            </div>

            <div className="mt-3 space-y-2">
              {[
                { key: 'autoFallback' as const, label: 'التحويل التلقائي للنموذج الاحتياطي', desc: 'عند فشل النموذج الأساسي (429/5xx).' },
                { key: 'requireConfirmation' as const, label: 'تأكيد قبل أي إجراء خارجي', desc: 'لا استئناف أو تعديل تلقائي على Google.' },
                { key: 'logPrompts' as const, label: 'تسجيل الحمولات الكاملة', desc: 'يحفظ نص الإدخال في السجل (حساس — للمراجعة فقط).' },
              ].map((toggle) => (
                <button
                  key={toggle.key}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-line/70 bg-ink-900/50 p-3 text-start"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-slate-200">{toggle.label}</span>
                    <span className="block text-[10px] text-slate-500">{toggle.desc}</span>
                  </span>
                  <span
                    className={cn(
                      'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
                      draft[toggle.key] ? 'bg-brand-500' : 'bg-white/10',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                        draft[toggle.key] ? 'start-4' : 'start-0.5',
                      )}
                    />
                  </span>
                </button>
              ))}
            </div>

            <button type="button" className="btn-primary mt-3 w-full justify-center" onClick={handleSave} disabled={!dirty || busy === 'save'}>
              <Save size={14} /> حفظ الإعدادات
            </button>
          </SectionCard>

          <SectionCard title="تقدير التكلفة" description="بناءً على متوسط 2500 رمز إدخال و900 رمز إخراج لكل طلب">
            <div className="space-y-1.5">
              {[draft.defaultModel, draft.fallbackModel, draft.visionModel, draft.economyModel]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((id) => {
                  const model = models.find((m) => m.id === id);
                  const price = pricePerMillion(model);
                  const per1k = ((2500 * price.prompt + 900 * price.completion) / 1_000_000) * 1000;
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-ink-900/50 px-2.5 py-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300" dir="ltr">
                        {id}
                      </span>
                      <span className="num text-[11px] font-semibold text-slate-100">{formatUsd(per1k, 2)}</span>
                      <span className="text-[9px] text-slate-600">/1000 طلب</span>
                    </div>
                  );
                })}
              <div className="mt-2 rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-300">
                  <Sparkles size={11} /> باقة مقترحة
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  نموذج سريع متعدد الوسائط للمهام اليومية (Gemini Flash)، ونموذج استدلالي للاستئنافات الحساسة (GPT-6.1 / Claude Sonnet)، مع تحويل تلقائي عند
                  الفشل — الكلفة المتوقعة أقل من {formatUsd((usage?.budget.spentUsd ?? 0) || 20, 0)} شهريًا لـ 500 قضية.
                </p>
              </div>
              <div className="rounded-xl border border-line/60 bg-ink-900/40 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <BrainCircuit size={11} /> حدود الاستخدام الحالية
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  OpenRouter يفرض حدودًا حسب الرصيد والحساب. عند 429 يفعّل النظام النموذج الاحتياطي تلقائيًا إذا كان الخيار مفعّلًا.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="lg:col-span-2" title="ملاحظات النشر" description="لماذا يهم نمط التشغيل">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { t: 'خادم (Vercel)', d: 'المفتاح في متغيرات البيئة، يبقى سريًا. الإعدادات تُحفظ في .data أو Supabase.' },
                { t: 'معاينة GitHub Pages', d: 'لا يوجد خادم — الطلبات تُنفَّذ من المتصفح بمفتاح محلي. مناسبة للتجربة فقط.' },
                { t: 'إنتاج + Supabase', d: 'AI_STORAGE=supabase لضمان استمرار الإعدادات والسجل بين النشرات.' },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-line/60 bg-ink-900/50 p-3">
                  <p className="text-[11px] font-bold text-slate-200">{x.t}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{x.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line/60 bg-ink-900/40 p-3">
              <span className="text-[10px] text-slate-500">آخر اختبار: {test ? timeAgo(new Date().toISOString()) : 'لم يُجرَ'}</span>
              <Link href="/settings" className="btn-ghost btn-sm">
                إعدادات النظام
              </Link>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </AppShell>
  );
}
