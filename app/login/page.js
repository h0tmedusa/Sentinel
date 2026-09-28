'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-canvas-raised border border-border rounded-lg shadow-raised p-6 space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-2.5 rounded bg-accent-muted border border-accent/20 text-accent">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-ink tracking-tight">Sentinel Access</h1>
            <p className="text-xs text-ink-muted mt-0.5">Sign in to your security assessment console</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded bg-canvas-overlay border border-severity-critical/30 text-xs text-severity-critical">
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
              placeholder="e.g. admin or analyst"
              className="w-full px-3 py-2 bg-canvas border border-border rounded text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-canvas border border-border rounded text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="space-y-3 pt-2 text-center text-xs">
          <div className="text-ink-muted">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-accent hover:underline font-medium">
              Create account
            </a>
          </div>

          <div className="p-3 bg-canvas border border-border rounded text-left space-y-1.5">
            <span className="text-[11px] font-semibold text-ink block">Prototype Test Credentials:</span>
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono">
              <span>admin</span>
              <span className="text-ink-faint">SentinelAdmin2026!</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono">
              <span>analyst</span>
              <span className="text-ink-faint">SentinelAnalyst2026!</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 text-center text-xs text-ink-faint">
          Protected System • Prototype Authentication
        </div>
      </div>
    </div>
  );
}
