'use client';

import { AlertOctagon, ArrowLeft, CheckCircle2, Copy, FileWarning, ListChecks, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

type Dict = Record<string, unknown>;

function isDict(v: unknown): v is Dict {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function TextBlock({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{children}</p>;
}

function CopyMini({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-slate-400 transition-colors hover:text-slate-200"
    >
      {done ? <CheckCircle2 size={10} className="text-mint-400" /> : <Copy size={10} />}
      {done ? 'تم' : 'نسخ'}
    </button>
  );
}

function Chips({ items, tone = 'muted' }: { items: string[]; tone?: 'muted' | 'rose' | 'amber' }) {
  const cls = tone === 'rose' ? 'badge-rose' : tone === 'amber' ? 'badge-amber' : 'badge-muted';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className={cls}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Block({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line/80 bg-ink-850/50 p-3.5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {Icon ? <Icon size={12} /> : null}
        {title}
      </h4>
      {children}
    </section>
  );
}

function DiagnosisView({ data }: { data: Dict }) {
  const root = isDict(data.rootCause) ? data.rootCause : {};
  const plan = asArray(data.recoveryPlan);
  const violations = asArray(data.policyViolations);
  const appeal = isDict(data.appealDraft) ? data.appealDraft : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-3.5">
        <div className="mb-1 flex items-center gap-2">
          <ShieldAlert size={14} className="text-brand-300" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-300">السبب الأرجح</span>
          <span className="num ms-auto rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-brand-200">
            ثقة {asString(data.confidence ?? root.confidence)}%
          </span>
        </div>
        <p className="text-sm font-semibold text-white">{asString(root.label) || 'غير محدد'}</p>
        {asString(root.sourcePolicy) ? (
          <p className="mt-1 text-[11px] text-slate-400">السياسة المرجعية: {asString(root.sourcePolicy)}</p>
        ) : null}
        {asArray(root.evidence).length ? (
          <ul className="mt-2 space-y-1">
            {asArray(root.evidence).map((e, i) => (
              <li key={i} className="flex gap-1.5 text-[12px] text-slate-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {asString(e)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {asString(data.summary) ? (
        <Block title="الملخص التنفيذي">
          <TextBlock>{asString(data.summary)}</TextBlock>
        </Block>
      ) : null}

      {violations.length ? (
        <Block title="المخالفات المحتملة" icon={AlertOctagon}>
          <div className="space-y-2">
            {violations.map((v, i) => {
              const item = isDict(v) ? v : {};
              return (
                <div key={i} className="rounded-lg border border-line/60 bg-ink-900/60 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-200">{asString(item.policy)}</p>
                    <span
                      className={
                        asString(item.riskLevel) === 'high'
                          ? 'badge-rose'
                          : asString(item.riskLevel) === 'medium'
                            ? 'badge-amber'
                            : 'badge-mint'
                      }
                    >
                      {asString(item.riskLevel) === 'high' ? 'مرتفع' : asString(item.riskLevel) === 'medium' ? 'متوسط' : 'منخفض'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{asString(item.explanation)}</p>
                </div>
              );
            })}
          </div>
        </Block>
      ) : null}

      {asArray(data.missingDocuments).length ? (
        <Block title="مستندات مطلوبة" icon={FileWarning}>
          <Chips items={asArray(data.missingDocuments).map(asString)} tone="amber" />
        </Block>
      ) : null}

      {asString(data.recommendedCorrection) ? (
        <Block title="الإجراء التصحيحي">
          <TextBlock>{asString(data.recommendedCorrection)}</TextBlock>
        </Block>
      ) : null}

      {plan.length ? (
        <Block title="خطة الاسترداد" icon={ListChecks}>
          <ol className="space-y-2">
            {plan.map((p, i) => {
              const step = isDict(p) ? p : {};
              return (
                <li key={i} className="flex gap-2.5">
                  <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-500/15 text-[10px] font-bold text-brand-200">
                    {asString(step.step ?? i + 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{asString(step.title)}</p>
                    <p className="text-[11px] leading-relaxed text-slate-400">{asString(step.detail)}</p>
                    <span className="mt-1 inline-block rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
                      {asString(step.owner) === 'owner' ? 'المالك' : asString(step.owner) === 'google' ? 'Google' : 'الوكالة'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Block>
      ) : null}

      {appeal ? (
        <Block title="مسودة الاستئناف">
          <div className="grid gap-2.5">
            {asString(appeal.ar) ? (
              <div className="rounded-lg border border-line/60 bg-ink-900/60 p-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">العربية</span>
                  <CopyMini text={asString(appeal.ar)} />
                </div>
                <TextBlock>{asString(appeal.ar)}</TextBlock>
              </div>
            ) : null}
            {asString(appeal.en) ? (
              <div className="rounded-lg border border-line/60 bg-ink-900/60 p-2.5" dir="ltr">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">English</span>
                  <CopyMini text={asString(appeal.en)} />
                </div>
                <p className="whitespace-pre-wrap text-start text-[13px] leading-relaxed text-slate-300">
                  {asString(appeal.en)}
                </p>
              </div>
            ) : null}
          </div>
        </Block>
      ) : null}

      {asString(data.disclaimer) ? <p className="text-[10px] text-slate-600">{asString(data.disclaimer)}</p> : null}
    </div>
  );
}

function DocumentsView({ data }: { data: Dict }) {
  const docs = asArray(data.documents);
  const coverage = isDict(data.coverage) ? data.coverage : null;
  return (
    <div className="space-y-3">
      <Block title="تقييم المستندات">
        <div className="space-y-2">
          {docs.map((d, i) => {
            const doc = isDict(d) ? d : {};
            const match = asString(doc.businessNameMatch);
            return (
              <div key={i} className="rounded-lg border border-line/60 bg-ink-900/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-200">{asString(doc.name) || `مستند ${i + 1}`}</p>
                  <span className={match === 'match' ? 'badge-mint' : match === 'mismatch' ? 'badge-rose' : 'badge-amber'}>
                    {match === 'match' ? 'مطابق' : match === 'mismatch' ? 'غير مطابق' : 'غير واضح'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{asString(doc.notes)}</p>
              </div>
            );
          })}
        </div>
      </Block>
      {coverage ? (
        <Block title="تغطية الأدلة">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(coverage).map(([k, v]) => (
              <span key={k} className={v ? 'badge-mint' : 'badge-rose'}>
                {k}
              </span>
            ))}
          </div>
        </Block>
      ) : null}
      {asString(data.verdict) ? (
        <p className="text-xs text-slate-400">
          الحكم: <span className="font-semibold text-slate-200">{asString(data.verdict)}</span>
        </p>
      ) : null}
    </div>
  );
}

function AppealView({ data }: { data: Dict }) {
  const appeal = isDict(data.appeal) ? data.appeal : {};
  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 lg:grid-cols-2">
        <div className="rounded-xl border border-line/70 bg-ink-900/60 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">العربية</span>
            <CopyMini text={asString(appeal.ar)} />
          </div>
          <TextBlock>{asString(appeal.ar)}</TextBlock>
        </div>
        <div className="rounded-xl border border-line/70 bg-ink-900/60 p-3" dir="ltr">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">English</span>
            <CopyMini text={asString(appeal.en)} />
          </div>
          <p className="whitespace-pre-wrap text-start text-[13px] leading-relaxed text-slate-300">{asString(appeal.en)}</p>
        </div>
      </div>
      {asArray(data.attachmentsList).length ? (
        <Block title="المرفقات">
          <Chips items={asArray(data.attachmentsList).map(asString)} />
        </Block>
      ) : null}
      {asArray(data.riskNotes).length ? (
        <Block title="ملاحظات المخاطر" icon={AlertOctagon}>
          <ul className="space-y-1 text-[12px] text-slate-300">
            {asArray(data.riskNotes).map((n, i) => (
              <li key={i}>• {asString(n)}</li>
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}

function GenericView({ data }: { data: Dict }) {
  return (
    <div className="space-y-2.5">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-line/60 bg-ink-900/50 p-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500" dir="ltr">
            {key}
          </p>
          {Array.isArray(value) ? (
            <ul className="space-y-1">
              {value.map((v, i) => (
                <li key={i} className="text-[12px] text-slate-300">
                  {typeof v === 'object' ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400" dir="ltr">
                      {JSON.stringify(v, null, 2)}
                    </pre>
                  ) : (
                    `• ${asString(v)}`
                  )}
                </li>
              ))}
            </ul>
          ) : typeof value === 'object' && value !== null ? (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400" dir="ltr">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <p className="whitespace-pre-wrap text-[12px] text-slate-300">{asString(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ResultView({ parsed, raw }: { parsed: unknown; raw?: string }) {
  if (isDict(parsed)) {
    if ('rootCause' in parsed && 'recoveryPlan' in parsed) return <DiagnosisView data={parsed} />;
    if ('appeal' in parsed && 'attachmentsList' in parsed) return <AppealView data={parsed} />;
    if ('documents' in parsed) return <DocumentsView data={parsed} />;
    if ('recommendations' in parsed) {
      return (
        <div className="space-y-2">
          {asArray(parsed.recommendations).map((r, i) => {
            const item = isDict(r) ? r : {};
            return (
              <div key={i} className="rounded-xl border border-line/70 bg-ink-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-100">
                    <span className="num me-1.5 text-brand-300">#{asString(item.priority ?? i + 1)}</span>
                    {asString(item.title)}
                  </p>
                  <span className={asString(item.impact) === 'high' ? 'badge-rose' : 'badge-amber'}>
                    أثر {asString(item.impact)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{asString(item.why)}</p>
                <p className="mt-1 text-[12px] text-slate-300">{asString(item.how)}</p>
              </div>
            );
          })}
        </div>
      );
    }
    return <GenericView data={parsed} />;
  }

  return (
    <div className="rounded-xl border border-line/70 bg-ink-900/60 p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <ArrowLeft size={11} /> المخرجات
      </div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{raw || '—'}</p>
    </div>
  );
}
