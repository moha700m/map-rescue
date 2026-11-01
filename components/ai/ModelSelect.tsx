'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, FileText, ImageIcon, Search, Sparkles, X } from 'lucide-react';
import type { ModelInfo } from '@/lib/ai/models';
import { findModel, pricePerMillion, providerOf, PROVIDER_LABEL, contextLabel } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

export default function ModelSelect({
  value,
  onChange,
  models,
  loading,
  label,
  disabled,
  compact,
}: {
  value: string;
  onChange: (id: string) => void;
  models: ModelInfo[];
  loading?: boolean;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyVision, setOnlyVision] = useState(false);
  const [onlyFile, setOnlyFile] = useState(false);

  const selected = findModel(models, value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models
      .filter((m) => (onlyVision ? m.inputModalities.includes('image') : true))
      .filter((m) => (onlyFile ? m.inputModalities.includes('file') : true))
      .filter((m) => (q ? `${m.id} ${m.name}`.toLowerCase().includes(q) : true))
      .slice(0, 120);
  }, [models, query, onlyVision, onlyFile]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-ink-900/80 px-3 py-2.5 text-start transition-colors hover:border-line-strong disabled:opacity-50',
          compact && 'py-2',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-100" dir="ltr">
            {selected ? selected.id : loading ? 'جارٍ تحميل النماذج…' : value || 'اختر نموذجًا'}
          </span>
          {!compact ? (
            <span className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
              {selected ? (
                <>
                  <span>{PROVIDER_LABEL[providerOf(selected.id)] ?? providerOf(selected.id)}</span>
                  <span>· {contextLabel(selected.contextLength)} ctx</span>
                  {selected.inputModalities.includes('image') ? <ImageIcon size={10} className="text-skyx-400" /> : null}
                  {selected.inputModalities.includes('file') ? <FileText size={10} className="text-mint-400" /> : null}
                </>
              ) : (
                <span>من كتالوج OpenRouter</span>
              )}
            </span>
          ) : null}
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-slate-500" />
      </button>

      {label ? <span className="mt-1 block text-2xs text-slate-500">{label}</span> : null}

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-lift animate-fade-up">
            <div className="border-b border-line/70 p-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-2.5">
                <Search size={13} className="text-slate-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث باسم النموذج أو المزوّد…"
                  className="h-9 flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} aria-label="مسح">
                    <X size={12} className="text-slate-500" />
                  </button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setOnlyVision((v) => !v)}
                  className={cn('badge transition-colors', onlyVision ? 'badge-sky' : 'badge-muted')}
                >
                  <ImageIcon size={10} /> يدعم الصور
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyFile((v) => !v)}
                  className={cn('badge transition-colors', onlyFile ? 'badge-mint' : 'badge-muted')}
                >
                  <FileText size={10} /> يدعم الملفات
                </button>
                <span className="ms-auto self-center text-[10px] text-slate-600">{filtered.length} نموذج</span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
              {loading ? (
                <div className="space-y-1.5 p-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-10" />
                  ))}
                </div>
              ) : filtered.length ? (
                filtered.map((model) => {
                  const price = pricePerMillion(model);
                  const active = model.id === value;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(model.id);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-start transition-colors',
                        active ? 'bg-brand-500/12' : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="mt-0.5 w-4 shrink-0">
                        {active ? <Check size={13} className="text-brand-300" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-slate-100" dir="ltr">
                            {model.id}
                          </span>
                          {model.inputModalities.includes('image') ? <ImageIcon size={10} className="text-skyx-400" /> : null}
                          {model.inputModalities.includes('file') ? <FileText size={10} className="text-mint-400" /> : null}
                          {model.promptPrice === 0 && model.completionPrice === 0 ? (
                            <Sparkles size={10} className="text-amberx-400" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                          <span className="num">{contextLabel(model.contextLength)}</span>
                          <span className="num">${price.prompt}/M in</span>
                          <span className="num">${price.completion}/M out</span>
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-center text-xs text-slate-500">لا يوجد نموذج مطابق</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
