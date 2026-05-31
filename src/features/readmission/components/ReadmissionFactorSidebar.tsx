import { useEffect, useState, type MutableRefObject } from 'react';

import { CaseClinicalSummaryPanel } from '@/features/readmission/components/CaseClinicalSummaryPanel';
import { FactorWorkbenchPanel } from '@/features/readmission/components/FactorWorkbenchPanel';
import { SegmentedControl } from '@/features/readmission/components/SegmentedControl';
import { hasFactorSubmitErrors } from '@/features/readmission/lib/annotationValidation';
import {
  emptyCaseClinicalSummary,
  hasCaseSetupSubmitErrors,
  isCaseClinicalSummaryComplete,
  normalizeCaseClinicalSummary,
} from '@/features/readmission/lib/caseClinicalSummary';
import type {
  CaseClinicalSummary,
  ClinicianReadmissionAnnotation,
  EvidenceSpan,
  FactorFinalizePatch,
  FactorFormDraft,
  ReadmissionFactor,
} from '@/features/readmission/types/readmissionAnnotation';

type SidebarSection = 'setup' | 'factors';

type Props = {
  annotation: ClinicianReadmissionAnnotation;
  submitErrors: string[];
  highlightCount: number;
  spansByGroupId: Map<string, EvidenceSpan[]>;
  factorById: Map<string, ReadmissionFactor>;
  expandedGroupId: string | null;
  activeGroupId: string | null;
  groupCardRefs: MutableRefObject<Map<string, HTMLDivElement | null>>;
  isDefaultFactorLabel: (label: string) => boolean;
  getFactorFormDraft: (groupId: string) => FactorFormDraft | undefined;
  onUpdateCaseClinicalSummary: (patch: Partial<CaseClinicalSummary>) => void;
  onSelectGroup: (groupId: string) => void;
  onToggleExpand: (groupId: string) => void;
  onRenameGroup: (groupId: string, label: string) => void;
  onAddFactor: () => void;
  onDeleteFactor: (groupId: string) => void;
  onSaveFactor: (groupId: string, patch: FactorFinalizePatch) => void;
  onUpdateGroupNote: (groupId: string, note: string) => void;
  onJumpToSpan: (spanId: string) => void;
  onRemoveHighlight: (spanId: string) => void;
};

function defaultSection(summary: CaseClinicalSummary, setupErrors: boolean): SidebarSection {
  if (setupErrors || !isCaseClinicalSummaryComplete(summary)) return 'setup';
  return 'factors';
}

export function ReadmissionFactorSidebar({
  annotation,
  submitErrors,
  highlightCount,
  spansByGroupId,
  factorById,
  expandedGroupId,
  activeGroupId,
  groupCardRefs,
  isDefaultFactorLabel,
  getFactorFormDraft,
  onUpdateCaseClinicalSummary,
  onSelectGroup,
  onToggleExpand,
  onRenameGroup,
  onAddFactor,
  onDeleteFactor,
  onSaveFactor,
  onUpdateGroupNote,
  onJumpToSpan,
  onRemoveHighlight,
}: Props) {
  const summary = normalizeCaseClinicalSummary(annotation.caseClinicalSummary);
  const setupComplete = isCaseClinicalSummaryComplete(summary);
  const setupErrors = hasCaseSetupSubmitErrors(submitErrors);
  const factorsComplete = !hasFactorSubmitErrors(submitErrors);
  const factorCount = annotation.evidenceGroups.length;

  const [section, setSection] = useState<SidebarSection>(() =>
    defaultSection(summary, setupErrors),
  );

  useEffect(() => {
    if (setupErrors) setSection('setup');
  }, [setupErrors]);

  useEffect(() => {
    setSection(defaultSection(summary, setupErrors));
  }, [annotation.caseId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header
        className="shrink-0 space-y-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel-alt)' }}
      >
        <div>
          <h3 className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Readmission review
          </h3>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {factorCount} factor{factorCount !== 1 ? 's' : ''} · {highlightCount} highlight
            {highlightCount !== 1 ? 's' : ''}
          </p>
        </div>
        <SegmentedControl
          value={section}
          ariaLabel="Sidebar section"
          options={[
            {
              id: 'setup' as const,
              label: 'Case setup',
              alert: !setupComplete,
              alertTitle: 'Case setup incomplete',
            },
            {
              id: 'factors' as const,
              label: 'Factors',
              alert: !factorsComplete,
              alertTitle: 'Factors incomplete',
            },
          ]}
          onChange={setSection}
        />
      </header>

      {section === 'setup' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
          <CaseClinicalSummaryPanel
            summary={annotation.caseClinicalSummary ?? emptyCaseClinicalSummary()}
            submitErrors={submitErrors}
            onUpdate={onUpdateCaseClinicalSummary}
          />
        </div>
      ) : (
        <FactorWorkbenchPanel
          annotation={annotation}
          spansByGroupId={spansByGroupId}
          factorById={factorById}
          expandedGroupId={expandedGroupId}
          activeGroupId={activeGroupId}
          groupCardRefs={groupCardRefs}
          isDefaultFactorLabel={isDefaultFactorLabel}
          getFactorFormDraft={getFactorFormDraft}
          onSelectGroup={onSelectGroup}
          onToggleExpand={onToggleExpand}
          onRenameGroup={onRenameGroup}
          onAddFactor={onAddFactor}
          onDeleteFactor={onDeleteFactor}
          onSaveFactor={onSaveFactor}
          onUpdateGroupNote={onUpdateGroupNote}
          onJumpToSpan={onJumpToSpan}
          onRemoveHighlight={onRemoveHighlight}
        />
      )}
    </div>
  );
}
