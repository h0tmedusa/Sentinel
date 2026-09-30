'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('ANALYST');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      await signup(username, password, role);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-canvas text-ink">
      {/* Left panel: Full-bleed form panel with a refined border divider */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between px-8 sm:px-14 lg:px-16 xl:px-20 py-10 bg-canvas border-r border-border/80 z-10">
        {/* Top Header / Prominent SENTINEL Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-accent-muted/60 border border-accent/30 text-accent flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-bold tracking-[0.2em] text-ink font-mono uppercase">
              SENTINEL
            </span>
            <span className="text-[10px] tracking-wider text-ink-faint uppercase font-mono">
              Autonomous Security &amp; Assessment
            </span>
          </div>
        </div>

        {/* Center Content: Form */}
        <div className="w-full max-w-md my-auto py-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Create account</h1>
            <p className="text-xs text-ink-muted">Register a new operator or analyst profile</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 p-3 rounded bg-canvas-overlay border border-severity-critical/30 text-xs text-severity-critical">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-ink" htmlFor="username">
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
                placeholder="e.g. johndoe"
                className="w-full h-10 px-3.5 bg-canvas border border-border rounded text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-ink" htmlFor="role">
                Initial Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-border rounded text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-sans"
              >
                <option value="ANALYST">Analyst (Security Assessment)</option>
                <option value="ADMIN">Admin (Full Control)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-ink" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full h-10 px-3.5 bg-canvas border border-border rounded text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-ink" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full h-10 px-3.5 bg-canvas border border-border rounded text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed shadow-subtle cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="pt-2 text-xs">
            <div className="text-ink-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-ink-faint">
          Protected System • Prototype Authentication
        </div>
      </div>

      {/* Right panel: Full-height image filling the entire right side */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen bg-[#07090D] overflow-hidden select-none">
        <Image
          src="/images/login-side.png"
          alt="Sentinel Security Shield"
          fill
          priority
          quality={100}
          unoptimized
          sizes="50vw"
          className="object-cover object-center pointer-events-none"
        />
      </div>
    </div>
  );
}
