import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

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
    <div className="flex min-h-[min(520px,70svh)] items-center justify-center">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm rounded-xl border p-6"
        style={{
          borderColor: 'var(--color-border-strong)',
          background: 'var(--color-panel-solid)',
        }}
      >
        <h1 className="mb-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Sign in
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Readmission factor review workspace
        </p>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
            Email
          </span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-canvas)' }}
            required
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-canvas)' }}
            required
          />
        </label>

        {error ? (
          <p className="mb-4 text-sm" style={{ color: 'var(--color-accent-danger)' }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || auth.loading}
          className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--color-accent-blue)' }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
