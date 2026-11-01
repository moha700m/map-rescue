import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MAP RESCUE AI — Google Business Profile Recovery',
  description: 'Private admin dashboard for diagnosing and recovering suspended Google Business Profiles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-dark-900 text-gray-100 font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}