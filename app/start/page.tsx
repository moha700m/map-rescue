'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileUp, Loader2, Send, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { newCaseDraft, upsertCase, makeDoc } from '@/lib/client/store';
import { guessDocCategory, readSuspensionMessage } from '@/lib/client/pipeline';
import { putFile, dataUrlToBlob } from '@/lib/client/files';
import { toast } from '@/lib/client/toast';
import type { CaseRecord } from '@/lib/types';
import { COUNTRY_META } from '@/lib/constants';
import { bytes, cn } from '@/lib/utils';

interface Upload {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export default function StartPage() {
  const [form, setForm] = useState({
    businessName: '',
    customerName: '',
    customerPhone: '',
    city: '',
    country: 'SA',
    suspensionMessage: '',
  });
  const [files, setFiles] = useState<Upload[]>([]);
  const [saved, setSaved] = useState<CaseRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const read = form.suspensionMessage ? readSuspensionMessage(form.suspensionMessage) : null;
  const ready = form.businessName.trim() && form.customerName.trim() && form.customerPhone.trim() && form.city.trim();

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Upload[] = [];
    for (const file of Array.from(list).slice(0, 6)) {
      if (file.size > 10 * 1024 * 1024) {
        toast('الملف كبير', { description: file.name, tone: 'warn' });
        continue;
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (dataUrl) next.push({ name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, dataUrl });
    }
    setFiles((prev) => [...prev, ...next].slice(0, 6));
  }

  async function submit() {
    if (!ready) {
      toast('ناقصنا كم حاجة', { description: 'اسم النشاط، اسمك، جوالك، والمدينة', tone: 'warn' });
      return;
    }
    setBusy(true);
    const draft = newCaseDraft();
    const record: CaseRecord = {
      ...draft,
      businessName: form.businessName.trim(),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      city: form.city.trim(),
      country: form.country,
      suspensionMessage: form.suspensionMessage.trim() || undefined,
      previousAppeals: 'ما فيه',
      documents: files.map((f) =>
        makeDoc({
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          category: guessDocCategory(f.name) as CaseRecord['documents'][number]['category'],
          status: 'parsed',
        }),
      ),
      timeline: [...draft.timeline, { at: new Date().toISOString(), label: 'وصل الطلب من العميل', tone: 'neutral' }],
    };
    for (let i = 0; i < record.documents.length; i += 1) {
      if (files[i]?.dataUrl) await putFile(record.documents[i].id, dataUrlToBlob(files[i].dataUrl));
    }
    const stored = upsertCase(record);
    setSaved(stored);
    setBusy(false);
    toast('وصلنا طلبك', { description: stored.code, tone: 'success' });
  }

  const whatsappText = saved
    ? `طلب فك تعليق ملف قوقل\n\nالرقم: ${saved.code}\nالنشاط: ${saved.businessName}\nالاسم: ${saved.customerName}\nالجوال: ${saved.customerPhone}\nالمدينة: ${saved.city}\n\nرسالة قوقل:\n${saved.suspensionMessage || 'ما وصلت'}\n\nالمستندات: ${saved.documents.map((d) => d.name).join(' / ') || 'ما فيه'}`
    : '';

  if (saved) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="card p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint-500/12 text-mint-400">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-white">تم، وصلنا طلبك</h1>
          <p className="num mt-1 text-xs text-brand-300">{saved.code}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-400">
            بنراجع الملف ونرجع لك خلال ٢٤ ساعة إن شاء الله. عشان نشتغل أسرع، أضف بريد الوكالة كمدير على ملفك.
          </p>

          <div className="mt-4 rounded-xl border border-line/70 bg-ink-900/60 p-3 text-start">
            <p className="text-[10px] font-bold text-slate-500">خطوتين بس</p>
            <ol className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-300">
              <li>١. افتح business.google.com وسجّل بنفس الحساب اللي عليه الملف.</li>
              <li>٢. المستخدمون ← إضافة ← حط بريد الوكالة كـ «مدير».</li>
            </ol>
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amberx-500/10 px-2 py-1.5 text-[10px] text-amberx-300">
              <ShieldCheck size={11} /> لا ترسل لنا كلمة المرور ولا رمز التحقق أبدًا.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={async () => {
                await navigator.clipboard.writeText(whatsappText);
                setCopied(true);
                toast('انسخ الطلب وأرسله لنا', { tone: 'success' });
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Send size={15} /> {copied ? 'تم النسخ' : 'انسخ الطلب وأرسله بالواتساب'}
            </button>
            <Link href="/" className="btn-ghost w-full justify-center">
              لوحة المتابعة
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
          <Sparkles size={18} className="text-white" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">MAP RESCUE</p>
          <p className="text-lg font-bold leading-tight text-white">طلب فك تعليق ملف قوقل</p>
        </div>
      </div>

      <div className="card p-5">
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          عبّ الخانات، وما نطلب منك كلمة مرور ولا رمز تحقق. اللي تبي تسويه: ترفع لنا المستندات وتضيف بريدنا كمدير.
        </p>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">اسم النشاط على قوقل <span className="text-rosex-400">*</span></span>
            <input
              className="input"
              value={form.businessName}
              onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
              placeholder="مثال: مطعم بيت المندي"
            />
          </label>
          <label className="block">
            <span className="label">اسمك <span className="text-rosex-400">*</span></span>
            <input className="input" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} placeholder="الاسم الأول والأخير" />
          </label>
          <label className="block">
            <span className="label">جوالك <span className="text-rosex-400">*</span></span>
            <input
              className="input"
              dir="ltr"
              value={form.customerPhone}
              onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
              placeholder="05x xxx xxxx"
            />
          </label>
          <label className="block">
            <span className="label">المدينة <span className="text-rosex-400">*</span></span>
            <input className="input" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="الرياض" />
          </label>
          <label className="block">
            <span className="label">الدولة</span>
            <select className="select" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}>
              {Object.entries(COUNTRY_META).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.flag} {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">انسخ رسالة قوقل (لو وصلتك)</span>
            <textarea
              className="input min-h-[90px] resize-y"
              value={form.suspensionMessage}
              onChange={(e) => setForm((p) => ({ ...p, suspensionMessage: e.target.value }))}
              placeholder="Your Business Profile has been suspended…"
            />
          </label>
        </div>

        {read ? (
          <div className="mt-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-2.5">
            <p className="text-[10px] font-bold text-brand-300">قرينا الرسالة</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {read.flags.length ? read.flags.map((f) => <span key={f} className="badge-rose">{f}</span>) : <span className="badge-muted">التعليق عام</span>}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-300">{read.hint}</p>
          </div>
        ) : null}

        <div className="mt-3.5">
          <span className="label">المستندات (السجل، الرخصة، صور الواجهة)</span>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-900/40 px-4 py-6 text-center transition-colors hover:border-brand-500/40">
            <FileUp size={20} className="text-slate-500" />
            <span className="mt-1.5 text-xs font-semibold text-slate-300">اضغط وارفع الملفات</span>
            <span className="text-[10px] text-slate-500">صور أو PDF — حتى ١٠ ميجا للملف</span>
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
          {files.length ? (
            <ul className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-line/60 bg-ink-900/60 px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{f.name}</span>
                  <span className="num text-[10px] text-slate-600">{bytes(f.size)}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} aria-label="حذف">
                    <Trash2 size={12} className="text-slate-500 hover:text-rosex-400" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button type="button" className={cn('btn-primary mt-4 w-full justify-center', !ready && 'opacity-60')} onClick={submit} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          أرسل الطلب
        </button>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck size={11} /> بياناتك تبقى عند الوكالة، وما نطلب كلمة مرورك.
        </p>
      </div>

      <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-600 hover:text-slate-400">
        <X size={11} /> دخول الوكالة
      </Link>
    </main>
  );
}
