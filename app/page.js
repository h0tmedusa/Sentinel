'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Loader2, 
  Search, 
  Terminal, 
  Key, 
  User, 
  Layers, 
  Clock,
  Menu,
} from 'lucide-react';
import { SEVERITY_ORDER, SEVERITY_COLORS, SEVERITY_BADGE } from '@/lib/severityTheme';
import BrandLoader from '@/components/BrandLoader';
import NavDrawer from '@/components/NavDrawer';

export default function Home() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmAuthorized, setConfirmAuthorized] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [userA, setUserA] = useState({ username: '', password: '' });
  const [userB, setUserB] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [filterSeverity, setFilterSeverity] = useState('all');

  const pollIntervalRef = useRef(null);
  const pollAttemptsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!targetUrl) return;

    if (!confirmAuthorized) {
      setScanError('You must confirm authorization before starting a scan.');
      return;
    }

    setLoading(true);
    setScanStatus('initializing');
    setScanData(null);
    setScanError(null);
    setExpandedRows({});

    try {
      const payload = {
        targetUrl,
        confirmAuthorized: true,
        credentials: {
          userA: userA.username ? userA : undefined,
          userB: userB.username ? userB : undefined,
          userAId: userA.username || undefined,
          userBApiKey: userB.password || userB.username || undefined,
        },
      };

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start scan');
      }

      const { scanId } = await res.json();
      setScanStatus('running');

      const MAX_POLL_ATTEMPTS = 90; // 90 seconds at 1000ms interval
      pollAttemptsRef.current = 0;

      pollIntervalRef.current = setInterval(async () => {
        pollAttemptsRef.current += 1;

        if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setScanStatus('failed');
          setScanError('Scan timed out after 90 seconds without completing. The target may be unreachable or a check may be hanging.');
          setLoading(false);
          return;
        }

        try {
          const checkRes = await fetch(`/api/scans/${scanId}`);
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (data.scan && (data.scan.status === 'done' || data.scan.status === 'failed')) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              setScanData(data);
              setScanStatus(data.scan.status);
              setLoading(false);
            }
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setScanError(err.message || 'Failed to start scan. Please try again.');
      setLoading(false);
      setScanStatus('error');
    }
  };

  // Group and sort findings
  const findings = scanData?.findings || [];
  const filteredFindings = findings.filter((f) => {
    if (filterSeverity === 'all') return true;
    return f.severity === filterSeverity;
  });

  const sortedFindings = [...filteredFindings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] || 99) - (SEVERITY_ORDER[b.severity] || 99)
  );

  const stats = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <BrandLoader />
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mr-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">SENTINEL</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                  PHASE 1
                </span>
              </div>
              <p className="text-xs text-slate-400">Security Assessment &amp; Compliance Engine</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center space-x-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Target Scoped: Localhost / Development Only</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Target & Config Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleStartScan} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Target URL (Localhost Instance)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    required
                    placeholder="http://localhost:3000"
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAuth(!showAuth)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2 whitespace-nowrap ${
                    showAuth 
                      ? 'bg-slate-800 border-slate-700 text-slate-200' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  Credentials {showAuth ? '▲' : '▼'}
                </button>

                <button
                  type="submit"
                  disabled={loading || !confirmAuthorized}
                  title={!confirmAuthorized ? 'Please confirm authorization to enable scanning' : 'Start Security Scan'}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700/60 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Start Scan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Authorization Confirmation Gate */}
            <label className="flex items-start gap-3 p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAuthorized}
                onChange={(e) => setConfirmAuthorized(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-slate-950"
              />
              <span className="text-xs text-amber-200 leading-relaxed">
                I confirm I am authorized to run security tests against this target
                (owned system, staging environment, or explicit written authorization).
                Unauthorized scanning of third-party systems may be illegal.
              </span>
            </label>

            {/* Optional Credentials Panel */}
            {showAuth && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Used only by the cross-account access control check: enter the target account&apos;s User ID under User A, and a different account&apos;s API key under User B, to test whether User B can access User A&apos;s private data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5" />
                      User A — Resource Owner
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Target User ID — e.g. usr_a1b2c3"
                        value={userA.username}
                        onChange={(e) => setUserA({ ...userA, username: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="(unused — leave blank)"
                        value={userA.password}
                        onChange={(e) => setUserA({ ...userA, password: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-slate-500">Only the Target User ID above is used for this account.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5" />
                      User B — Attempting Cross-Account Access
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Username (optional)"
                        value={userB.username}
                        onChange={(e) => setUserB({ ...userB, username: e.target.value })}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="password"
                        placeholder="Account B's API key"
                        value={userB.password}
                        onChange={(e) => setUserB({ ...userB, password: e.target.value })}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {scanError && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-red-950/30 border border-red-900/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-red-300 leading-relaxed">{scanError}</div>
              <button
                onClick={() => setScanError(null)}
                className="text-red-400 hover:text-red-200 text-xs flex-shrink-0"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Scan Status & Stats Bar */}
        {scanData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div 
                onClick={() => setFilterSeverity('all')}
                className={`cursor-pointer p-4 rounded-xl border transition ${
                  filterSeverity === 'all' 
                    ? 'bg-slate-800 border-slate-600' 
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <div className="text-xs text-slate-400 uppercase tracking-wider">Total Findings</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('critical')}
                className={`cursor-pointer p-4 rounded-xl border transition ${
                  filterSeverity === 'critical' 
                    ? 'bg-red-950/40 border-red-500' 
                    : 'bg-slate-900/40 border-slate-800 hover:border-red-900/50'
                }`}
              >
                <div className="text-xs text-red-400 uppercase tracking-wider">Critical</div>
                <div className="text-2xl font-bold text-red-400 mt-1">{stats.critical}</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('high')}
                className={`cursor-pointer p-4 rounded-xl border transition ${
                  filterSeverity === 'high' 
                    ? 'bg-orange-950/40 border-orange-500' 
                    : 'bg-slate-900/40 border-slate-800 hover:border-orange-900/50'
                }`}
              >
                <div className="text-xs text-orange-400 uppercase tracking-wider">High</div>
                <div className="text-2xl font-bold text-orange-400 mt-1">{stats.high}</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('medium')}
                className={`cursor-pointer p-4 rounded-xl border transition ${
                  filterSeverity === 'medium' 
                    ? 'bg-yellow-950/40 border-yellow-500' 
                    : 'bg-slate-900/40 border-slate-800 hover:border-yellow-900/50'
                }`}
              >
                <div className="text-xs text-yellow-400 uppercase tracking-wider">Medium</div>
                <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.medium}</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('low')}
                className={`cursor-pointer p-4 rounded-xl border transition ${
                  filterSeverity === 'low' 
                    ? 'bg-blue-950/40 border-blue-500' 
                    : 'bg-slate-900/40 border-slate-800 hover:border-blue-900/50'
                }`}
              >
                <div className="text-xs text-blue-400 uppercase tracking-wider">Low</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{stats.low}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Scan Completed in {scanData.scan.finishedAt ? Math.round((new Date(scanData.scan.finishedAt) - new Date(scanData.scan.startedAt)) / 1000) : 0}s</span>
                <span className="text-slate-600">•</span>
                <span>Scan ID: <code className="text-slate-300 font-mono">{scanData.scan.id}</code></span>
              </div>
              <div>
                Showing: <span className="font-semibold text-slate-200 capitalize">{filterSeverity}</span> ({sortedFindings.length})
              </div>
            </div>
          </div>
        )}

        {/* Findings List */}
        {scanData && (
          <div className="space-y-3">
            {sortedFindings.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/20 border border-slate-800/80 rounded-xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-semibold text-slate-200">No findings matching current filter</h3>
                <p className="text-sm text-slate-500 mt-1">All verified checks for this severity level returned positive compliance.</p>
              </div>
            ) : (
              sortedFindings.map((finding) => {
                const isExpanded = !!expandedRows[finding.id];
                return (
                  <div
                    key={finding.id}
                    className="border border-slate-800/80 rounded-xl bg-slate-900/40 overflow-hidden transition-all duration-200 hover:border-slate-700/80"
                  >
                    {/* Collapsible Row Header */}
                    <div
                      onClick={() => toggleRow(finding.id)}
                      className="p-4 cursor-pointer flex items-center justify-between gap-4 select-none hover:bg-slate-850/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}

                        <span
                          className={`text-xs uppercase font-bold px-2 py-0.5 rounded border tracking-wider flex-shrink-0 ${
                            SEVERITY_COLORS[finding.severity] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {finding.severity}
                        </span>

                        <div className="truncate">
                          <span className="font-semibold text-sm text-slate-100 hover:text-emerald-400 transition">
                            {finding.title}
                          </span>
                          <span className="ml-2 text-xs text-slate-500 font-mono hidden sm:inline">
                            [{finding.category}]
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300 font-mono hidden md:inline">
                          {finding.confidence}
                        </span>
                        <span className="text-xs text-slate-500 font-mono hidden lg:inline">
                          {finding.checkId}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-800 bg-slate-950/70 space-y-5 text-sm">
                        {/* Meta row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-xs">
                          <div>
                            <span className="text-slate-500 block">Affected Component:</span>
                            <span className="font-mono text-slate-200 break-all">{finding.affectedComponent}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Reference Score:</span>
                            <span className="font-mono text-slate-200">{finding.referenceScore || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Category:</span>
                            <span className="capitalize text-slate-200 font-medium">{finding.category}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Description
                          </h4>
                          <p className="text-slate-300 leading-relaxed text-sm">{finding.description}</p>
                        </div>

                        {/* Steps to Reproduce */}
                        {finding.stepsToReproduce && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Steps to Reproduce
                            </h4>
                            <pre className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {finding.stepsToReproduce}
                            </pre>
                          </div>
                        )}

                        {/* Evidence View */}
                        {finding.evidence && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                              Observed HTTP Evidence (Raw Observation)
                            </h4>
                            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed">
                              {typeof finding.evidence === 'object'
                                ? JSON.stringify(finding.evidence, null, 2)
                                : finding.evidence}
                            </pre>
                          </div>
                        )}

                        {/* Business Impact & Remediation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg space-y-1">
                            <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                              Operational / Business Impact
                            </h5>
                            <p className="text-xs text-slate-300 leading-relaxed">{finding.businessImpact}</p>
                          </div>

                          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-lg space-y-1">
                            <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              Remediation Guidance
                            </h5>
                            <p className="text-xs text-slate-300 leading-relaxed">{finding.remediation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Sentinel Compliance & Automated Security Engine • Hackathon Phase 1 • Local Target Environment
      </footer>
    </div>
  );
}
