'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, ArrowLeft, ExternalLink } from 'lucide-react';
import RiskTrendChart from '@/components/RiskTrendChart';
import { SEVERITY_TEXT } from '@/lib/severityTheme';

export default function ScanHistoryPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/scans/history');
        const data = await res.json();
        if (!cancelled) {
          if (data.success) {
            setScans(data.data.scans);
          } else {
            setError(data.error?.message || 'Failed to load scan history');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-white">Scan History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading && <p className="text-sm text-slate-500">Loading scan history...</p>}
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-xs text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            <RiskTrendChart historyScans={scans} />

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-800">
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Findings</th>
                    <th className="px-4 py-3">Risk Score</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {scans.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">No scans yet — run one from the Dashboard.</td></tr>
                  ) : scans.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 truncate max-w-[240px]">{s.targetUrl}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded border ${s.status === 'done' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : s.status === 'failed' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-slate-400 border-slate-700 bg-slate-800'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(s.startedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{s.durationSeconds}s</td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {s.totalFindings} total
                        {s.criticalCount > 0 && <span className={`ml-1.5 ${SEVERITY_TEXT.critical}`}>({s.criticalCount} crit)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${s.riskScore >= 70 ? SEVERITY_TEXT.critical : s.riskScore >= 40 ? SEVERITY_TEXT.high : SEVERITY_TEXT.low}`}>
                          {s.riskScore}/100
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/?scanId=${s.id}`} className="text-slate-500 hover:text-emerald-400" title="View this scan on the Dashboard">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
