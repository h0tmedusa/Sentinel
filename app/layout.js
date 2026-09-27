import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata = {
  title: 'Sentinel - Security Assessment Platform',
  description: 'Automated security checks and compliance validation dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
