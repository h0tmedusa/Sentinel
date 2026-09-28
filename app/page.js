'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Menu,
} from 'lucide-react';
import { SEVERITY_ORDER, SEVERITY_COLORS } from '@/lib/severityTheme';
import BrandLoader from '@/components/BrandLoader';
import NavDrawer from '@/components/NavDrawer';
import { UserBadge } from '@/components/UserBadge';
import { useScan } from '@/components/ScanProvider';
import SecurityRadarChart from '@/components/SecurityRadarChart';
import CategoryDistribution from '@/components/CategoryDistribution';

export default function Home() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmAuthorized, setConfirmAuthorized] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [userA, setUserA] = useState({ username: '', password: '' });
  const [userB, setUserB] = useState({ username: '', password: '' });
  const { currentScanData, currentScanStatus, setCurrentScan, clearCurrentScan } = useScan();
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState(currentScanStatus);
  const [scanData, setScanData] = useState(currentScanData);
  const [expandedRows, setExpandedRows] = useState({});
  const [filterSeverity, setFilterSeverity] = useState('all');

  const isScanningRef = useRef(false);
  const pollIntervalRef = useRef(null);
  const pollAttemptsRef = useRef(0);

  // Sync state if context changes externally
  useEffect(() => {
    if (!isScanningRef.current) {
      setScanData(currentScanData);
      setScanStatus(currentScanStatus);
      if (currentScanData?.scan?.targetUrl) {
        setTargetUrl(currentScanData.scan.targetUrl);
      }
    }
  }, [currentScanData, currentScanStatus]);

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

    isScanningRef.current = true;
    setLoading(true);
    setScanStatus('initializing');
    setScanData(null);
    clearCurrentScan();
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
          isScanningRef.current = false;
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
              isScanningRef.current = false;
              setScanData(data);
              setScanStatus(data.scan.status);
              setCurrentScan(data, data.scan.status);
              setLoading(false);
            }
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      isScanningRef.current = false;
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
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <BrandLoader />
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
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
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <h1 className="text-base font-semibold text-ink tracking-tight">Sentinel</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-ink-faint hidden sm:flex items-center gap-2">
              <span>Target Scoped: Localhost / Development Only</span>
            </div>
            <UserBadge />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Target & Config Form */}
        <div className="bg-canvas-raised border border-border rounded-lg p-6">
          <form onSubmit={handleStartScan} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  Target URL (Localhost Instance)
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                  placeholder="http://localhost:3000"
                  className="w-full px-3 py-2 bg-canvas border border-border rounded text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm transition-colors"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAuth(!showAuth)}
                  className={`px-3 py-2 rounded border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent ${
                    showAuth 
                      ? 'bg-canvas-overlay border-border text-ink' 
                      : 'bg-canvas-raised border-border text-ink-muted hover:text-ink hover:bg-canvas-overlay'
                  }`}
                >
                  Credentials {showAuth ? '▲' : '▼'}
                </button>

                <button
                  type="submit"
                  disabled={loading || !confirmAuthorized}
                  title={!confirmAuthorized ? 'Please confirm authorization to enable scanning' : 'Start Security Scan'}
                  className="flex-1 sm:flex-none px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-canvas-raised disabled:text-ink-faint disabled:border disabled:border-border disabled:cursor-not-allowed text-white font-medium text-sm rounded transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Scanning...
                    </>
                  ) : (
                    'Start Scan'
                  )}
                </button>
              </div>
            </div>

            {/* Authorization Confirmation Gate */}
            <label className="flex items-start gap-2.5 p-3 bg-canvas-overlay border border-border rounded cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAuthorized}
                onChange={(e) => setConfirmAuthorized(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border bg-canvas text-accent focus:ring-accent focus:ring-offset-canvas"
              />
              <span className="text-xs text-ink-muted leading-relaxed">
                I confirm I am authorized to run security tests against this target
                (owned system, staging environment, or explicit written authorization).
                Unauthorized scanning of third-party systems may be illegal.
              </span>
            </label>

            {/* Optional Credentials Panel */}
            {showAuth && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                <p className="text-xs text-ink-muted leading-relaxed">
                  Used only by the cross-account access control check: enter the target account&apos;s User ID under User A, and a different account&apos;s API key under User B, to test whether User B can access User A&apos;s private data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-canvas border border-border rounded space-y-3">
                    <div className="text-xs font-semibold text-ink">
                      User A — Resource Owner
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Target User ID — e.g. usr_a1b2c3"
                        value={userA.username}
                        onChange={(e) => setUserA({ ...userA, username: e.target.value })}
                        className="w-full px-3 py-1.5 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        placeholder="(unused — leave blank)"
                        value={userA.password}
                        onChange={(e) => setUserA({ ...userA, password: e.target.value })}
                        className="w-full px-3 py-1.5 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                      />
                      <p className="text-[11px] text-ink-faint">Only the Target User ID above is used for this account.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-canvas border border-border rounded space-y-3">
                    <div className="text-xs font-semibold text-ink">
                      User B — Attempting Cross-Account Access
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Username (optional)"
                        value={userB.username}
                        onChange={(e) => setUserB({ ...userB, username: e.target.value })}
                        className="px-3 py-1.5 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                      />
                      <input
                        type="password"
                        placeholder="Account B's API key"
                        value={userB.password}
                        onChange={(e) => setUserB({ ...userB, password: e.target.value })}
                        className="px-3 py-1.5 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {scanError && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-canvas-overlay border border-severity-critical/30 rounded">
              <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-severity-critical leading-relaxed">{scanError}</div>
              <button
                onClick={() => setScanError(null)}
                className="text-ink-muted hover:text-ink text-xs flex-shrink-0"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Scan Status & Stats Bar */}
        {scanData && (
          <div className="space-y-6">
            <div className="flex items-stretch divide-x divide-border border border-border rounded-lg overflow-hidden bg-canvas-raised">
              <div 
                onClick={() => setFilterSeverity('all')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'all' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-ink">{stats.total}</div>
                <div className="text-xs text-ink-faint mt-0.5">Total</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('critical')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'critical' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-critical">{stats.critical}</div>
                <div className="text-xs text-ink-faint mt-0.5">Critical</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('high')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'high' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-high">{stats.high}</div>
                <div className="text-xs text-ink-faint mt-0.5">High</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('medium')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'medium' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-medium">{stats.medium}</div>
                <div className="text-xs text-ink-faint mt-0.5">Medium</div>
              </div>

              <div 
                onClick={() => setFilterSeverity('low')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'low' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-low">{stats.low}</div>
                <div className="text-xs text-ink-faint mt-0.5">Low</div>
              </div>
            </div>

            {/* Coverage Radar & CWE Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SecurityRadarChart findings={findings} />
              <CategoryDistribution findings={findings} />
            </div>

            <div className="flex items-center justify-between text-xs text-ink-faint px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-ink-faint" />
                <span>Completed in {scanData.scan.finishedAt ? Math.round((new Date(scanData.scan.finishedAt) - new Date(scanData.scan.startedAt)) / 1000) : 0}s</span>
                <span>•</span>
                <span>Scan ID: <code className="text-ink-muted font-mono">{scanData.scan.id}</code></span>
              </div>
              <div>
                Showing: <span className="font-medium text-ink capitalize">{filterSeverity}</span> ({sortedFindings.length})
              </div>
            </div>
          </div>
        )}

        {/* Findings List */}
        {scanData && (
          <div className="space-y-3">
            {sortedFindings.length === 0 ? (
              <div className="p-12 text-center bg-canvas-raised border border-border rounded-lg">
                <CheckCircle2 className="w-10 h-10 text-severity-low mx-auto mb-3 opacity-80" />
                <h3 className="text-sm font-semibold text-ink">No findings matching current filter</h3>
                <p className="text-xs text-ink-muted mt-1">All verified checks for this severity level returned positive compliance.</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-canvas-raised">
                {sortedFindings.map((finding) => {
                  const isExpanded = !!expandedRows[finding.id];
                  return (
                    <div key={finding.id} className="transition-colors">
                      {/* Collapsible Row Header */}
                      <div
                        onClick={() => toggleRow(finding.id)}
                        className="p-4 cursor-pointer flex items-center justify-between gap-4 select-none hover:bg-canvas-overlay transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-ink-muted flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-ink-muted flex-shrink-0" />
                          )}

                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wide flex-shrink-0 ${
                              SEVERITY_COLORS[finding.severity] || 'bg-canvas text-ink'
                            }`}
                          >
                            {finding.severity}
                          </span>

                          <div className="truncate">
                            <span className="font-medium text-sm text-ink">
                              {finding.title}
                            </span>
                            <span className="ml-2 text-xs text-ink-faint font-mono hidden sm:inline">
                              [{finding.category}]
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded bg-canvas border border-border text-ink-muted font-mono hidden md:inline">
                            {finding.confidence}
                          </span>
                          <span className="text-xs text-ink-faint hidden lg:inline">
                            {finding.checkId}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="p-6 border-t border-border bg-canvas space-y-5 text-sm">
                          {/* Meta row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-canvas-raised rounded border border-border text-xs">
                            <div>
                              <span className="text-ink-faint block">Affected Component:</span>
                              <span className="font-mono text-ink-muted break-all">{finding.affectedComponent}</span>
                            </div>
                            <div>
                              <span className="text-ink-faint block">Reference Score:</span>
                              <span className="font-mono text-ink-muted">{finding.referenceScore || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-ink-faint block">Category:</span>
                              <span className="capitalize text-ink font-medium">{finding.category}</span>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <h4 className="text-xs font-semibold text-ink mb-1">
                              Description
                            </h4>
                            <p className="text-ink-muted leading-relaxed text-sm">{finding.description}</p>
                          </div>

                          {/* Steps to Reproduce */}
                          {finding.stepsToReproduce && (
                            <div>
                              <h4 className="text-xs font-semibold text-ink mb-1">
                                Steps to Reproduce
                              </h4>
                              <pre className="p-3 bg-canvas-raised border border-border rounded text-xs font-mono text-ink-muted whitespace-pre-wrap leading-relaxed">
                                {finding.stepsToReproduce}
                              </pre>
                            </div>
                          )}

                          {/* Evidence View */}
                          {finding.evidence && (
                            <div>
                              <h4 className="text-xs font-semibold text-ink mb-1">
                                Observed HTTP Evidence
                              </h4>
                              <pre className="p-3 bg-canvas-raised border border-border rounded text-xs font-mono text-ink-muted overflow-x-auto max-h-72 overflow-y-auto leading-relaxed">
                                {typeof finding.evidence === 'object'
                                  ? JSON.stringify(finding.evidence, null, 2)
                                  : finding.evidence}
                              </pre>
                            </div>
                          )}

                          {/* Business Impact & Remediation */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-canvas-raised border border-border rounded space-y-1">
                              <h5 className="text-xs font-semibold text-ink">
                                Operational / Business Impact
                              </h5>
                              <p className="text-xs text-ink-muted leading-relaxed">{finding.businessImpact}</p>
                            </div>

                            <div className="p-4 bg-canvas-raised border border-border rounded space-y-1">
                              <h5 className="text-xs font-semibold text-ink">
                                Remediation Guidance
                              </h5>
                              <p className="text-xs text-ink-muted leading-relaxed">{finding.remediation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-canvas py-4 text-center text-xs text-ink-faint">
        Sentinel Compliance &amp; Automated Security Engine • Hackathon Phase 1 • Local Target Environment
      </footer>
    </div>
  );
}
