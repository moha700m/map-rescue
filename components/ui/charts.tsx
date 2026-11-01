'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export function Sparkline({
  data,
  tone = 'brand',
  height = 36,
  className,
}: {
  data: number[];
  tone?: 'brand' | 'mint' | 'amber' | 'rose' | 'sky';
  height?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const values = data.length ? data : [0, 0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = 100 / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / span) * (height - 4) - 2}`);
  const colors = {
    brand: '#6c5cff',
    mint: '#2fce95',
    amber: '#f5b544',
    rose: '#fb5a7d',
    sky: '#3ec1ee',
  }[tone];

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={cn('w-full', className)} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors} stopOpacity="0.32" />
          <stop offset="100%" stopColor={colors} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points.join(' ')} 100,${height}`} fill={`url(#spark-${id})`} />
      <polyline points={points.join(' ')} fill="none" stroke={colors} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function UsageBars({
  data,
  height = 150,
  metric = 'tokens',
}: {
  data: { date: string; requests: number; tokens: number; costUsd: number; errors: number }[];
  height?: number;
  metric?: 'tokens' | 'requests' | 'costUsd';
}) {
  const max = Math.max(...data.map((d) => d[metric]), 1);
  return (
    <div dir="ltr" className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d) => {
          const h = Math.max(3, (d[metric] / max) * (height - 22));
          const hasError = d.errors > 0;
          const label = new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div
                className={cn(
                  'w-full rounded-t-[4px] transition-colors duration-200',
                  hasError
                    ? 'bg-gradient-to-t from-rosex-500/45 to-rosex-400/80 group-hover:to-rosex-400'
                    : 'bg-gradient-to-t from-brand-600/40 to-brand-500/80 group-hover:to-brand-400',
                )}
                style={{ height: h }}
              />
              <span className="text-[9px] text-slate-600 transition-colors group-hover:text-slate-400">{label.split(' ')[0]}</span>
              <div className="pointer-events-none absolute -top-1 z-20 hidden -translate-y-full whitespace-nowrap rounded-lg border border-line bg-ink-800 px-2 py-1 text-[10px] text-slate-200 shadow-lift group-hover:block">
                <span className="num">{d.requests}</span> طلب · <span className="num">{d.tokens.toLocaleString('en-US')}</span> رمز
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Ring({
  value,
  size = 78,
  stroke = 7,
  tone = 'brand',
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'brand' | 'mint' | 'amber' | 'rose';
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { brand: '#6c5cff', mint: '#2fce95', amber: '#f5b544', rose: '#fb5a7d' }[tone];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-sm font-bold text-white">{label ?? `${Math.round(clamped)}%`}</span>
        {sublabel ? <span className="text-[9px] text-slate-500">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function HBar({
  items,
  formatter = (n: number) => n.toLocaleString('en-US'),
}: {
  items: { label: string; value: number; tone?: 'brand' | 'mint' | 'amber' | 'sky' }[];
  formatter?: (n: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const tones = {
    brand: 'from-brand-600 to-brand-400',
    mint: 'from-mint-600 to-mint-400',
    amber: 'from-amberx-600 to-amberx-400',
    sky: 'from-skyx-600 to-skyx-400',
  };
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="group">
          <div className="mb-1 flex items-center justify-between gap-3 text-2xs">
            <span className="truncate font-medium text-slate-300" dir="ltr">
              {item.label}
            </span>
            <span className="num shrink-0 text-slate-400">{formatter(item.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={cn('h-full rounded-full bg-gradient-to-l transition-all duration-500', tones[item.tone || 'brand'])}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
