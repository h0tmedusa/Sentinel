'use client';

import { useState } from 'react';
import { X, Check, Copy, Download, Code2, ShieldAlert, Sparkles, FileDiff, Layers } from 'lucide-react';
import { SEVERITY_BADGE } from '@/lib/severityTheme';

export default function RemediationModal({ finding, onClose }) {
  const [activeTab, setActiveTab] = useState('diff');
  const [copied, setCopied] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);

  if (!finding) return null;

  const patchSnippets = finding.patchSnippet || {};
  const frameworks = Object.keys(patchSnippets);

  // Default framework to the first available or 'generic'
  const currentFramework = selectedFramework && frameworks.includes(selectedFramework)
    ? selectedFramework
    : frameworks[0] || 'generic';

  const specificPatch = patchSnippets[currentFramework];

  // Default fallback code snippets if none provided
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

  const diffContent = `--- vulnerable.js
+++ secure.js
@@ -1,6 +1,6 @@
-${vulnerableCode.split('\n').join('\n-')}
+${secureCode.split('\n').join('\n+')}`;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${SEVERITY_BADGE[finding.severity] || 'bg-slate-700 text-white'}`}>
                  {finding.severity}
                </span>
                {finding.cweId && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                    {finding.cweId}
                  </span>
                )}
                <span className="text-xs font-mono text-slate-500 truncate max-w-[200px]">
                  {finding.affectedComponent}
                </span>
              </div>
              <h2 className="text-base font-semibold text-white truncate mt-0.5">
                Patch Guidance: {finding.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Framework Selector */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/20 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'diff'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" />
              Unified Diff View
            </button>
            <button
              onClick={() => setActiveTab('frameworks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'frameworks'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Framework Snippets
            </button>
          </div>

          {frameworks.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono">Framework:</span>
              <div className="flex gap-1">
                {frameworks.map((fw) => (
                  <button
                    key={fw}
                    onClick={() => setSelectedFramework(fw)}
                    className={`px-2 py-1 rounded text-[11px] font-mono capitalize transition ${
                      currentFramework === fw
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
          {activeTab === 'diff' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  Code Modification Suggestion ({currentFramework})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(diffContent)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied Diff' : 'Copy .diff'}
                  </button>
                  <button
                    onClick={downloadDiff}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              {/* Side by Side / Diff Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Vulnerable State */}
                <div className="flex flex-col rounded-xl border border-red-900/50 bg-red-950/10 overflow-hidden">
                  <div className="px-3 py-2 bg-red-950/30 border-b border-red-900/40 flex items-center gap-2 text-red-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Current / Vulnerable</span>
                  </div>
                  <pre className="p-3 text-red-200/90 whitespace-pre-wrap overflow-x-auto flex-1 leading-relaxed text-[11px]">
                    {vulnerableCode}
                  </pre>
                </div>

                {/* Secure / Hardened State */}
                <div className="flex flex-col rounded-xl border border-emerald-900/50 bg-emerald-950/10 overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-950/30 border-b border-emerald-900/40 flex items-center justify-between text-emerald-400">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Hardened Implementation</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(secureCode)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-200 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </button>
                  </div>
                  <pre className="p-3 text-emerald-200/90 whitespace-pre-wrap overflow-x-auto flex-1 leading-relaxed text-[11px]">
                    {secureCode}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* Frameworks Tab */
            <div className="space-y-4">
              {frameworks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl">
                  No framework-specific templates defined for this check. Follow the generic remediation policy.
                </div>
              ) : (
                frameworks.map((fw) => (
                  <div key={fw} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {fw} Implementation
                      </span>
                      <button
                        onClick={() => copyToClipboard(patchSnippets[fw])}
                        className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-sans"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Snippet
                      </button>
                    </div>
                    <pre className="p-4 text-emerald-300 whitespace-pre-wrap text-[11px] leading-relaxed">
                      {patchSnippets[fw]}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Standard & Benchmark Metadata */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 font-sans">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Compliance &amp; Mapping Standards
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">OWASP Category</span>
                <span className="text-slate-300 font-medium">{finding.owaspCategory || 'N/A'}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">MITRE Technique</span>
                <span className="text-slate-300 font-medium">{finding.mitreTechnique || 'N/A'}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">NIST Control</span>
                <span className="text-slate-300 font-medium">{finding.nistMapping || 'N/A'}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">ISO 27001</span>
                <span className="text-slate-300 font-medium">{finding.iso27001 || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>✓ Illustrative fix — adapt to your codebase and verify before deploying.</span>
          <span className="font-mono text-[10px] text-slate-600">
            Patch guidance is illustrative — review against your framework&apos;s current documentation before applying.
          </span>
        </div>
      </div>
    </div>
  );
}
