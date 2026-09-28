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

      {/* 1. Header Bar: Compact SOC status header */}
      <header className="border-b border-border bg-canvas-raised/80 sticky top-0 z-10 hidden lg:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-sm font-semibold text-ink tracking-tight">Security Dashboard</h1>
            <span className="text-xs text-ink-faint hidden sm:inline">• Automated Assessment &amp; Validation</span>
          </div>

          <div className="flex items-center gap-3 text-xs flex-shrink-0">
            {/* Live Scan Status Pill */}
            {loading ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-muted border border-accent/30 text-accent font-medium font-mono text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {scanStatus === 'initializing' ? 'INITIALIZING ENGINE' : 'SCAN IN PROGRESS'}
              </span>
            ) : scanData ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas-overlay border border-border text-ink-muted text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-severity-low" />
                ASSESSMENT LOADED ({findings.length} findings)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas-overlay border border-border text-ink-faint text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
                READY FOR SCAN
              </span>
            )}
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-ink-faint hidden sm:inline">Target Scope: Localhost / Dev Only</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6">

        {/* 2. Primary Scan Configuration Section */}
        <section aria-label="Scan Configuration" className="bg-canvas-raised border border-border rounded-lg shadow-subtle overflow-hidden">
          {/* Section Header */}
          <div className="px-5 py-3.5 border-b border-border bg-canvas-overlay/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">Target Assessment Configuration</h2>
            </div>
            <span className="text-[11px] font-mono text-ink-faint">Automated Checks (11 Vectors)</span>
          </div>

          <div className="p-5 sm:p-6">
            <form onSubmit={handleStartScan} className="space-y-4">
              {/* Primary Target Input + CTA Button */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink">
                  Target Endpoint URL <span className="text-accent">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="http://localhost:3000"
                      className="w-full h-10 px-3.5 bg-canvas border border-border rounded text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAuth(!showAuth)}
                      className={`h-10 px-3.5 rounded border text-xs font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent ${
                        showAuth 
                          ? 'bg-canvas-overlay border-border text-ink' 
                          : 'bg-canvas-raised border-border text-ink-muted hover:text-ink hover:bg-canvas-overlay'
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
                      className="h-10 px-5 bg-accent hover:bg-accent-hover active:bg-accent disabled:bg-canvas-raised disabled:text-ink-faint disabled:border disabled:border-border disabled:cursor-not-allowed text-white font-medium text-xs rounded transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent shadow-subtle min-w-[120px]"
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

              {/* Distinct Authorization Confirmation Box */}
              <div className={`p-3.5 rounded border transition-colors ${
                confirmAuthorized 
                  ? 'bg-canvas-overlay/70 border-accent/40' 
                  : 'bg-canvas-overlay/30 border-border hover:border-ink-faint'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmAuthorized}
                    onChange={(e) => setConfirmAuthorized(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 w-4 h-4 rounded border-border bg-canvas text-accent focus:ring-accent focus:ring-offset-canvas cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-medium text-ink block sm:inline">Legal Authorization Confirmation: </span>
                    <span className="text-ink-muted leading-relaxed">
                      I confirm I am authorized to execute automated security tests against this target
                      (owned target, staging deployment, or explicit written penetration testing agreement).
                      Unauthorized scanning is prohibited.
                    </span>
                  </div>
                </label>
              </div>

              {/* Collapsible Cross-Account Credentials Panel */}
              {showAuth && (
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Key className="w-3.5 h-3.5 text-accent" />
                    <span>Cross-Account Access Control Testing (BOLA/IDOR Vector):</span>
                  </div>
                  <p className="text-xs text-ink-faint leading-relaxed">
                    Provide the resource owner target under User A, and an attacker or alternate tenant credentials under User B. The engine will verify object isolation.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-canvas border border-border rounded space-y-2.5">
                      <div className="text-xs font-semibold text-ink flex items-center justify-between">
                        <span>User A (Resource Owner)</span>
                        <span className="text-[10px] font-mono text-ink-faint">Account Owner</span>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Target User ID (e.g. usr_a1b2c3)"
                          value={userA.username}
                          onChange={(e) => setUserA({ ...userA, username: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                        <input
                          type="text"
                          placeholder="(Password unused — leave blank)"
                          value={userA.password}
                          onChange={(e) => setUserA({ ...userA, password: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-canvas border border-border rounded space-y-2.5">
                      <div className="text-xs font-semibold text-ink flex items-center justify-between">
                        <span>User B (Cross-Account Attacker)</span>
                        <span className="text-[10px] font-mono text-ink-faint">Testing Persona</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Username (optional)"
                          value={userB.username}
                          onChange={(e) => setUserB({ ...userB, username: e.target.value })}
                          disabled={loading}
                          className="w-full h-8 px-3 bg-canvas-raised border border-border rounded text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent font-mono"
                        />
                        <input
                          type="password"
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
              <div className="mt-4 flex items-start gap-3 p-3 bg-canvas-overlay border border-severity-critical/40 rounded text-xs">
                <AlertTriangle className="w-4 h-4 text-severity-critical flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-severity-critical leading-relaxed">{scanError}</div>
                <button
                  onClick={() => setScanError(null)}
                  className="text-ink-muted hover:text-ink text-xs flex-shrink-0 p-0.5"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 3. Running State Banner (While scan is in flight) */}
        {loading && (
          <section aria-label="Scan in Progress" className="bg-canvas-raised border border-accent/30 rounded-lg p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-accent-muted border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                  {scanStatus === 'initializing' ? 'INITIALIZING SECURITY SCANNER' : 'EXECUTING AUTOMATED CHECKS'}
                </h3>
                <span className="text-[11px] text-ink-faint">• Target: <span className="font-mono text-ink-muted">{targetUrl}</span></span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Probing headers, access controls, token security, and injection vectors. Results will display below upon completion.
              </p>
            </div>
          </section>
        )}

        {/* 4. Empty State (When no scan has been executed yet) */}
        {!loading && !scanData && (
          <section aria-label="No Assessment" className="bg-canvas-raised border border-border rounded-lg p-10 text-center">
            <div className="w-12 h-12 rounded bg-canvas-overlay border border-border flex items-center justify-center mx-auto mb-3.5 text-ink-faint">
              <FileSearch className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-ink">No Security Assessment Loaded</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto leading-relaxed">
              Verify your target endpoint above, confirm testing authorization, and select <strong className="text-ink font-medium">Start Scan</strong> to run compliance checks and triage findings.
            </p>
          </section>
        )}

        {/* 5. Security Metrics & Visualizations (When scan data is present) */}
        {scanData && (
          <section aria-label="Security Metrics Summary" className="space-y-6">
            {/* Section Header & Scan Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">Assessment Summary</h2>
                <div className="flex items-center gap-2 text-xs text-ink-faint mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Duration: {scanData.scan.finishedAt ? Math.round((new Date(scanData.scan.finishedAt) - new Date(scanData.scan.startedAt)) / 1000) : 0}s</span>
                  <span>•</span>
                  <span>Scan ID: <code className="text-ink-muted font-mono">{scanData.scan.id}</code></span>
                </div>
              </div>

              <div className="text-xs text-ink-faint">
                Showing: <span className="font-medium text-ink capitalize">{filterSeverity}</span> ({sortedFindings.length} findings)
              </div>
            </div>

            {/* Severity Counter Filter Strip */}
            <div className="flex items-stretch divide-x divide-border border border-border rounded-lg overflow-hidden bg-canvas-raised shadow-subtle">
              <button 
                type="button"
                onClick={() => setFilterSeverity('all')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'all' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-ink leading-tight">{stats.total}</div>
                <div className="text-[11px] font-medium text-ink-muted mt-1">Total Findings</div>
              </button>

              <button 
                type="button"
                onClick={() => setFilterSeverity('critical')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'critical' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-critical leading-tight">{stats.critical}</div>
                <div className="text-[11px] font-medium text-severity-critical mt-1">Critical</div>
              </button>

              <button 
                type="button"
                onClick={() => setFilterSeverity('high')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'high' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-high leading-tight">{stats.high}</div>
                <div className="text-[11px] font-medium text-severity-high mt-1">High</div>
              </button>

              <button 
                type="button"
                onClick={() => setFilterSeverity('medium')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'medium' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-medium leading-tight">{stats.medium}</div>
                <div className="text-[11px] font-medium text-severity-medium mt-1">Medium</div>
              </button>

              <button 
                type="button"
                onClick={() => setFilterSeverity('low')}
                className={`flex-1 px-4 py-3 text-center cursor-pointer transition-colors hover:bg-canvas-overlay ${
                  filterSeverity === 'low' ? 'bg-canvas-overlay' : ''
                }`}
              >
                <div className="text-2xl font-semibold text-severity-low leading-tight">{stats.low}</div>
                <div className="text-[11px] font-medium text-severity-low mt-1">Low</div>
              </button>
            </div>

            {/* Coverage Radar & CWE Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SecurityRadarChart findings={findings} />
              <CategoryDistribution findings={findings} />
            </div>
          </section>
        )}

        {/* 6. Detailed Findings Container */}
        {scanData && (
          <section aria-label="Detailed Findings" className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
                Detailed Findings ({sortedFindings.length})
              </h2>
              {filterSeverity !== 'all' && (
                <button
                  onClick={() => setFilterSeverity('all')}
                  className="text-xs text-accent hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {sortedFindings.length === 0 ? (
              <div className="p-10 text-center bg-canvas-raised border border-border rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-severity-low mx-auto mb-2.5 opacity-80" />
                <h3 className="text-sm font-semibold text-ink">No findings matching current filter</h3>
                <p className="text-xs text-ink-muted mt-1">All verified checks for this severity level returned positive compliance.</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-canvas-raised shadow-subtle">
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
