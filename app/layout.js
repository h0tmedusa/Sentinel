import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ToastProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { RouteGuard } from '@/components/RouteGuard';
import { ScanProvider } from '@/components/ScanProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Sentinel - Security Assessment Platform',
  description: 'Automated security checks and compliance validation dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <ScanProvider>
          <AuthProvider>
            <ToastProvider>
              <RouteGuard>{children}</RouteGuard>
            </ToastProvider>
          </AuthProvider>
        </ScanProvider>
      </body>
    </html>
  );
}
