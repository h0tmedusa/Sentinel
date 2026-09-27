'use client';
import { Layers } from 'lucide-react';

const CWE_MAP = [
  { cweId: 'CWE-89', name: 'SQL Injection' },
  { cweId: 'CWE-79', name: 'Reflected Cross-Site Scripting (XSS)' },
  { cweId: 'CWE-200', name: 'Information Disclosure / Exposure' },
  { cweId: 'CWE-256', name: 'Plaintext Password Storage / Exposure' },
  { cweId: 'CWE-916', name: 'Weak / Disclosed Password Hash' },
  { cweId: 'CWE-312', name: 'Cleartext Secrets / Private Key Exposure' },
  { cweId: 'CWE-798', name: 'Hardcoded Cloud Credentials (AWS Key)' },
  { cweId: 'CWE-639', name: 'Broken Object Level Authorization (IDOR/BOLA)' },
  { cweId: 'CWE-693', name: 'Protection Mechanism Failure (CSP Missing)' },
  { cweId: 'CWE-319', name: 'Cleartext Transmission (HSTS Missing)' },
  { cweId: 'CWE-942', name: 'Permissive CORS Policy / Reflection' },
  { cweId: 'CWE-1004', name: 'Sensitive Cookie Missing HttpOnly Flag' },
  { cweId: 'CWE-614', name: 'Sensitive Cookie Missing Secure Flag' },
  { cweId: 'CWE-1275', name: 'Sensitive Cookie Missing SameSite Attribute' },
];

export default function CategoryDistribution({ findings = [] }) {
  const total = Math.max(1, findings.length);
  const distribution = CWE_MAP.map((item) => {
    const count = findings.filter((f) => f.cweId === item.cweId).length;
    const percentage = Math.round((count / total) * 100);
    return { ...item, count, percentage };
  }).filter((item) => item.count > 0); // only show CWEs actually present in this scan

  if (distribution.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-center min-h-[120px]">
        <span className="text-xs font-mono text-slate-600">No CWE-classified findings in this scan</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <Layers className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">CWE Distribution</h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {distribution.map((item) => (
          <div key={item.cweId} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {item.cweId}
                </span>
                <span className="text-slate-200 font-medium">{item.name}</span>
              </div>
              <span className="text-amber-400 font-bold">
                {item.count} finding{item.count !== 1 ? 's' : ''} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
                style={{ width: `${Math.max(3, item.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
