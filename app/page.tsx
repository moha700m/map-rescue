import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

async function getStats() {
  // In production this would query real Supabase
  // For now return demo structure
  return {
    totalCustomers: 0,
    activeCases: 0,
    suspended: 0,
    appealsPrepared: 0,
    appealsSubmitted: 0,
    reinstated: 0,
    rejected: 0,
    pendingDocs: 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
    { label: 'إجمالي العملاء', value: stats.totalCustomers, color: 'text-blue-400' },
    { label: 'القضايا النشطة', value: stats.activeCases, color: 'text-yellow-400' },
    { label: 'ملفات معلقة', value: stats.suspended, color: 'text-red-400' },
    { label: 'استئنافات جاهزة', value: stats.appealsPrepared, color: 'text-purple-400' },
    { label: 'استئنافات مقدمة', value: stats.appealsSubmitted, color: 'text-orange-400' },
    { label: 'تم الاسترداد', value: stats.reinstated, color: 'text-green-400' },
    { label: 'مرفوضة', value: stats.rejected, color: 'text-gray-400' },
    { label: 'بانتظار مستندات', value: stats.pendingDocs, color: 'text-pink-400' },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-gray-400 text-sm mt-1">نظرة عامة على حالات استرداد ملفات Google Business Profile</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="card">
              <p className="text-sm text-gray-400">{card.label}</p>
              <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">القضايا الأخيرة</h2>
          <p className="text-gray-400 text-sm">لا توجد قضايا بعد. ابدأ بإنشاء قضية جديدة.</p>
          <a href="/new-case" className="btn-primary inline-block mt-4 text-sm">
            قضية استرداد جديدة
          </a>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>المصادر الرسمية: support.google.com/business</p>
          <p className="mt-1">النظام لا يقدم أي استئناف تلقائيًا. يتطلب موافقة المالك.</p>
        </div>
      </main>
    </div>
  );
}