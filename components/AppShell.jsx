'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Shield } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';

export function AppShell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Do not show the shell on login/signup pages or while unauthenticated
  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      {/* Sidebar (Desktop persistent + Mobile slide-over) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-56">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-14 border-b border-border bg-canvas-raised px-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold tracking-wider text-ink font-mono">SENTINEL</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
