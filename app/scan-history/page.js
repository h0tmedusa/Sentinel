'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Search, History, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import RiskTrendChart from '@/components/RiskTrendChart';
import { SEVERITY_TEXT } from '@/lib/severityTheme';

export default function ScanHistoryPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const matchesSearch = !search || s.targetUrl?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [scans, search, statusFilter]);

  const stats = useMemo(() => ({
    total: scans.length,
    completed: scans.filter((s) => s.status === 'done').length,
    failed: scans.filter((s) => s.status === 'failed').length,
    totalFindings: scans.reduce((acc, s) => acc + (s.totalFindings || 0), 0),
    totalCritical: scans.reduce((acc, s) => acc + (s.criticalCount || 0), 0),
  }), [scans]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-border bg-canvas-raised/80 backdrop-blur-md sticky top-0 z-10 hidden lg:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-ink tracking-tight">Scan History</h1>
            <span className="text-xs text-ink-faint hidden sm:inline">• Historical Assessment Archive</span>
          </div>
          <div className="text-xs text-ink-faint font-mono">
            Ledger Records: <span className="text-ink font-medium">{scans.length}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1 w-full">
        {/* Mobile Header Banner (Visible on mobile only) */}
        <div className="lg:hidden flex items-center justify-between gap-2 pb-1">
          <div>
            <h1 className="text-base font-semibold text-ink tracking-tight">Scan History</h1>
            <p className="text-xs text-ink-faint">Historical Assessment Archive</p>
          </div>
          <span className="text-[11px] font-mono text-ink-faint px-2 py-0.5 rounded-md bg-canvas-overlay border border-border">
            {scans.length} Entries
          </span>
        </div>

        {loading && (
          <div role="status" aria-live="polite" className="flex items-center gap-3 text-xs text-ink-muted p-4 bg-canvas-raised border border-border rounded-xl shadow-subtle">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>Loading historical assessment ledger records...</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 bg-canvas-overlay border border-severity-critical/40 rounded-xl text-xs text-severity-critical flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {!loading && !error && scans.length === 0 && (
          <div className="p-10 sm:p-12 text-center bg-canvas-raised border border-border rounded-xl shadow-subtle">
            <div className="w-12 h-12 rounded-lg bg-canvas-overlay border border-border flex items-center justify-center mx-auto mb-3.5 text-ink-faint">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-ink">No Scan History Recorded</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto leading-relaxed">
              No historical security scans exist in this workspace. Configure a target and launch an assessment from the Dashboard.
            </p>
          </div>
        )}

        {!loading && !error && scans.length > 0 && (
          <>
            {/* Quick Metrics Module (Unified module matching Dashboard and Matrix) */}
            <div className="bg-canvas-raised border border-border rounded-xl shadow-subtle p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-canvas border border-border/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-ink-muted font-medium">Total Scans</div>
                    <div className="text-2xl font-semibold text-ink font-mono mt-0.5">{stats.total}</div>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-ink-faint px-1.5 py-0.5 rounded bg-canvas-raised border border-border">RUNS</span>
                </div>

                <div className="p-3 bg-canvas border border-border/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-ink-muted font-medium">Completed (Pass)</div>
                    <div className="text-2xl font-semibold text-severity-low font-mono mt-0.5">{stats.completed}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-severity-low" />
                </div>

                <div className="p-3 bg-canvas border border-border/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-ink-muted font-medium">Total Findings</div>
                    <div className="text-2xl font-semibold text-ink font-mono mt-0.5">{stats.totalFindings}</div>
                  </div>
                  <span className="text-[10px] font-mono text-ink-faint">LOGGED</span>
                </div>

                <div className="p-3 bg-canvas border border-border/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-ink-muted font-medium">Critical Vulns</div>
                    <div className="text-2xl font-semibold text-severity-critical font-mono mt-0.5">{stats.totalCritical}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-severity-critical" />
                </div>
              </div>
            </div>

            {/* Risk Score Sparkline Trend */}
            <RiskTrendChart historyScans={scans} />

            {/* Filter and Search Controls */}
            <div className="p-4 bg-canvas-raised border border-border rounded-xl shadow-subtle space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search by target endpoint URL"
                    placeholder="Search by target endpoint URL..."
                    className="w-full h-10 pl-9 pr-4 bg-canvas border border-border rounded-md text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter scans by execution status"
                  className="h-10 text-xs bg-canvas border border-border rounded-md px-3 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                >
                  <option value="all">All Execution Statuses</option>
                  <option value="done">Completed (Done)</option>
                  <option value="failed">Failed / Timed Out</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-ink-faint px-0.5">
                <span>Displaying <strong className="text-ink font-mono">{filteredScans.length}</strong> of {scans.length} logs</span>
                {(search || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                    className="text-accent hover:underline text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {/* Assessment Execution Ledger Table (Dense professional archive table) */}
            <div className="bg-canvas-raised border border-border rounded-xl overflow-hidden shadow-subtle">
              <div className="px-5 py-3 border-b border-border bg-canvas-overlay/40 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">Assessment Execution Ledger</h2>
                <span className="text-[11px] font-mono text-ink-faint">Direct matrix inspection</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[680px]">
                  <thead className="bg-canvas-overlay border-b border-border">
                    <tr className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                      <th className="px-4 py-3">Target Endpoint</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Started Timestamp</th>
                      <th className="px-4 py-3 text-right">Duration</th>
                      <th className="px-4 py-3 text-right">Findings</th>
                      <th className="px-4 py-3 text-right">Risk Score</th>
                      <th className="px-4 py-3 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredScans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-ink-faint text-xs">
                          No scan logs match your search query or filter selection.
                        </td>
                      </tr>
                    ) : filteredScans.map((s) => (
                      <tr key={s.id} className="hover:bg-canvas-overlay/60 transition-colors group">
                        <td className="px-4 py-3 font-mono text-ink max-w-[240px] truncate font-medium">
                          {s.targetUrl}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              s.status === 'done' ? 'bg-severity-low' : s.status === 'failed' ? 'bg-severity-critical' : 'bg-ink-faint'
                            }`} />
                            <span className={`uppercase font-medium ${
                              s.status === 'done' ? 'text-severity-low' : s.status === 'failed' ? 'text-severity-critical' : 'text-ink-muted'
                            }`}>
                              {s.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-muted text-[11px] whitespace-nowrap">
                          {new Date(s.startedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-muted text-right text-[11px] whitespace-nowrap">
                          {s.durationSeconds}s
                        </td>
                        <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                          <span className="text-ink font-medium">{s.totalFindings}</span>
                          {s.criticalCount > 0 && (
                            <span className={`ml-1.5 ${SEVERITY_TEXT.critical}`}>
                              ({s.criticalCount} crit)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                          <span className={`font-semibold ${s.riskScore >= 70 ? SEVERITY_TEXT.critical : s.riskScore >= 40 ? SEVERITY_TEXT.high : SEVERITY_TEXT.low}`}>
                            {s.riskScore}/100
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <Link
                            href={`/vulnerability-matrix?scanId=${s.id}`}
                            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium px-2.5 py-1 rounded-md border border-accent/25 hover:border-accent/40 bg-accent-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            title="Open scan in Vulnerability Matrix"
                            aria-label={`Inspect scan for ${s.targetUrl}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
