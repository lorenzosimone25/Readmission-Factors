import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HeartPulse, Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApi';

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!hasReadmissionBackend()) {
    return <Navigate to="/" replace />;
  }

  if (auth.user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-svh items-center justify-center px-4 py-10"
      style={{
        background: 'var(--color-bg-canvas)',
        color: 'var(--color-text-primary)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-[var(--radius-frame)] border"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-app-shell)',
          boxShadow: 'var(--shadow-lifted)',
        }}
      >
        <div
          className="border-b px-6 py-5"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-panel-alt)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-violet), var(--color-accent-blue))',
                boxShadow: '0 0 20px var(--color-map-glow)',
              }}
            >
              <HeartPulse className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                Yale Readmission Review
              </p>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Sign in to continue
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Access your assigned cases, highlight evidence, and submit readmission factor
            annotations.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-6">
          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-panel-solid)',
                color: 'var(--color-text-primary)',
              }}
              required
            />
          </label>

          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-panel-solid)',
                color: 'var(--color-text-primary)',
              }}
              required
            />
          </label>

          {error ? (
            <p
              className="mb-4 rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--color-accent-danger)',
                color: 'var(--color-accent-danger)',
                background: 'hsla(0, 70%, 50%, 0.08)',
              }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || auth.loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, hsl(214, 84%, 48%) 0%, hsl(224, 76%, 40%) 100%)',
              boxShadow: '0 2px 8px hsla(214, 70%, 40%, 0.35)',
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
