'use client';

import { useState, useEffect } from 'react';
import { X, Check, Copy, Download, Code2, ShieldAlert, Sparkles, FileDiff, Layers } from 'lucide-react';
import { SEVERITY_BADGE } from '@/lib/severityTheme';

export default function RemediationModal({ finding, onClose }) {
  const [activeTab, setActiveTab] = useState('diff');
  const [copied, setCopied] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!finding) return null;

  const patchSnippets = finding.patchSnippet || {};
  const frameworks = Object.keys(patchSnippets);

  const currentFramework = selectedFramework && frameworks.includes(selectedFramework)
    ? selectedFramework
    : frameworks[0] || 'generic';

  const specificPatch = patchSnippets[currentFramework];

  const fallbackVulnerable = `// Vulnerable Implementation (${finding.title})
// Endpoint / Component: ${finding.affectedComponent || 'Application handler'}
app.use((req, res, next) => {
  // Missing strict security controls or validation
  // Current behavior allows unvalidated input or unauthenticated access
});`;

  const fallbackSecure = `// Hardened Implementation
// Remediates: ${finding.cweId || 'Identified Security Issue'}
${finding.remediation || '// Apply security policy and input validation as specified in guidelines'}`;

  const vulnerableCode = specificPatch
    ? `// Current Configuration / Vulnerable pattern\n// Affected: ${finding.affectedComponent || 'Target Service'}\n// Lacks security controls matching: ${finding.title}`
    : fallbackVulnerable;

  const secureCode = specificPatch || fallbackSecure;

  const diffContent = `--- vulnerable.js\n+++ secure.js\n@@ -1,6 +1,6 @@\n-${vulnerableCode.split('\n').join('\n-')}\n+${secureCode.split('\n').join('\n+')}`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDiff = () => {
    const blob = new Blob([diffContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-patch-${(finding.cweId || 'finding').toLowerCase()}.diff`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="remediation-modal-title">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-canvas-raised border border-border rounded-xl shadow-overlay flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${SEVERITY_BADGE[finding.severity] || 'bg-canvas-overlay text-ink border-border'}`}>
              {finding.severity}
            </span>
            {finding.cweId && (
              <span className="text-xs font-mono text-ink-muted px-1.5 py-0.5 rounded bg-canvas border border-border">
                {finding.cweId}
              </span>
            )}
            <h2 id="remediation-modal-title" className="text-sm font-semibold text-ink truncate">
              {finding.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Framework Selector */}
        <div className="flex items-center justify-between px-6 border-b border-border bg-canvas-raised">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                activeTab === 'diff'
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" />
              Unified Diff
            </button>
            <button
              onClick={() => setActiveTab('frameworks')}
              className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                activeTab === 'frameworks'
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Framework Snippets
            </button>
          </div>

          {frameworks.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-ink-faint">Framework:</span>
              <div className="flex gap-1">
                {frameworks.map((fw) => (
                  <button
                    key={fw}
                    onClick={() => setSelectedFramework(fw)}
                    className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      currentFramework === fw
                        ? 'bg-accent-muted text-accent border border-accent/40 font-medium'
                        : 'bg-canvas-overlay text-ink-muted hover:text-ink border border-border'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === 'diff' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted flex items-center gap-1.5 text-xs font-medium">
                  <Code2 className="w-4 h-4 text-accent" />
                  Code Modification ({currentFramework})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(diffContent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-canvas-overlay hover:bg-border text-ink border border-border transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Diff'}
                  </button>
                  <button
                    onClick={downloadDiff}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-canvas-overlay hover:bg-border text-ink border border-border transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              {/* Side by Side Diff Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                {/* Vulnerable State */}
                <div className="flex flex-col rounded-lg border border-severity-critical/30 bg-severity-critical/5 overflow-hidden">
                  <div className="px-3 py-2 border-b border-severity-critical/20 flex items-center gap-1.5 text-severity-critical">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px]">Current / Vulnerable</span>
                  </div>
                  <pre className="p-3 text-severity-critical/90 whitespace-pre-wrap overflow-x-auto flex-1 leading-relaxed text-[11px]">
                    {vulnerableCode}
                  </pre>
                </div>

                {/* Hardened Implementation */}
                <div className="flex flex-col rounded-lg border border-border bg-canvas-overlay overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between text-ink">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span className="font-semibold text-[11px]">Hardened Implementation</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(secureCode)}
                      className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </button>
                  </div>
                  <pre className="p-3 text-ink whitespace-pre-wrap overflow-x-auto flex-1 leading-relaxed text-[11px]">
                    {secureCode}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* Frameworks Tab */
            <div className="space-y-4">
              {frameworks.length === 0 ? (
                <div className="p-8 text-center text-ink-muted border border-border rounded-lg">
                  No framework-specific templates defined for this check. Follow the generic remediation policy.
                </div>
              ) : (
                frameworks.map((fw) => (
                  <div key={fw} className="border border-border rounded-lg overflow-hidden bg-canvas-overlay">
                    <div className="px-4 py-2 bg-canvas-raised border-b border-border flex items-center justify-between">
                      <span className="font-medium text-ink text-xs capitalize">
                        {fw} Implementation
                      </span>
                      <button
                        onClick={() => copyToClipboard(patchSnippets[fw])}
                        className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Snippet
                      </button>
                    </div>
                    <pre className="p-4 font-mono text-ink whitespace-pre-wrap text-[11px] leading-relaxed">
                      {patchSnippets[fw]}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Compliance & Standards */}
          <div className="p-4 rounded-lg border border-border bg-canvas-overlay flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Compliance &amp; Mapping Standards
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-md bg-canvas border border-border min-w-0">
                <span className="text-[10px] font-mono text-ink-faint block uppercase">OWASP Category</span>
                <span className="text-ink font-medium break-words text-xs mt-0.5 block">{finding.owaspCategory || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-md bg-canvas border border-border min-w-0">
                <span className="text-[10px] font-mono text-ink-faint block uppercase">MITRE Technique</span>
                <span className="text-ink font-medium break-words text-xs mt-0.5 block">{finding.mitreTechnique || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-md bg-canvas border border-border min-w-0">
                <span className="text-[10px] font-mono text-ink-faint block uppercase">NIST Control</span>
                <span className="text-ink font-medium break-words text-xs mt-0.5 block">{finding.nistMapping || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-md bg-canvas border border-border min-w-0">
                <span className="text-[10px] font-mono text-ink-faint block uppercase">ISO 27001</span>
                <span className="text-ink font-medium break-words text-xs mt-0.5 block">{finding.iso27001 || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-canvas-raised flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-muted">
          <span>Illustrative fix — adapt to your codebase and verify before deploying.</span>
          <span className="text-[11px] text-ink-faint">
            Review against framework documentation before applying.
          </span>
        </div>
      </div>
    </div>
  );
}
