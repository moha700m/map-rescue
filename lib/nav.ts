export interface NavItem {
  href: string;
  label: string;
  en: string;
  icon: string;
  group: string;
  badge?: 'ai';
}

export const NAV: NavItem[] = [
  { href: '/', label: 'الرئيسية', en: 'Home', icon: 'dashboard', group: 'شغلك اليومي' },
  { href: '/customers', label: 'القضايا', en: 'Cases', icon: 'users', group: 'شغلك اليومي' },
  { href: '/new-case', label: 'قضية جديدة', en: 'New case', icon: 'plus', group: 'شغلك اليومي' },

  { href: '/suspended', label: 'الملفات المعلّقة', en: 'Suspended', icon: 'alert', group: 'الملفات' },
  { href: '/appeals', label: 'الاستئنافات', en: 'Appeals', icon: 'file', group: 'الملفات' },
  { href: '/documents', label: 'المستندات', en: 'Documents', icon: 'folder', group: 'الملفات' },
  { href: '/tracker', label: 'المتابعة', en: 'Tracker', icon: 'activity', group: 'الملفات' },
  { href: '/submit', label: 'حزمة التقديم', en: 'Submit', icon: 'package', group: 'الملفات' },

  { href: '/reports', label: 'التقارير', en: 'Reports', icon: 'chart', group: 'النتائج' },

  { href: '/settings/ai', label: 'إعدادات الذكاء', en: 'AI settings', icon: 'sparkles', group: 'الإعدادات', badge: 'ai' },
  { href: '/google', label: 'ربط قوقل', en: 'Google', icon: 'plug', group: 'الإعدادات' },
  { href: '/settings', label: 'الإعدادات', en: 'Settings', icon: 'settings', group: 'الإعدادات' },
];

export const NAV_GROUPS = ['شغلك اليومي', 'الملفات', 'النتائج', 'الإعدادات'];

export function navFor(pathname: string) {
  if (pathname === '/') return NAV[0];
  const match = NAV.filter((n) => n.href !== '/' && pathname.startsWith(n.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match ?? NAV[0];
}
