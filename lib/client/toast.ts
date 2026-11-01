'use client';

export type ToastTone = 'success' | 'error' | 'info' | 'warn';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l([...items]));
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener([...items]);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function toast(title: string, opts: { description?: string; tone?: ToastTone } = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  items = [...items, { id, title, description: opts.description, tone: opts.tone || 'info' }].slice(-4);
  emit();
  setTimeout(() => dismissToast(id), opts.tone === 'error' ? 7000 : 4500);
  return id;
}
