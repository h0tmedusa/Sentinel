'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, Shield, Radio, History, AlertTriangle, ChevronRight } from 'lucide-react';
import { ACCENT_COLORS } from '@/lib/severityTheme';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    href: '/',
    label: 'Dashboard',
    sublabel: 'Run scans and view live results',
    icon: Radio,
    accent: 'emerald',
  },
  {
    id: 'vulnerability-matrix',
    href: '/vulnerability-matrix',
    label: 'Vulnerability Matrix',
    sublabel: 'Browse findings by CWE and category',
    icon: AlertTriangle,
    accent: 'red',
  },
  {
    id: 'history',
    href: '/scan-history',
    label: 'Scan History',
    sublabel: 'Past scans and risk trend',
    icon: History,
    accent: 'cyan',
  },
];

export default function NavDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 z-[75] h-full w-[280px] bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-white tracking-wider">SENTINEL</h2>
              <p className="text-[10px] font-mono text-slate-500">Security Assessment Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const colors = ACCENT_COLORS[item.accent];
            const isActive = pathname === item.href;
            return (
              <button
                key={item.id}
                onClick={() => { onClose(); router.push(item.href); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? `${colors.active} bg-slate-900 border border-slate-700/60`
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                    isActive ? colors.icon : 'text-slate-500 bg-slate-900 border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{item.sublabel}</div>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-slate-300' : 'text-slate-600'}`}
                />
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 text-center">
          <div className="text-[9px] font-mono text-slate-600">Sentinel Security Assessment Platform</div>
        </div>
      </div>
    </>
  );
}
