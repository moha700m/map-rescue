'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={cn('relative z-10 my-6 w-full overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-lift animate-fade-up', width)}>
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line p-1.5 text-slate-400 transition-colors hover:border-line-strong hover:text-white"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line/70 bg-ink-850/60 px-5 py-3">{footer}</footer> : null}
      </div>
    </div>
  );
}
