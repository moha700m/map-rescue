export interface NavItem {
  href: string;
  label: string;
  en: string;
  icon: string;
  group: string;
  badge?: 'ai';
}

export const NAV: NavItem[] = [
  { href: '/', label: 'الرئيسية', en: 'Home', icon: 'dashboard', group: 'main' },
  { href: '/customers', label: 'القضايا', en: 'Cases', icon: 'users', group: 'main' },
  { href: '/fix', label: 'التصحيح', en: 'Fixes', icon: 'wrench', group: 'main' },
  { href: '/submit', label: 'حزمة التقديم', en: 'Submit', icon: 'package', group: 'main' },
  { href: '/documents', label: 'المستندات', en: 'Documents', icon: 'folder', group: 'main' },
  { href: '/reports', label: 'التقارير', en: 'Reports', icon: 'chart', group: 'main' },
  { href: '/settings/ai', label: 'إعدادات الذكاء', en: 'AI settings', icon: 'sparkles', group: 'system', badge: 'ai' },
  { href: '/settings', label: 'الإعدادات', en: 'Settings', icon: 'settings', group: 'system' },
];

export const NAV_GROUPS = ['main', 'system'];

export const GROUP_LABEL: Record<string, string> = {
  main: 'العمل',
  system: 'النظام',
};

export function navFor(pathname: string) {
  if (pathname === '/') return NAV[0];
  const match = NAV.filter((n) => n.href !== '/' && pathname.startsWith(n.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match ?? NAV[0];
}
