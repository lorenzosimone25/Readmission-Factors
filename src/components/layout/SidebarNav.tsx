import type { CSSProperties, ReactNode } from 'react';
import { HeartPulse, History, LayoutDashboard, LogOut, Sparkles } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { BRANDING } from '@/config/branding';
import { useAuth } from '@/context/AuthContext';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApi';
import { useReadmissionSession } from '@/features/readmission/context/ReadmissionSessionContext';

const PRIMARY = [
  { to: '/', label: 'Notes left', icon: LayoutDashboard, end: true, guarded: true },
  { to: '/research', label: 'Readmission', icon: Sparkles, end: false, guarded: false },
] as const;

const SECONDARY = [
  { id: 'your-searches', label: 'LLMs Responses', icon: History, disabled: true },
] as const;

function GuardedNavLink({
  to,
  end,
  className,
  style,
  children,
}: {
  to: string;
  end?: boolean;
  className: string;
  style: (args: { isActive: boolean }) => CSSProperties;
  children: ReactNode;
}) {
  const session = useReadmissionSession();
  const navigate = useNavigate();

  return (
    <NavLink
      to={to}
      end={end}
      className={className}
      style={style}
      onClick={(e) => {
        if (!session?.hasActiveCase || !session.dirty || session.guardDisabled) return;
        e.preventDefault();
        session.requestLeave(() => navigate(to));
      }}
    >
      {children}
    </NavLink>
  );
}

export function SidebarNav() {
  const auth = useAuth();
  const showAuth = hasReadmissionBackend() && auth.user;

  return (
    <aside
      className="flex w-[220px] shrink-0 flex-col"
      style={{
        padding: '24px 18px',
        background: 'var(--color-app-shell-2)',
      }}
    >
      <div className="mb-8 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent-violet), var(--color-accent-blue))',
            boxShadow: '0 0 20px var(--color-map-glow)',
          }}
        >
          <HeartPulse className="h-5 w-5 text-white" aria-hidden />
        </div>

        <div className="min-w-0 text-left">
          <p
            className="text-base font-bold leading-tight tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {BRANDING.appTitle}
          </p>
          <p
            className="mt-0.5 text-[11px] font-medium leading-snug"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Clinician Annotation Tool for Readmission Factors
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="flex flex-col gap-0.5" aria-label="Primary">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const linkClass =
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-[var(--motion-fast)]';
            const linkStyle = ({ isActive }: { isActive: boolean }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              background: isActive ? 'var(--color-panel-alt)' : 'transparent',
              border: isActive ? '1px solid var(--color-border-strong)' : '1px solid transparent',
              boxShadow: isActive ? '0 0 24px var(--color-map-glow)' : undefined,
            });

            const content = (
              <>
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
                {item.label}
              </>
            );

            if (item.guarded) {
              return (
                <GuardedNavLink key={item.to} to={item.to} end={item.end} className={linkClass} style={linkStyle}>
                  {content}
                </GuardedNavLink>
              );
            }

            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} style={linkStyle}>
                {content}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-5">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Coming soon
          </p>

          <nav className="flex flex-col gap-0.5 opacity-50" aria-label="Secondary">
            {SECONDARY.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {showAuth ? (
          <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="mb-2 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {auth.user?.displayName || auth.user?.email}
            </p>
            <button
              type="button"
              onClick={() => auth.logout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
