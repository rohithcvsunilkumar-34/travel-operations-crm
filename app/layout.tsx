import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Travel Operations CRM',
  description: 'Operations, Fleet & Package CRM Dashboard for Travel Companies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-slate-50 min-h-screen antialiased">{children}</body>
    </html>
  );
}
