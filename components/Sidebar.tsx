'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  AlertTriangle, 
  FileText, 
  FolderOpen, 
  Activity, 
  BarChart3, 
  Settings 
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard },
  { href: '/new-case', label: 'قضية جديدة', labelEn: 'New Case', icon: PlusCircle },
  { href: '/customers', label: 'العملاء', labelEn: 'Customers', icon: Users },
  { href: '/suspended', label: 'الملفات المعلقة', labelEn: 'Suspended', icon: AlertTriangle },
  { href: '/appeals', label: 'مولد الاستئناف', labelEn: 'Appeals', icon: FileText },
  { href: '/documents', label: 'مركز المستندات', labelEn: 'Documents', icon: FolderOpen },
  { href: '/tracker', label: 'متتبع الاسترداد', labelEn: 'Tracker', icon: Activity },
  { href: '/reports', label: 'التقارير', labelEn: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'الإعدادات', labelEn: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dark-800 border-l border-dark-600 min-h-screen p-4 hidden md:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">MAP RESCUE AI</h1>
        <p className="text-xs text-gray-400 mt-1">نظام استرداد ملفات الأعمال</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active 
                  ? 'bg-accent-600/20 text-accent-500' 
                  : 'text-gray-300 hover:bg-dark-700'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}