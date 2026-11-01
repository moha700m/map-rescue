import Sidebar from '@/components/Sidebar';

export default function CustomersPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">العملاء والقضايا</h1>
            <p className="text-gray-400 text-sm">إدارة جميع حالات الاسترداد</p>
          </div>
          <a href="/new-case" className="btn-primary text-sm">قضية جديدة</a>
        </div>
        <div className="card">
          <p className="text-gray-400">لا توجد قضايا محفوظة بعد. قم بإنشاء قضية وتحليلها ثم احفظها في قاعدة البيانات.</p>
        </div>
      </main>
    </div>
  );
}