'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Shield, Radio, AlertTriangle, History, LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { NAV_ITEM_STATE } from '@/lib/severityTheme';

const NAV_ITEMS = [
  { id: 'dashboard', href: '/', label: 'Dashboard', icon: Radio },
  { id: 'vulnerability-matrix', href: '/vulnerability-matrix', label: 'Vulnerability Matrix', icon: AlertTriangle },
  { id: 'history', href: '/scan-history', label: 'Scan History', icon: History },
];

export function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleNavigate = (href) => {
    onMobileClose();
    router.push(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-canvas-raised border-r border-border select-none">
      {/* Brand Header */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
        <Shield className="w-5 h-5 text-accent flex-shrink-0" />
        <span className="text-sm font-semibold tracking-wider text-ink font-mono">SENTINEL</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                isActive ? NAV_ITEM_STATE.active : NAV_ITEM_STATE.inactive
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User & Logout Section */}
      {user && (
        <div className="p-3 border-t border-border flex-shrink-0 bg-canvas">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded bg-canvas-raised border border-border flex items-center justify-center flex-shrink-0 text-ink-muted">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-ink truncate leading-tight">
                  {user.username}
                </div>
                <div className="text-[10px] font-mono text-accent truncate leading-tight">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded text-ink-muted hover:text-severity-critical hover:bg-canvas-raised transition-colors focus-visible:ring-2 focus-visible:ring-accent flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-raised z-10 flex flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
