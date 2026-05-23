import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { ReadmissionErrorBoundary } from '@/features/readmission/components/ReadmissionErrorBoundary';
import { ReadmissionTab } from '@/features/readmission/ReadmissionTab';
import { useReadmissionQueue } from '@/features/readmission/context/ReadmissionQueueContext';
import type { ReadmissionCase } from '@/features/readmission/types/readmissionAnnotation';

export function ReadmissionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queue = useReadmissionQueue();
  const caseParam = searchParams.get('case');

  const [activeCase, setActiveCase] = useState<ReadmissionCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseParam) {
      setActiveCase(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void readmissionApi.loadCase(caseParam).then((c) => {
      if (cancelled) return;
      if (!c) {
        setActiveCase(null);
        setError(`Case "${caseParam}" not found in dataset.`);
      } else {
        setActiveCase(c);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [caseParam]);

  const navigateCase = (rowId: string) => {
    navigate(`/research?case=${encodeURIComponent(rowId)}`);
  };

  if (!caseParam) {
    return (
      <div
        className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
      >
        <p className="text-sm">Select a case from Notes Left to begin review.</p>
        <Link
          to="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-accent-blue)' }}
        >
          Go to Notes Left
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        Loading case notes…
      </div>
    );
  }

  if (error || !activeCase) {
    return (
      <div
        className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--color-accent-danger)', color: 'var(--color-accent-danger)' }}
      >
        <p className="text-sm">{error ?? 'Failed to load case.'}</p>
        <Link to="/" className="text-sm underline">
          Back to Notes Left
        </Link>
      </div>
    );
  }

  return (
    <ReadmissionErrorBoundary>
      <ReadmissionTab
        activeCase={activeCase}
        queueRowIds={queue.queueRowIds}
        onNavigateCase={navigateCase}
      />
    </ReadmissionErrorBoundary>
  );
}
