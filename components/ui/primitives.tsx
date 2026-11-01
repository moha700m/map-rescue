'use client';

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, Copy } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_META, RISK_META, STATUS_META } from '@/lib/constants';
import type { CaseStatus, RiskLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-2xs font-bold uppercase tracking-[0.18em] text-brand-400">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[27px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className={cn(meta.className, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const meta = RISK_META[level] ?? RISK_META.low;
  return <span className={cn(meta.className, className)}>{meta.label}</span>;
}

export function DocBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
  return <span className={meta.className}>{meta.label}</span>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/80 bg-ink-900/40 px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl border border-line bg-ink-800/80 p-3.5 text-slate-400">
        <Icon size={22} />
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="label">
        {label}
        {required ? <span className="text-rosex-400"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-2xs font-medium text-rosex-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-2xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string; icon?: ComponentType<{ size?: number }> }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-ink-900/70 p-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all duration-200',
              size === 'sm' ? 'px-2.5 py-1 text-2xs' : 'px-3 py-1.5 text-xs',
              active ? 'bg-brand-500/15 text-brand-200 shadow-[inset_0_0_0_1px_rgba(108,92,255,0.35)]' : 'text-slate-400 hover:text-slate-200',
            )}
            aria-pressed={active}
          >
            {Icon ? <Icon size={size === 'sm' ? 12 : 14} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; icon?: ComponentType<{ size?: number }>; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line/80">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 px-3.5 py-3 text-sm font-semibold transition-colors',
              active ? 'text-white' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            {Icon ? <Icon size={15} /> : null}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  active ? 'bg-brand-500/20 text-brand-200' : 'bg-white/5 text-slate-500',
                )}
              >
                {tab.count}
              </span>
            ) : null}
            {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function CopyButton({ value, label = 'نسخ' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* ignore */
        }
      }}
      className="btn-ghost btn-sm"
      aria-label={label}
    >
      {copied ? <Check size={13} className="text-mint-400" /> : <Copy size={13} />}
      {copied ? 'تم النسخ' : label}
    </button>
  );
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'mint' | 'amber' | 'rose'; className?: string }) {
  const toneClass = {
    brand: 'bg-brand-500',
    mint: 'bg-mint-500',
    amber: 'bg-amberx-500',
    rose: 'bg-rosex-500',
  }[tone];
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', toneClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  href,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  tone?: 'brand' | 'mint' | 'amber' | 'rose' | 'sky';
  href?: string;
  delta?: { value: string; positive?: boolean };
}) {
  const tones = {
    brand: 'text-brand-300 bg-brand-500/10 border-brand-500/20',
    mint: 'text-mint-400 bg-mint-500/10 border-mint-500/20',
    amber: 'text-amberx-400 bg-amberx-500/10 border-amberx-500/20',
    rose: 'text-rosex-400 bg-rosex-500/10 border-rosex-500/20',
    sky: 'text-skyx-400 bg-skyx-500/10 border-skyx-500/20',
  }[tone];

  const inner = (
    <div className="card card-hover h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-400">{label}</p>
          <p className="num mt-2 text-[26px] font-bold leading-none text-white">{value}</p>
          {hint ? <p className="mt-2 truncate text-2xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {Icon ? (
            <span className={cn('rounded-lg border p-2', tones)}>
              <Icon size={16} />
            </span>
          ) : null}
          {delta ? (
            <span
              className={cn(
                'text-2xs font-bold',
                delta.positive === false ? 'text-rosex-400' : 'text-mint-400',
              )}
            >
              {delta.value}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer focus-visible:outline-none">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-ink-700 text-2xs font-bold text-slate-300"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials || '؟'}
    </span>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200">
      <ChevronLeft size={14} className="rotate-180" />
      {label}
    </Link>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-line/60 px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-100">{title}</h2>
            {description ? <p className="mt-0.5 text-2xs text-slate-500">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}
