'use client';

import { useAuth } from './AuthProvider';
import { LogOut, User } from 'lucide-react';

export function UserBadge() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5 text-xs">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas-raised border border-border text-ink">
        <User className="w-3.5 h-3.5 text-ink-muted" />
        <span className="font-medium">{user.username}</span>
        <span className="text-ink-faint">•</span>
        <span className="text-accent text-[11px] font-mono font-medium">{user.role}</span>
      </div>
      <button
        onClick={logout}
        title="Sign Out"
        aria-label="Sign Out"
        className="p-1 rounded text-ink-muted hover:text-severity-critical hover:bg-canvas-raised transition-colors focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
