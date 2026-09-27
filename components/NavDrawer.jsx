'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, Radio, History, AlertTriangle } from 'lucide-react';
import { NAV_ITEM_STATE } from '@/lib/severityTheme';

const NAV_ITEMS = [
  { id: 'dashboard', href: '/', label: 'Dashboard', icon: Radio },
  { id: 'vulnerability-matrix', href: '/vulnerability-matrix', label: 'Vulnerability Matrix', icon: AlertTriangle },
  { id: 'history', href: '/scan-history', label: 'Scan History', icon: History },
];

export default function NavDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/60 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 z-[75] h-full w-[240px] bg-canvas border-r border-border flex flex-col shadow-raised transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="text-sm font-semibold tracking-tight text-ink">SENTINEL</span>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="w-7 h-7 flex items-center justify-center rounded text-ink-muted hover:text-ink hover:bg-canvas-raised transition-colors focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.id}
                onClick={() => { onClose(); router.push(item.href); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? NAV_ITEM_STATE.active : NAV_ITEM_STATE.inactive
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
