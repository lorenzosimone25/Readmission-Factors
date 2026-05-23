import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApi';

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (!hasReadmissionBackend()) {
    return <>{children}</>;
  }

  if (auth.loading) {
    return (
      <div
        className="flex min-h-[320px] items-center justify-center text-sm"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Checking session…
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
