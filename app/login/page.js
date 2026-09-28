'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertTriangle, Loader2, Lock, Terminal, Activity } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas text-ink flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Subtle architectural background pattern & radial falloff */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#22252B_1px,transparent_1px),linear-gradient(to_bottom,#22252B_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" 
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-accent/5 blur-[120px] rounded-full" 
      />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-border bg-canvas-raised/80 backdrop-blur-md shadow-overlay overflow-hidden">
        
        {/* Left Side: Enterprise Security Identity & Context */}
        <div className="lg:col-span-5 bg-canvas-overlay/60 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-accent-muted border border-accent/25 text-accent flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-ink text-base tracking-tight block">Sentinel</span>
                <span className="text-[11px] font-mono text-ink-faint uppercase tracking-wider block">Security Platform</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-lg font-medium text-ink tracking-tight">Security Assessment Console</h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                Automated vulnerability detection, active service auditing, and real-time security posture assessment.
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2.5 text-xs text-ink-muted">
                <Lock className="w-3.5 h-3.5 text-accent/80 flex-shrink-0" />
                <span>Protected Role-Based Access Control</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-ink-muted">
                <Terminal className="w-3.5 h-3.5 text-accent/80 flex-shrink-0" />
                <span>Interactive Analysis & Vulnerability Matrix</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-ink-muted">
                <Activity className="w-3.5 h-3.5 text-accent/80 flex-shrink-0" />
                <span>Audited Session & Event Telemetry</span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-border/40 flex items-center justify-between text-[11px] text-ink-faint">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 inline-block animate-pulse" />
              SYSTEM OPERATIONAL
            </span>
            <span className="font-mono text-[10px]">v2.4.0</span>
          </div>
        </div>

        {/* Right Side: Sign-in Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-ink tracking-tight">Console Authentication</h1>
              <p className="text-xs text-ink-muted mt-1">Enter your credentials to access the security environment</p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-md bg-canvas-overlay border border-severity-critical/30 text-xs text-severity-critical animate-fadeIn"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst"
                  className="w-full h-10 px-3 bg-canvas border border-border rounded-md text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-ink-muted" htmlFor="password">
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-10 px-3 bg-canvas border border-border rounded-md text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed shadow-sm mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-ink-muted border-t border-border/50">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-accent hover:underline font-medium ml-1">
                Create account
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
