'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { dismissToast, subscribeToasts, type ToastItem, type ToastTone } from '@/lib/client/toast';
import { cn } from '@/lib/utils';

const TONE: Record<ToastTone, { icon: typeof Info; className: string; iconClass: string }> = {
  success: { icon: CheckCircle2, className: 'border-mint-500/30 bg-[#0d1a17]', iconClass: 'text-mint-400' },
  error: { icon: XCircle, className: 'border-rosex-500/30 bg-[#1a0f13]', iconClass: 'text-rosex-400' },
  warn: { icon: TriangleAlert, className: 'border-amberx-500/30 bg-[#1a1509]', iconClass: 'text-amberx-400' },
  info: { icon: Info, className: 'border-brand-500/30 bg-[#12111f]', iconClass: 'text-brand-300' },
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[80] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2">
      {items.map((item) => {
        const tone = TONE[item.tone];
        const Icon = tone.icon;
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lift backdrop-blur-xl animate-fade-up',
              tone.className,
            )}
          >
            <Icon size={18} className={cn('mt-0.5 shrink-0', tone.iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              aria-label="إغلاق التنبيه"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
