export interface NavItem {
  href: string;
  label: string;
  en: string;
  icon: string;
  group: string;
  badge?: 'ai';
}

export const NAV: NavItem[] = [
  { href: '/', label: 'لوحة التحكم', en: 'Dashboard', icon: 'dashboard', group: 'لوحة العمل' },
  { href: '/customers', label: 'العملاء والقضايا', en: 'Cases', icon: 'users', group: 'لوحة العمل' },
  { href: '/new-case', label: 'قضية جديدة', en: 'New case', icon: 'plus', group: 'لوحة العمل' },

  { href: '/suspended', label: 'الملفات المعلقة', en: 'Suspended', icon: 'alert', group: 'التشخيص والاسترداد' },
  { href: '/appeals', label: 'مولد الاستئناف', en: 'Appeals', icon: 'file', group: 'التشخيص والاسترداد' },
  { href: '/documents', label: 'مركز المستندات', en: 'Documents', icon: 'folder', group: 'التشخيص والاسترداد' },
  { href: '/tracker', label: 'متتبع الاسترداد', en: 'Tracker', icon: 'activity', group: 'التشخيص والاسترداد' },

  { href: '/reports', label: 'التقارير', en: 'Reports', icon: 'chart', group: 'المخرجات' },

  { href: '/google', label: 'ربط Google', en: 'Google', icon: 'plug', group: 'النظام' },
  { href: '/settings/ai', label: 'الذكاء الاصطناعي', en: 'AI settings', icon: 'sparkles', group: 'النظام', badge: 'ai' },
  { href: '/settings', label: 'إعدادات النظام', en: 'Settings', icon: 'settings', group: 'النظام' },
];

export const NAV_GROUPS = ['لوحة العمل', 'التشخيص والاسترداد', 'المخرجات', 'النظام'];

export function navFor(pathname: string) {
  if (pathname === '/') return NAV[0];
  const match = NAV.filter((n) => n.href !== '/' && pathname.startsWith(n.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match ?? NAV[0];
}
