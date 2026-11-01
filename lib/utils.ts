import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function withBase(path: string) {
  if (!path.startsWith('/')) return path;
  return `${BASE_PATH}${path}`;
}

export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function formatUsd(n: number, digits?: number) {
  const value = Number.isFinite(n) ? n : 0;
  const d = digits ?? (value > 0 && value < 1 ? 4 : 2);
  return `$${value.toFixed(d)}`;
}

export function formatTokens(n: number) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function timeAgo(iso: string, locale: 'ar' | 'en' = 'ar') {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return locale === 'ar' ? 'الآن' : 'just now';
  if (min < 60) return locale === 'ar' ? `قبل ${min} دقيقة` : `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return locale === 'ar' ? `قبل ${hrs} ساعة` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return locale === 'ar' ? `قبل ${days} يوم` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return locale === 'ar' ? `قبل ${months} شهر` : `${months}mo ago`;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', opts ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function safeJsonParse<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function bytes(n: number) {
  if (!Number.isFinite(n)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
