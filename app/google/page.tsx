import Sidebar from '@/components/Sidebar';

export default function GooglePage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-2">ربط Google Business Profile</h1>
        <p className="text-gray-400 text-sm mb-6">
          الاتصال الرسمي عبر OAuth 2.0 وواجهات Google Business Profile APIs.
          البيانات الحية من Google تُعرض بوضوح وتُفصل عن البيانات اليدوية وتحليل الذكاء الاصطناعي.
        </p>

        <div className="card mb-6">
          <h2 className="font-semibold mb-3">حالة الوصول إلى API</h2>
          <p className="text-sm text-yellow-400 mb-2">
            واجهات Google Business Profile APIs تتطلب موافقة المشروع من Google.
          </p>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>أنشئ مشروعًا في Google Cloud Console</li>
            <li>فعّل: Account Management, Business Information, Performance, Verifications</li>
            <li>اطلب الوصول عبر النموذج الرسمي</li>
            <li>النطاق المطلوب: https://www.googleapis.com/auth/business.manage</li>
          </ul>
          <a
            href="https://developers.google.com/my-business/content/prereqs"
            target="_blank"
            className="btn-primary inline-block mt-4 text-sm"
          >
            طلب الوصول الرسمي
          </a>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">ربط الحساب</h2>
          <p className="text-sm text-gray-400 mb-4">
            بعد الموافقة على المشروع وإعداد OAuth credentials، يمكنك ربط الحساب لجلب المواقع والبيانات الحية.
          </p>
          <a href="/api/google/connect" className="btn-primary inline-block text-sm">
            ربط حساب Google
          </a>
          <p className="text-xs text-gray-500 mt-4">
            لا يتم تخزين كلمات المرور. يتم حفظ refresh token بشكل آمن على الخادم فقط.
            النظام لا يخترع أسباب تعليق غير متوفرة عبر الـ API الرسمي.
          </p>
        </div>

        <div className="card mt-6">
          <h2 className="font-semibold mb-2">التمييز بين مصادر البيانات</h2>
          <div className="text-sm space-y-2">
            <p><span className="text-green-400">● بيانات حية</span> — من Google Business Profile APIs (بعد الموافقة)</p>
            <p><span className="text-blue-400">● بيانات يدوية</span> — مُدخلة من المالك أو المستندات</p>
            <p><span className="text-purple-400">● تحليل AI</span> — فرضيات مبنية على السياسات الرسمية</p>
            <p><span className="text-gray-400">● أداة الاستئناف</span> — تُفتح يدويًا عبر الرابط الرسمي من Google</p>
          </div>
        </div>
      </main>
    </div>
  );
}