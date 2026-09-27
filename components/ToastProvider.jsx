'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

// tailwindcss-animate is NOT installed; use plain transition classes instead.
const TOAST_STYLES = {
  success: { icon: CheckCircle2, classes: 'bg-emerald-950/90 border-emerald-800 text-emerald-200' },
  error:   { icon: AlertTriangle, classes: 'bg-red-950/90 border-red-800 text-red-200' },
  info:    { icon: Info,          classes: 'bg-slate-900/90 border-slate-700 text-slate-200' },
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
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border backdrop-blur-sm shadow-xl transition-opacity duration-200 ${style.classes}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-xs leading-relaxed">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
