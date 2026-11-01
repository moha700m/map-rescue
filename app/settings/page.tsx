import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>
        
        <div className="card space-y-4">
          <h2 className="font-semibold">حالة التكامل</h2>
          <div className="text-sm space-y-2">
            <p>Supabase: <span className="text-yellow-400">يتطلب إعداد المتغيرات البيئية</span></p>
            <p>AI Engine: <span className="text-yellow-400">يتطلب OPENAI_API_KEY أو AI_API_KEY</span></p>
            <p>Storage: <span className="text-yellow-400">أنشئ bucket خاص باسم evidence</span></p>
          </div>
        </div>

        <div className="card mt-4">
          <h2 className="font-semibold mb-2">قواعد الأتمتة</h2>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>لا يتم تقديم أي استئناف تلقائيًا</li>
            <li>يتطلب موافقة المالك قبل أي إجراء خارجي</li>
            <li>لا يتم اختراع أسباب تعليق بدون دليل</li>
            <li>المصادر الرسمية فقط من Google Support</li>
          </ul>
        </div>
      </main>
    </div>
  );
}