'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { icon: CheckCircle2, bar: 'bg-severity-low', iconClass: 'text-severity-low' },
  error:   { icon: AlertTriangle, bar: 'bg-severity-critical', iconClass: 'text-severity-critical' },
  info:    { icon: Info, bar: 'bg-accent', iconClass: 'text-accent' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', durationMs = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-2.5 overflow-hidden rounded border border-border bg-canvas-overlay shadow-raised transition-opacity duration-200"
            >
              <div className={`w-0.5 self-stretch flex-shrink-0 ${style.bar}`} />
              <div className="flex items-start gap-2.5 flex-1 p-3">
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.iconClass}`} />
                <p className="flex-1 text-xs leading-relaxed text-ink">{t.message}</p>
                <button
                  onClick={() => dismissToast(t.id)}
                  aria-label="Dismiss notification"
                  className="flex-shrink-0 text-ink-faint hover:text-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
