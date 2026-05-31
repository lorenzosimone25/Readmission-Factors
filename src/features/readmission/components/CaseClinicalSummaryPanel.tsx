import { CheckCircle2, HelpCircle } from 'lucide-react';

import { ClinicalCommaField } from '@/features/readmission/components/ClinicalCommaField';
import { ConfidenceScale } from '@/features/readmission/components/ConfidenceScale';
import {
  CASE_SETUP_CONFIDENCE_ERROR,
  CASE_SETUP_DIAGNOSIS_ERROR,
  caseSetupStatusBadges,
  DIAGNOSIS_PLACEHOLDER,
  humanizeCaseSetupError,
  normalizeCaseClinicalSummary,
  SYMPTOMS_PLACEHOLDER,
} from '@/features/readmission/lib/caseClinicalSummary';
import type { CaseClinicalSummary } from '@/features/readmission/types/readmissionAnnotation';

type Props = {
  summary: CaseClinicalSummary;
  submitErrors: string[];
  onUpdate: (patch: Partial<CaseClinicalSummary>) => void;
};

function badgeStyles(tone: 'complete' | 'uncertain' | 'empty'): {
  background: string;
  color: string;
  border: string;
} {
  if (tone === 'complete') {
    return {
      background: 'hsla(145, 50%, 62%, 0.16)',
      color: 'hsl(145, 45%, 28%)',
      border: 'hsla(145, 45%, 40%, 0.35)',
    };
  }
  if (tone === 'uncertain') {
    return {
      background: 'hsla(38, 90%, 55%, 0.14)',
      color: 'hsl(38, 80%, 28%)',
      border: 'hsla(38, 90%, 45%, 0.35)',
    };
  }
  return {
    background: 'var(--color-panel-alt)',
    color: 'var(--color-text-tertiary)',
    border: 'var(--color-border)',
  };
}

function StatusBadgeIcon({ tone }: { tone: 'complete' | 'uncertain' | 'empty' }) {
  if (tone === 'complete') return <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />;
  if (tone === 'uncertain') return <HelpCircle className="h-3 w-3 shrink-0" aria-hidden />;
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: 'var(--color-accent-danger)' }}
      aria-hidden
    />
  );
}

export function CaseClinicalSummaryPanel({ summary, submitErrors, onUpdate }: Props) {
  const normalized = normalizeCaseClinicalSummary(summary);
  const statusBadges = caseSetupStatusBadges(normalized);

  const showDiagnosisError = submitErrors.includes(CASE_SETUP_DIAGNOSIS_ERROR);
  const showConfidenceError = submitErrors.includes(CASE_SETUP_CONFIDENCE_ERROR);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label="Case setup">
      <header className="space-y-2">
        <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Case setup
        </h4>

        <div className="flex flex-wrap gap-1.5">
          {statusBadges.map((badge) => {
            const styles = badgeStyles(badge.tone);
            return (
              <span
                key={badge.key}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: styles.background,
                  color: styles.color,
                  borderColor: styles.border,
                }}
              >
                <StatusBadgeIcon tone={badge.tone} />
                {badge.label}
              </span>
            );
          })}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <ClinicalCommaField
          id="readmission-diagnoses"
          label="Diagnoses"
          value={summary.readmissionDiagnoses}
          uncertain={summary.readmissionDiagnosesUncertain}
          placeholder={DIAGNOSIS_PLACEHOLDER}
          errorMessage={showDiagnosisError ? CASE_SETUP_DIAGNOSIS_ERROR : undefined}
          onValueChange={(readmissionDiagnoses) =>
            onUpdate({ readmissionDiagnoses, readmissionDiagnosesUncertain: false })
          }
          onUncertainChange={(readmissionDiagnosesUncertain) =>
            onUpdate({ readmissionDiagnosesUncertain })
          }
        />

        <ClinicalCommaField
          id="readmission-symptoms"
          label="Symptoms"
          value={summary.readmissionSymptoms}
          uncertain={summary.readmissionSymptomsUncertain}
          placeholder={SYMPTOMS_PLACEHOLDER}
          onValueChange={(readmissionSymptoms) =>
            onUpdate({ readmissionSymptoms, readmissionSymptomsUncertain: false })
          }
          onUncertainChange={(readmissionSymptomsUncertain) =>
            onUpdate({ readmissionSymptomsUncertain })
          }
        />

        <div
          className="rounded-lg border p-2.5"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-panel-solid)',
          }}
        >
          <ConfidenceScale
            label="Overall confidence"
            hint="How confident are you in the diagnoses and symptoms above?"
            value={summary.overallConfidence}
            onChange={(overallConfidence) => onUpdate({ overallConfidence })}
          />
          {showConfidenceError ? (
            <p className="mt-1 text-[10px]" style={{ color: 'var(--color-accent-danger)' }}>
              {humanizeCaseSetupError(CASE_SETUP_CONFIDENCE_ERROR)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
