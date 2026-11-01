'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Command,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Package,
  Plug,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Users,
  FileText,
  X,
  Zap,
} from 'lucide-react';
import { NAV, NAV_GROUPS, navFor } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { ensureSeed } from '@/lib/client/store';
import { getHealth } from '@/lib/client/ai';
import Toaster from '@/components/ui/Toaster';

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  users: Users,
  plus: PlusCircle,
  alert: AlertTriangle,
  file: FileText,
  folder: FolderOpen,
  activity: Activity,
  chart: BarChart3,
  plug: Plug,
  sparkles: Sparkles,
  settings: Settings,
  package: Package,
};

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_10px_28px_-12px_rgba(108,92,255,0.9)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.6" stroke="white" strokeWidth="1.7" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-extrabold tracking-wide text-white">MAP RESCUE</span>
        <span className="block text-[10px] font-semibold tracking-[0.22em] text-brand-300/80">AI · OPENROUTER</span>
      </span>
    </Link>
  );
}

function StatusPill() {
  const [state, setState] = useState<{ mode: 'server' | 'direct'; hasKey: boolean; model: string } | null>(null);

  useEffect(() => {
    getHealth()
      .then((h) => setState({ mode: h.mode, hasKey: h.key.present, model: h.settings.defaultModel }))
      .catch(() => setState(null));
  }, []);

  const connected = state?.hasKey;
  return (
    <Link
      href="/settings/ai"
      className="flex items-center gap-2.5 rounded-xl border border-line bg-ink-850/80 px-2.5 py-2 transition-colors hover:border-line-strong"
    >
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          connected ? 'bg-mint-400 animate-pulse-ring' : 'bg-rosex-400',
        )}
      />
      <span className="min-w-0 leading-tight">
        <span className="block text-[11px] font-bold text-slate-200">
          {connected ? 'متصل بـ OpenRouter' : 'ما فيه مفتاح'}
        </span>
        <span className="block truncate text-[10px] text-slate-500" dir="ltr">
          {state?.model?.split('/')[1] ?? 'أضف المفتاح عشان يشتغل'}
        </span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = navFor(pathname || '/');

  useEffect(() => {
    ensureSeed();
  }, []);

  useEffect(() => {
    setOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.filter((n) => `${n.label} ${n.en} ${n.href}`.toLowerCase().includes(q));
  }, [query]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-5 pt-5">
        <Logo />
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 md:hidden" aria-label="إغلاق القائمة">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const items = NAV.filter((n) => n.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{group}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = current?.href === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-200',
                        active
                          ? 'bg-brand-500/[0.13] text-white shadow-[inset_0_0_0_1px_rgba(108,92,255,0.22)]'
                          : 'text-slate-400 hover:bg-white/[0.035] hover:text-slate-100',
                      )}
                    >
                      <Icon size={16} className={cn('shrink-0', active ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge === 'ai' ? (
                        <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-bold text-brand-300">AI</span>
                      ) : null}
                      {active ? <span className="absolute inset-y-2 -end-3 w-1 rounded-full bg-brand-500" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-line/70 p-3">
        <StatusPill />
        <p className="px-1 text-[10px] leading-relaxed text-slate-600">
          النسخة 2.0 · كل الذكاء عبر OpenRouter · ما فيه استئناف آلي
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Desktop sidebar (RTL: right side) */}
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-[258px] border-s border-line/70 bg-ink-900/70 backdrop-blur-xl md:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 end-0 w-[280px] border-s border-line bg-ink-900 shadow-lift animate-fade-up">{sidebar}</aside>
        </div>
      ) : null}

      <div className="md:me-[258px]">
        <header className="sticky top-0 z-30 border-b border-line/60 bg-ink-950/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-line p-2 text-slate-300 md:hidden"
              aria-label="فتح القائمة"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-200">{current?.label}</p>
              <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-600">{current?.en}</p>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-line bg-ink-850/70 px-3 py-2 text-xs text-slate-400 transition-colors hover:border-line-strong hover:text-slate-200 sm:flex"
            >
              <Search size={14} />
              <span>دوّر على صفحة…</span>
              <span className="kbd ms-2">⌘K</span>
            </button>


            <button type="button" className="relative rounded-xl border border-line p-2 text-slate-400 transition-colors hover:text-slate-200" aria-label="التنبيهات">
              <Bell size={16} />
              <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rosex-400" />
            </button>

            <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ink-750 text-[11px] font-bold text-slate-300">
              م
            </span>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>

      {paletteOpen ? (
        <div className="fixed inset-0 z-[75] flex items-start justify-center p-4 pt-[12vh]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPaletteOpen(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-lift animate-fade-up">
            <div className="flex items-center gap-2 border-b border-line/70 px-4">
              <Command size={15} className="text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="وين تبي تروح؟"
                className="h-12 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button type="button" onClick={() => setPaletteOpen(false)} className="kbd">ESC</button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Icon size={15} className="text-slate-500" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">{item.en}</span>
                  </Link>
                );
              })}
              {!results.length ? <p className="px-3 py-6 text-center text-xs text-slate-500">لا نتائج</p> : null}
            </div>
            <div className="flex items-center gap-2 border-t border-line/70 px-3 py-2 text-[10px] text-slate-600">
              <Zap size={11} />
              <span>اختصار سريع: ⌘K</span>
            </div>
          </div>
        </div>
      ) : null}

      <Toaster />
    </div>
  );
}
