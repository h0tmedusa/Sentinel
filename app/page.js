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
  Key,
  KeyRound,
  Play,
  Layers,
  FileSearch,
  ExternalLink,
  Code2,
  Terminal,
  Check,
} from 'lucide-react';
import { SEVERITY_ORDER, SEVERITY_COLORS } from '@/lib/severityTheme';
import BrandLoader from '@/components/BrandLoader';
import { useScan } from '@/components/ScanProvider';
import SecurityRadarChart from '@/components/SecurityRadarChart';
import CategoryDistribution from '@/components/CategoryDistribution';

export default function Home() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');
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
    <div className="flex-1 flex flex-col min-w-0">
      <BrandLoader />

      {/* 1. Header Bar: Refined Enterprise SOC Status Header */}
      <header className="border-b border-border bg-canvas-raised/80 backdrop-blur-md sticky top-0 z-10 hidden lg:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold text-ink tracking-tight">Security Dashboard</h1>
            <span className="text-xs text-ink-faint hidden sm:inline">• Automated Assessment &amp; Validation</span>
          </div>

          <div className="flex items-center gap-3 text-xs flex-shrink-0">
            {/* Live Scan Status Pill */}
            {loading ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-muted border border-accent/30 text-accent font-medium font-mono text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {scanStatus === 'initializing' ? 'INITIALIZING ENGINE' : 'SCAN IN PROGRESS'}
              </span>
            ) : scanData ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas-overlay border border-border text-ink-muted text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ASSESSMENT LOADED ({findings.length} findings)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas-overlay border border-border text-ink-faint text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
                READY FOR ASSESSMENT
              </span>
            )}
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-ink-faint hidden sm:inline font-mono text-[11px]">Scope: Localhost / Dev Only</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6">

        {/* Mobile Header Banner (Visible on mobile only) */}
        <div className="lg:hidden flex flex-col gap-1 pb-1">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold text-ink tracking-tight">Security Dashboard</h1>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-muted border border-accent/30 text-accent font-medium font-mono text-[10px]">
                <Loader2 className="w-3 h-3 animate-spin" />
                SCANNING
              </span>
            ) : scanData ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas-overlay border border-border text-ink-muted text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {findings.length} FINDINGS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas-overlay border border-border text-ink-faint text-[10px] font-mono">
                READY
              </span>
            )}
          </div>
          <p className="text-xs text-ink-faint">Automated Assessment &amp; Validation • Dev Scope</p>
        </div>

        {/* LEVEL 1: Primary Action — Scan Configuration Console */}
        <section aria-label="Scan Configuration" className="bg-canvas-raised border border-border rounded-xl shadow-raised overflow-hidden">
          {/* Section Header */}
          <div className="px-5 py-3 border-b border-border bg-canvas-overlay/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">Target Assessment Console</h2>
            </div>
            <span className="text-[11px] font-mono text-ink-faint">11 Audit Vectors</span>
          </div>

          <div className="p-5 sm:p-6">
            <form onSubmit={handleStartScan} className="space-y-4">
              {/* Primary Target Input + CTA Button */}
              <div className="space-y-1.5">
                <label htmlFor="target-endpoint-url" className="block text-xs font-medium text-ink">
                  Target Endpoint URL <span className="text-accent">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                  <div className="relative flex-1">
                    <input
                      id="target-endpoint-url"
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="http://localhost:3000"
                      className="w-full h-10 px-3.5 bg-canvas border border-border rounded-md text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAuth(!showAuth)}
                      aria-expanded={showAuth}
                      aria-controls="credentials-panel"
                      className={`h-10 px-3.5 rounded-md border text-xs font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        showAuth 
                          ? 'bg-canvas-overlay border-border text-ink' 
                          : 'bg-canvas border-border text-ink-muted hover:text-ink hover:bg-canvas-overlay'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-ink-muted" />
                      <span>Credentials</span>
                      <span className="text-[10px] text-ink-faint">{showAuth ? '▲' : '▼'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !confirmAuthorized}
                      title={!confirmAuthorized ? 'Please confirm authorization below to start scan' : 'Start Security Scan'}
                      className="h-10 px-5 bg-accent hover:bg-accent-hover active:bg-accent disabled:bg-canvas-raised disabled:text-ink-faint disabled:border disabled:border-border disabled:cursor-not-allowed text-white font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm min-w-[124px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-white fill-current flex-shrink-0" />
                          <span>Start Scan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Distinct Authorization Confirmation Control */}
              <div className={`p-3.5 rounded-md border transition-all ${
                confirmAuthorized 
                  ? 'bg-canvas-overlay/70 border-accent/40 shadow-sm' 
                  : 'bg-canvas/50 border-border hover:border-ink-faint/60'
              }`}>
                <label htmlFor="confirm-authorization-checkbox" className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="confirm-authorization-checkbox"
                    type="checkbox"
                    checked={confirmAuthorized}
                    onChange={(e) => setConfirmAuthorized(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 w-4 h-4 rounded border-border bg-canvas text-accent focus:ring-accent focus:ring-offset-canvas cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-ink block sm:inline">Legal Assessment Authorization: </span>
                    <span className="text-ink-muted leading-relaxed">
                      I verify authorization to execute automated security assessment checks against this endpoint
                      (local instance, staging environment, or authorized target scope).
                    </span>
                  </div>
                </label>
              </div>

              {/* Collapsible Cross-Account Credentials Panel */}
              {showAuth && (
                <div id="credentials-panel" className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Key className="w-3.5 h-3.5 text-accent" />
                    <span>Cross-Account Access Control Testing (BOLA/IDOR Vector):</span>
                  </div>
                  <p className="text-xs text-ink-faint leading-relaxed">
                    Provide the resource owner target under User A, and an attacker or alternate tenant credentials under User B. The engine will verify object isolation.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-canvas border border-border rounded-md space-y-2.5">
                      <div className="text-xs font-semibold text-ink flex items-center justify-between">
                        <span>User A (Resource Owner)</span>
                        <span className="text-[10px] font-mono text-ink-faint">Account Owner</span>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          aria-label="User A Target User ID"
                          placeholder="Target User ID (e.g. usr_a1b2c3)"
                          value={userA.username}
                          onChange={(e) => setUserA({ ...userA, username: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                        <input
                          type="text"
                          aria-label="User A Password (optional)"
                          placeholder="(Password unused — leave blank)"
                          value={userA.password}
                          onChange={(e) => setUserA({ ...userA, password: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border rounded-md space-y-2.5">
                      <div className="text-xs font-semibold text-ink flex items-center justify-between">
                        <span>User B (Cross-Account Attacker)</span>
                        <span className="text-[10px] font-mono text-ink-faint">Testing Persona</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          aria-label="User B Username"
                          placeholder="Username (optional)"
                          value={userB.username}
                          onChange={(e) => setUserB({ ...userB, username: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                        <input
                          type="password"
                          aria-label="User B API key"
                          placeholder="Account B API key"
                          value={userB.password}
                          onChange={(e) => setUserB({ ...userB, password: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Error Message Display */}
            {scanError && (
              <div role="alert" className="mt-4 flex items-start gap-3 p-3 bg-canvas-overlay border border-severity-critical/40 rounded-md text-xs animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-severity-critical leading-relaxed">{scanError}</div>
                <button
                  onClick={() => setScanError(null)}
                  className="text-ink-muted hover:text-ink text-xs flex-shrink-0 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Running State Banner (While scan is in flight) */}
        {loading && (
          <section aria-label="Scan in Progress" className="bg-canvas-raised border border-accent/40 rounded-xl p-5 flex items-center gap-4 shadow-subtle animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-accent-muted border border-accent/30 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                  {scanStatus === 'initializing' ? 'INITIALIZING ENGINE VECTORS' : 'EXECUTING AUTOMATED AUDIT'}
                </h3>
                <span className="text-[11px] text-ink-faint">• Target: <span className="font-mono text-ink-muted">{targetUrl}</span></span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Probing security response headers, access boundaries, authentication tokens, and injection vectors.
              </p>
            </div>
          </section>
        )}

        {/* Empty State (When no scan has been executed yet) */}
        {!loading && !scanData && (
          <section aria-label="No Assessment" className="bg-canvas-raised border border-border rounded-xl p-10 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-lg bg-canvas-overlay border border-border flex items-center justify-center mx-auto mb-3.5 text-ink-faint">
              <FileSearch className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-ink">Ready for Assessment</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto leading-relaxed">
              Configure a target endpoint URL above, confirm authorization, and click <strong className="text-ink font-medium">Start Scan</strong> to begin automated security testing.
            </p>
          </section>
        )}

        {/* LEVEL 2: Security State — Metrics Summary Module & Integrated Charts */}
        {scanData && (
          <section aria-label="Security Metrics Summary" className="space-y-4">
            {/* Section Header & Scan Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">Assessment Security Summary</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Duration: {scanData.scan.finishedAt ? Math.round((new Date(scanData.scan.finishedAt) - new Date(scanData.scan.startedAt)) / 1000) : 0}s</span>
                  <span>•</span>
                  <span>Target: <span className="font-mono text-ink-muted">{scanData.scan.targetUrl || targetUrl}</span></span>
                  <span>•</span>
                  <span>Scan ID: <code className="text-ink-muted font-mono">{scanData.scan.id}</code></span>
                </div>
              </div>

              <div className="text-xs text-ink-faint">
                Showing: <span className="font-medium text-ink capitalize">{filterSeverity}</span> ({sortedFindings.length} of {findings.length} findings)
              </div>
            </div>

            {/* Unified Security Summary Module (Single bordered container) */}
            <div className="bg-canvas-raised border border-border rounded-xl shadow-subtle p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Total Findings */}
                <button 
                  type="button"
                  onClick={() => setFilterSeverity('all')}
                  aria-pressed={filterSeverity === 'all'}
                  aria-label={`Show all ${stats.total} findings`}
                  className={`col-span-2 sm:col-span-1 p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    filterSeverity === 'all'
                      ? 'bg-canvas-overlay border-accent shadow-sm ring-1 ring-accent'
                      : 'bg-canvas border-border/80 hover:bg-canvas-overlay hover:border-ink-faint/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-ink-muted text-xs">
                    <span className="font-medium">Total Findings</span>
                    <span className="text-[10px] font-mono uppercase text-ink-faint">All</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight font-mono">{stats.total}</span>
                    <span className="text-[11px] text-ink-faint">detected</span>
                  </div>
                </button>

                {/* Critical */}
                <button 
                  type="button"
                  onClick={() => setFilterSeverity('critical')}
                  aria-pressed={filterSeverity === 'critical'}
                  aria-label={`Filter by critical severity, ${stats.critical} findings`}
                  className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    filterSeverity === 'critical'
                      ? 'bg-severity-critical/15 border-severity-critical ring-1 ring-severity-critical'
                      : 'bg-canvas border-border/80 hover:bg-canvas-overlay hover:border-severity-critical/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-muted">Critical</span>
                    <span className="w-2 h-2 rounded-full bg-severity-critical flex-shrink-0" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-semibold text-severity-critical tracking-tight font-mono">{stats.critical}</span>
                    <span className="text-[11px] text-ink-faint">high-risk</span>
                  </div>
                </button>

                {/* High */}
                <button 
                  type="button"
                  onClick={() => setFilterSeverity('high')}
                  aria-pressed={filterSeverity === 'high'}
                  aria-label={`Filter by high severity, ${stats.high} findings`}
                  className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    filterSeverity === 'high'
                      ? 'bg-severity-high/15 border-severity-high ring-1 ring-severity-high'
                      : 'bg-canvas border-border/80 hover:bg-canvas-overlay hover:border-severity-high/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-muted">High</span>
                    <span className="w-2 h-2 rounded-full bg-severity-high flex-shrink-0" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-semibold text-severity-high tracking-tight font-mono">{stats.high}</span>
                    <span className="text-[11px] text-ink-faint">urgent</span>
                  </div>
                </button>

                {/* Medium */}
                <button 
                  type="button"
                  onClick={() => setFilterSeverity('medium')}
                  aria-pressed={filterSeverity === 'medium'}
                  aria-label={`Filter by medium severity, ${stats.medium} findings`}
                  className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    filterSeverity === 'medium'
                      ? 'bg-severity-medium/15 border-severity-medium ring-1 ring-severity-medium'
                      : 'bg-canvas border-border/80 hover:bg-canvas-overlay hover:border-severity-medium/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-muted">Medium</span>
                    <span className="w-2 h-2 rounded-full bg-severity-medium flex-shrink-0" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-semibold text-severity-medium tracking-tight font-mono">{stats.medium}</span>
                    <span className="text-[11px] text-ink-faint">moderate</span>
                  </div>
                </button>

                {/* Low */}
                <button 
                  type="button"
                  onClick={() => setFilterSeverity('low')}
                  aria-pressed={filterSeverity === 'low'}
                  aria-label={`Filter by low severity, ${stats.low} findings`}
                  className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    filterSeverity === 'low'
                      ? 'bg-severity-low/15 border-severity-low ring-1 ring-severity-low'
                      : 'bg-canvas border-border/80 hover:bg-canvas-overlay hover:border-severity-low/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-muted">Low</span>
                    <span className="w-2 h-2 rounded-full bg-severity-low flex-shrink-0" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-semibold text-severity-low tracking-tight font-mono">{stats.low}</span>
                    <span className="text-[11px] text-ink-faint">informational</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Integrated Visualizations (Radar & CWE Distribution) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SecurityRadarChart findings={findings} />
              <CategoryDistribution findings={findings} />
            </div>
          </section>
        )}

        {/* LEVEL 3: Detail — Structured Security Findings */}
        {scanData && (
          <section aria-label="Detailed Findings" className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
                  Security Findings ({sortedFindings.length})
                </h2>
                {filterSeverity !== 'all' && (
                  <span className="text-[11px] font-mono text-accent">
                    [Filtered by: {filterSeverity}]
                  </span>
                )}
              </div>
              {filterSeverity !== 'all' && (
                <button
                  onClick={() => setFilterSeverity('all')}
                  className="text-xs text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent rounded"
                >
                  Reset filter (show all {findings.length})
                </button>
              )}
            </div>

            {/* Zero Findings State for Completed Scan vs Filtered Out */}
            {findings.length === 0 ? (
              <div className="p-12 text-center bg-canvas-raised border border-border rounded-xl shadow-subtle">
                <CheckCircle2 className="w-10 h-10 text-severity-low mx-auto mb-3 opacity-90" />
                <h3 className="text-sm font-semibold text-ink">No Vulnerabilities Detected</h3>
                <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto leading-relaxed">
                  All automated checks against <span className="font-mono text-ink">{targetUrl}</span> passed cleanly. No security findings were identified.
                </p>
              </div>
            ) : sortedFindings.length === 0 ? (
              <div className="p-10 text-center bg-canvas-raised border border-border rounded-xl shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-canvas-overlay border border-border flex items-center justify-center mx-auto mb-2.5 text-ink-faint">
                  <CheckCircle2 className="w-4 h-4 text-severity-low" />
                </div>
                <h3 className="text-sm font-semibold text-ink">No Findings for Current Severity</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Zero vulnerabilities were categorized under the <strong className="text-ink font-medium capitalize">{filterSeverity}</strong> severity tier.
                </p>
                <button
                  onClick={() => setFilterSeverity('all')}
                  className="mt-3 text-xs text-accent hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                >
                  View all {findings.length} findings
                </button>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-canvas-raised shadow-subtle">
                {sortedFindings.map((finding) => {
                  const isExpanded = !!expandedRows[finding.id];
                  return (
                    <div key={finding.id} className="transition-colors">
                      {/* Findings Row Header */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${finding.severity} severity finding: ${finding.title}. Click or press Enter to expand details.`}
                        onClick={() => toggleRow(finding.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleRow(finding.id);
                          }
                        }}
                        className={`p-3.5 sm:p-4 cursor-pointer flex items-center justify-between gap-3 sm:gap-4 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          isExpanded ? 'bg-canvas-overlay/70' : 'hover:bg-canvas-overlay/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Severity Indicator Badge */}
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border tracking-wide flex-shrink-0 min-w-[62px] text-center ${
                              SEVERITY_COLORS[finding.severity] || 'bg-canvas text-ink border-border'
                            }`}
                          >
                            {finding.severity}
                          </span>

                          {/* Finding Title & Secondary Context */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs sm:text-sm text-ink truncate leading-tight">
                                {finding.title}
                              </span>
                              {finding.cweId && (
                                <span className="text-[10px] font-mono text-ink-faint px-1.5 py-0.5 rounded bg-canvas border border-border flex-shrink-0 hidden md:inline">
                                  {finding.cweId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink-faint truncate mt-0.5 flex items-center gap-1.5 font-mono">
                              <span>{finding.category}</span>
                              {finding.affectedComponent && (
                                <>
                                  <span>•</span>
                                  <span className="text-ink-muted truncate">{finding.affectedComponent}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Metadata & Expansion Caret */}
                        <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
                          {finding.confidence && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-canvas border border-border text-ink-muted font-mono hidden sm:inline">
                              conf: {finding.confidence}
                            </span>
                          )}
                          <span className="text-[11px] text-ink-faint font-mono hidden lg:inline">
                            {finding.checkId}
                          </span>
                          <div className="w-5 h-5 flex items-center justify-center text-ink-muted">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-accent flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-ink-faint flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Findings Detail View */}
                      {isExpanded && (
                        <div className="p-5 sm:p-6 border-t border-border bg-canvas space-y-5 text-sm">
                          {/* Technical Metadata Matrix */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-canvas-raised rounded-lg border border-border text-xs">
                            <div className="min-w-0">
                              <span className="text-ink-faint text-[10px] font-mono uppercase block">Affected Target</span>
                              <span className="font-mono text-ink text-xs break-all mt-0.5 block">{finding.affectedComponent || 'Endpoint root'}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-ink-faint text-[10px] font-mono uppercase block">Category / Vector</span>
                              <span className="capitalize text-ink font-medium mt-0.5 block break-words">{finding.category}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-ink-faint text-[10px] font-mono uppercase block">Confidence / Check</span>
                              <span className="font-mono text-ink-muted text-xs mt-0.5 block break-all">
                                {finding.confidence || 'Medium'} • {finding.checkId || 'engine-v1'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-ink-faint text-[10px] font-mono uppercase block">Reference / CWE</span>
                              <div className="mt-0.5 space-y-0.5">
                                {finding.cweId && (
                                  <span className="font-mono text-accent text-xs font-semibold block">
                                    {finding.cweId}
                                  </span>
                                )}
                                {finding.referenceScore && finding.referenceScore !== 'N/A' && finding.referenceScore !== finding.cweId && (
                                  <span
                                    className={`font-mono block break-all leading-tight ${finding.cweId ? 'text-ink-muted text-[11px]' : 'text-accent text-xs font-medium'}`}
                                    title={finding.referenceScore}
                                  >
                                    {finding.referenceScore}
                                  </span>
                                )}
                                {!finding.cweId && (!finding.referenceScore || finding.referenceScore === 'N/A') && (
                                  <span className="font-mono text-accent text-xs block">
                                    Standard-Sec
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Vulnerability Description */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                                Vulnerability Analysis
                              </h4>
                            </div>
                            <p className="text-ink-muted leading-relaxed text-xs sm:text-sm">{finding.description}</p>
                          </div>

                          {/* Reproduction Steps */}
                          {finding.stepsToReproduce && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Terminal className="w-3.5 h-3.5 text-accent" />
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                                  Verification / Reproduction Steps
                                </h4>
                              </div>
                              <pre className="p-3.5 bg-canvas-raised border border-border rounded-lg text-xs font-mono text-ink-muted whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                {finding.stepsToReproduce}
                              </pre>
                            </div>
                          )}

                          {/* HTTP Evidence Payload */}
                          {finding.evidence && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Code2 className="w-3.5 h-3.5 text-ink-muted" />
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                                  Captured HTTP Evidence
                                </h4>
                              </div>
                              <pre className="p-3.5 bg-canvas-raised border border-border rounded-lg text-xs font-mono text-ink-muted overflow-x-auto max-h-72 overflow-y-auto leading-relaxed border-l-2 border-l-accent">
                                {typeof finding.evidence === 'object'
                                  ? JSON.stringify(finding.evidence, null, 2)
                                  : finding.evidence}
                              </pre>
                            </div>
                          )}

                          {/* Operational Impact & Remediation Guidance */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-canvas-raised border border-border rounded-lg space-y-1.5">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-severity-high font-mono flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-severity-high" />
                                Operational / Business Risk
                              </h5>
                              <p className="text-xs text-ink-muted leading-relaxed">
                                {finding.businessImpact || 'Exposure of internal endpoints, potential data tampering, or authentication circumvention.'}
                              </p>
                            </div>

                            <div className="p-4 bg-canvas-raised border border-border rounded-lg space-y-1.5">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-severity-low font-mono flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-severity-low" />
                                Remediation Recommendation
                              </h5>
                              <p className="text-xs text-ink-muted leading-relaxed">
                                {finding.remediation || 'Enforce strict access controls, sanitize input boundaries, and review security response headers.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-canvas py-4 text-center text-xs text-ink-faint">
        Sentinel Compliance &amp; Automated Security Engine • Hackathon Phase 1 • Local Target Environment
      </footer>
    </div>
  );
}
