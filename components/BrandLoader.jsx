'use client';
import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export default function BrandLoader() {
  const [dismissed, setDismissed] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [statusText, setStatusText] = useState('INITIALIZING SENTINEL...');

  useEffect(() => {
    const t1 = setTimeout(() => setStatusText('LOADING CHECK REGISTRY...'), 500);
    const t2 = setTimeout(() => setStatusText('SYSTEM READY'), 1000);
    const t3 = setTimeout(() => setSliding(true), 1400);
    const t4 = setTimeout(() => setDismissed(true), 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center gap-4 transition-transform duration-300 ${
        sliding ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 animate-pulse">
        <Shield className="w-10 h-10" />
      </div>
      <div className="text-lg font-bold tracking-widest text-white font-mono">SENTINEL</div>
      <div className="text-xs font-mono text-slate-500 tracking-wider">{statusText}</div>
    </div>
  );
}
