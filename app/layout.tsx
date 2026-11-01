import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'MAP RESCUE AI — استرداد ملفات Google Business',
  description:
    'لوحة تحكم خاصة لتشخيص ملفات Google Business Profile المعلّقة وإدارة الاستئنافات، مدعومة بالكامل بـ OpenRouter.',
};

export const viewport: Viewport = {
  themeColor: '#07080b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ink-950 font-sans text-slate-100 antialiased">{children}</body>
    </html>
  );
}
