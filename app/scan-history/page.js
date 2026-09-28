'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Menu } from 'lucide-react';
import RiskTrendChart from '@/components/RiskTrendChart';
import NavDrawer from '@/components/NavDrawer';
import { UserBadge } from '@/components/UserBadge';
import { SEVERITY_TEXT } from '@/lib/severityTheme';

export default function ScanHistoryPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <header className="border-b border-border bg-canvas-raised/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="w-8 h-8 flex items-center justify-center rounded text-ink-muted hover:text-ink hover:bg-canvas-raised transition-colors focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Link href="/" className="text-ink-muted hover:text-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent rounded p-1">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-base font-semibold text-ink">Scan History</h1>
          </div>
          <UserBadge />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {loading && <p className="text-sm text-ink-muted">Loading scan history...</p>}
        {error && (
          <div className="p-3 bg-canvas-overlay border border-severity-critical/30 rounded text-xs text-severity-critical">{error}</div>
        )}

        {!loading && !error && (
          <>
            <RiskTrendChart historyScans={scans} />

            <div className="bg-canvas-raised border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas-overlay border-b border-border">
                  <tr className="text-left text-xs font-semibold text-ink-muted">
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                    <th className="px-4 py-3 text-right">Findings</th>
                    <th className="px-4 py-3 text-right">Risk Score</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {scans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-faint text-xs">
                        No scans yet — run one from the Dashboard.
                      </td>
                    </tr>
                  ) : scans.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-canvas-overlay transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted truncate max-w-[240px]">{s.targetUrl}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            s.status === 'done' ? 'bg-severity-low' : s.status === 'failed' ? 'bg-severity-critical' : 'bg-ink-faint'
                          }`} />
                          <span className={`text-xs ${
                            s.status === 'done' ? 'text-severity-low' : s.status === 'failed' ? 'text-severity-critical' : 'text-ink-muted'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ink-muted">{new Date(s.startedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-mono text-ink-muted text-right">{s.durationSeconds}s</td>
                      <td className="px-4 py-3 text-xs text-ink text-right">
                        {s.totalFindings}
                        {s.criticalCount > 0 && <span className={`ml-1.5 ${SEVERITY_TEXT.critical}`}>({s.criticalCount} crit)</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-semibold ${s.riskScore >= 70 ? SEVERITY_TEXT.critical : s.riskScore >= 40 ? SEVERITY_TEXT.high : SEVERITY_TEXT.low}`}>
                          {s.riskScore}/100
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/vulnerability-matrix?scanId=${s.id}`}
                          className="text-ink-faint hover:text-accent p-1 rounded inline-block transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                          title="View findings in Vulnerability Matrix"
                        >
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
