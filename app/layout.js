import './globals.css';

export const metadata = {
  title: 'Sentinel - Security Assessment Platform',
  description: 'Automated security checks and compliance validation dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
