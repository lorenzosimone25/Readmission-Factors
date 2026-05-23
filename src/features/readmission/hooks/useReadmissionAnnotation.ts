import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ToastMessage, ToastVariant } from '@/features/readmission/components/AnnotationToast';
import {
  addEvidenceGroupToAnnotation,
  addSpanToAnnotation,
  finalizeGroupInAnnotation,
  removeEvidenceGroupFromAnnotation,
  removeSpanFromAnnotation,
  renameEvidenceGroup,
  resolveActiveGroupId,
  updateEvidenceGroupNote,
  updateFinalizedFactorInAnnotation,
} from '@/features/readmission/lib/annotationReducer';
import { readmissionApi } from '@/features/readmission/api/readmissionApi';
import { hasReadmissionBackend } from '@/features/readmission/api/readmissionApiMode';
import {
  useReadmissionSession,
  useRegisterReadmissionSession,
} from '@/features/readmission/context/ReadmissionSessionContext';
import { normalizeAnnotation } from '@/features/readmission/lib/annotationStorage';
import {
  validateFactorPatch,
  validateForSubmit,
  type CaseNotes,
} from '@/features/readmission/lib/annotationValidation';
import { buildNoteSegments } from '@/features/readmission/lib/buildNoteSegments';
import { detectSections } from '@/features/readmission/lib/detectSections';
import { createDefaultEvidenceGroups } from '@/features/readmission/lib/defaultEvidenceGroups';
import { downloadAnnotationJson } from '@/features/readmission/lib/exportAnnotation';
import { isDefaultFactorLabel } from '@/features/readmission/lib/factorLabelUtils';
import { newId } from '@/features/readmission/lib/newId';
import { findOverlappingOtherGroupSpan } from '@/features/readmission/lib/spanOverlap';
import type {
  ClinicianReadmissionAnnotation,
  ClinicalNoteType,
  EvidenceGroupColor,
  EvidenceSpan,
  FactorFinalizePatch,
  FactorFormDraft,
  PendingSelection,
  ReadmissionCase,
} from '@/features/readmission/types/readmissionAnnotation';

function emptyAnnotation(activeCase: ReadmissionCase): ClinicianReadmissionAnnotation {
  const now = new Date().toISOString();
  const groups = createDefaultEvidenceGroups();
  const { caseId, reviewerId, noteVersionHash, noteVersions } = activeCase;
  return {
    caseId,
    caseMetadata: caseMetadataFromCase(activeCase),
    reviewerId,
    noteVersionHash,
    noteVersions,
    createdAt: now,
    updatedAt: now,
    status: 'not_started',
    evidenceGroups: groups,
    factors: [],
    evidenceSpans: [],
  };
}

function caseMetadataFromCase(c: ReadmissionCase) {
  return {
    rowId: c.rowId,
    patientIdentifier: c.patientIdentifier,
    subjectId: c.subjectId,
    indexHadmId: c.indexHadmId,
    readmitHadmId: c.readmitHadmId,
    indexPrimaryIcdCode: c.indexPrimaryIcdCode,
    daysToReadmission: c.daysToReadmission,
    readmitHasIcu: c.readmitHasIcu,
  };
}

async function loadAnnotationForCase(
  activeCase: ReadmissionCase,
): Promise<ClinicianReadmissionAnnotation> {
  const stored = await readmissionApi.loadAnnotation(
    activeCase.caseId,
    activeCase.reviewerId,
    activeCase.noteVersionHash,
  );
  const ann = normalizeAnnotation(stored ?? emptyAnnotation(activeCase));
  return {
    ...ann,
    caseMetadata: caseMetadataFromCase(activeCase),
    reviewerId: activeCase.reviewerId,
  };
}

function snapshot(annotation: ClinicianReadmissionAnnotation): string {
  return JSON.stringify(annotation);
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type HookOptions = {
  activeCase: ReadmissionCase | null;
  queueRowIds: string[];
  onNavigateCase: (rowId: string) => void;
  onQueueRefresh?: () => void;
  onSubmitSuccess?: () => void;
};

function spansForNote(spans: EvidenceSpan[], noteType: ClinicalNoteType): EvidenceSpan[] {
  return spans.filter((sp) => sp.noteType === noteType);
}

export function useReadmissionAnnotation({
  activeCase,
  queueRowIds,
  onNavigateCase,
  onQueueRefresh,
  onSubmitSuccess,
}: HookOptions) {
  const [annotation, setAnnotation] = useState<ClinicianReadmissionAnnotation | null>(null);
  const [annotationLoading, setAnnotationLoading] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection>(null);
  const pendingSelectionRef = useRef<PendingSelection>(null);
  const [dirty, setDirty] = useState(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [factorFormDrafts, setFactorFormDrafts] = useState<Record<string, FactorFormDraft>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const indexScrollRef = useRef<HTMLDivElement | null>(null);
  const readmissionScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const pendingScrollNoteTypeRef = useRef<ClinicalNoteType | null>(null);
  const groupCardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registerSession = useRegisterReadmissionSession();
  const session = useReadmissionSession();
  const requestLeave = session?.requestLeave ?? ((proceed: () => void) => proceed());

  const setPendingSelectionSafe = useCallback((next: PendingSelection) => {
    pendingSelectionRef.current = next;
    setPendingSelection(next);
  }, []);

  const clearPendingSelection = useCallback(() => {
    pendingSelectionRef.current = null;
    setPendingSelection(null);
  }, []);

  const showToast = useCallback((text: string, variant: ToastVariant = 'info', details?: string[]) => {
    setToast({ id: newId('toast'), text, variant, details });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!activeCase) {
      setAnnotation(null);
      setActiveGroupId(null);
      setExpandedGroupId(null);
      setAnnotationLoading(false);
      return;
    }
    let cancelled = false;
    setAnnotationLoading(true);
    void loadAnnotationForCase(activeCase).then((ann) => {
      if (cancelled) return;
      const firstGroupId = ann.evidenceGroups[0]?.id ?? null;
      setAnnotation(ann);
      setActiveGroupId(firstGroupId);
      setExpandedGroupId(firstGroupId);
      clearPendingSelection();
      setDirty(false);
      lastSavedSnapshotRef.current = snapshot(ann);
      setFactorFormDrafts({});
      setToast(null);
      setSaveStatus('idle');
      setLastSavedAt(null);
      setSaveError(null);
      setSubmitting(false);
      setAnnotationLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCase?.rowId, clearPendingSelection]);

  const caseNotes: CaseNotes | null = useMemo(() => {
    if (!activeCase) return null;
    return {
      indexRawNote: activeCase.indexRawNote,
      readmissionRawNote: activeCase.readmissionRawNote,
      noteVersionHash: activeCase.noteVersionHash,
    };
  }, [activeCase]);

  const indexSections = useMemo(
    () => (activeCase ? detectSections(activeCase.indexRawNote) : []),
    [activeCase?.indexRawNote],
  );
  const readmissionSections = useMemo(
    () => (activeCase ? detectSections(activeCase.readmissionRawNote) : []),
    [activeCase?.readmissionRawNote],
  );

  const indexSegments = useMemo(
    () =>
      activeCase && annotation
        ? buildNoteSegments(
            activeCase.indexRawNote,
            indexSections,
            spansForNote(annotation.evidenceSpans, 'index_hf'),
          )
        : [],
    [activeCase, annotation, indexSections],
  );

  const readmissionSegments = useMemo(
    () =>
      activeCase && annotation
        ? buildNoteSegments(
            activeCase.readmissionRawNote,
            readmissionSections,
            spansForNote(annotation.evidenceSpans, 'readmission'),
          )
        : [],
    [activeCase, annotation, readmissionSections],
  );

  const groupById = useMemo(() => {
    if (!annotation) return new Map();
    const m = new Map(annotation.evidenceGroups.map((g) => [g.id, g] as const));
    return m;
  }, [annotation?.evidenceGroups]);

  const spansByGroupId = useMemo(() => {
    const m = new Map<string, EvidenceSpan[]>();
    if (!annotation) return m;
    for (const sp of annotation.evidenceSpans) {
      const list = m.get(sp.groupId) ?? [];
      list.push(sp);
      m.set(sp.groupId, list);
    }
    return m;
  }, [annotation?.evidenceSpans]);

  const factorById = useMemo(() => {
    if (!annotation) return new Map();
    const m = new Map(annotation.factors.map((f) => [f.id, f] as const));
    return m;
  }, [annotation?.factors]);

  const resolvedActiveGroupId = useMemo(
    () => (annotation ? resolveActiveGroupId(annotation, activeGroupId) : null),
    [annotation, activeGroupId],
  );

  const activeGroup = resolvedActiveGroupId
    ? groupById.get(resolvedActiveGroupId) ?? null
    : null;

  useEffect(() => {
    if (resolvedActiveGroupId !== activeGroupId) {
      setActiveGroupId(resolvedActiveGroupId);
    }
  }, [activeGroupId, resolvedActiveGroupId]);

  const submitValidation = useMemo(
    () =>
      annotation && caseNotes
        ? validateForSubmit(annotation, caseNotes)
        : { ok: false, errors: ['No case loaded.'], warnings: [] },
    [annotation, caseNotes],
  );

  const caseIndex = activeCase ? queueRowIds.indexOf(activeCase.rowId) : -1;

  useLayoutEffect(() => {
    if (pendingScrollTopRef.current === null || !pendingScrollNoteTypeRef.current) return;
    const ref =
      pendingScrollNoteTypeRef.current === 'index_hf' ? indexScrollRef : readmissionScrollRef;
    if (ref.current) ref.current.scrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;
    pendingScrollNoteTypeRef.current = null;
  }, [annotation?.evidenceSpans, indexSegments, readmissionSegments]);

  const buildDraftPayload = useCallback((): ClinicianReadmissionAnnotation | null => {
    if (!activeCase || !annotation) return null;
    if (annotation.status === 'submitted') return null;
    const hasEdits =
      annotation.evidenceSpans.length > 0 ||
      annotation.status !== 'not_started' ||
      annotation.factors.length > 0;
    return {
      ...annotation,
      status: hasEdits ? ('draft' as const) : annotation.status,
      updatedAt: new Date().toISOString(),
      noteVersions: activeCase.noteVersions,
      caseMetadata: caseMetadataFromCase(activeCase),
    };
  }, [activeCase, annotation]);

  const persistDraft = useCallback(async (): Promise<void> => {
    const next = buildDraftPayload();
    if (!next) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await readmissionApi.saveAnnotation(next);
      setAnnotation(next);
      lastSavedSnapshotRef.current = snapshot(next);
      setDirty(false);
      setSaveStatus('saved');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSaveStatus('error');
      setSaveError(message);
      throw err;
    }
  }, [buildDraftPayload]);

  const discardChanges = useCallback(() => {
    if (lastSavedSnapshotRef.current) {
      setAnnotation(JSON.parse(lastSavedSnapshotRef.current) as ClinicianReadmissionAnnotation);
    }
    setDirty(false);
  }, []);

  useEffect(() => {
    if (!activeCase || !annotation || annotationLoading) {
      registerSession(null);
      return;
    }
    const guardDisabled = annotation.status === 'submitted' || submitting;
    registerSession({
      dirty,
      hasActiveCase: true,
      guardDisabled,
      persistDraft,
      discardChanges,
    });
    return () => registerSession(null);
  }, [
    activeCase,
    annotation,
    annotationLoading,
    dirty,
    discardChanges,
    persistDraft,
    registerSession,
    submitting,
  ]);

  useEffect(() => {
    if (!dirty || !annotation) return;
    if (annotation.status === 'submitted') return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistDraft().catch((err) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        showToast('Auto-save failed', 'error', [message]);
      });
    }, 1000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [annotation, dirty, persistDraft, showToast]);

  const markDirty = useCallback(() => setDirty(true), []);

  const updateAnnotation = useCallback(
    (updater: (prev: ClinicianReadmissionAnnotation) => ClinicianReadmissionAnnotation) => {
      setAnnotation((prev) => {
        if (!prev) return prev;
        return updater(prev);
      });
      markDirty();
    },
    [markDirty],
  );

  const goPrevCase = useCallback(() => {
    if (!activeCase || caseIndex <= 0) return;
    const prevId = queueRowIds[caseIndex - 1];
    if (!prevId) return;
    requestLeave(() => onNavigateCase(prevId));
  }, [activeCase, caseIndex, onNavigateCase, queueRowIds, requestLeave]);

  const goNextCase = useCallback(() => {
    if (!activeCase || caseIndex < 0 || caseIndex >= queueRowIds.length - 1) return;
    const nextId = queueRowIds[caseIndex + 1];
    if (!nextId) return;
    requestLeave(() => onNavigateCase(nextId));
  }, [activeCase, caseIndex, onNavigateCase, queueRowIds, requestLeave]);

  const selectGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    setExpandedGroupId(groupId);
  }, []);

  const toggleGroupExpand = useCallback(
    (groupId: string) => {
      setActiveGroupId(groupId);
      setExpandedGroupId((current) => (current === groupId ? null : groupId));
    },
    [],
  );

  const updateFactorFormDraft = useCallback((groupId: string, draft: FactorFormDraft) => {
    setFactorFormDrafts((prev) => ({ ...prev, [groupId]: draft }));
  }, []);

  const clearFactorFormDraft = useCallback((groupId: string) => {
    setFactorFormDrafts((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const getFactorFormDraft = useCallback(
    (groupId: string): FactorFormDraft | undefined => factorFormDrafts[groupId],
    [factorFormDrafts],
  );

  const renameGroup = useCallback(
    (groupId: string, label: string) => {
      updateAnnotation((prev) => renameEvidenceGroup(prev, groupId, label));
    },
    [updateAnnotation],
  );

  const addEvidenceGroup = useCallback(
    (label?: string, color?: EvidenceGroupColor) => {
      let addedGroupId = '';
      let resolvedLabel = '';
      updateAnnotation((prev) => {
        const { annotation: next, group } = addEvidenceGroupToAnnotation(prev, label, color);
        addedGroupId = group.id;
        resolvedLabel = group.label;
        return next;
      });
      setActiveGroupId(addedGroupId);
      setExpandedGroupId(addedGroupId);
      showToast(`"${resolvedLabel}" added — rename it, then highlight in either note.`, 'success');
      requestAnimationFrame(() => {
        if (addedGroupId) {
          groupCardRefs.current.get(addedGroupId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    },
    [showToast, updateAnnotation],
  );

  const saveScrollPosition = useCallback((noteType: ClinicalNoteType) => {
    pendingScrollNoteTypeRef.current = noteType;
    const ref = noteType === 'index_hf' ? indexScrollRef : readmissionScrollRef;
    pendingScrollTopRef.current = ref.current?.scrollTop ?? 0;
  }, []);

  const removeEvidenceGroup = useCallback(
    (groupId: string, options?: { skipConfirm?: boolean }) => {
      if (!annotation) return;
      const group = annotation.evidenceGroups.find((g) => g.id === groupId);
      if (!group) return;

      const spanCount = annotation.evidenceSpans.filter((sp) => sp.groupId === groupId).length;
      if (!options?.skipConfirm) {
        const ok = window.confirm(
          spanCount > 0
            ? `Delete "${group.label}" and its ${spanCount} highlight${spanCount !== 1 ? 's' : ''}?`
            : `Delete "${group.label}"?`,
        );
        if (!ok) return;
      }

      let nextFirstId: string | null = null;
      let nextAnnotation: ClinicianReadmissionAnnotation | null = null;
      updateAnnotation((prev) => {
        const next = removeEvidenceGroupFromAnnotation(prev, groupId);
        nextAnnotation = next;
        nextFirstId = next.evidenceGroups[0]?.id ?? null;
        return next;
      });

      setActiveGroupId((current) => {
        if (!nextAnnotation) return current;
        if (current === groupId) return nextFirstId;
        return resolveActiveGroupId(nextAnnotation, current);
      });
      setExpandedGroupId((current) => (current === groupId ? nextFirstId : current));
      showToast(`"${group.label}" removed.`, 'info');
    },
    [annotation, showToast, updateAnnotation],
  );

  const addHighlightToActiveGroup = useCallback(() => {
    if (!activeCase || !annotation) return;
    const sel = pendingSelectionRef.current ?? pendingSelection;
    if (!sel || sel.mappingError) {
      showToast('Fix selection mapping before highlighting.', 'warning');
      return;
    }
    const groupId = resolvedActiveGroupId;
    if (!groupId) {
      showToast('Select a readmission factor first.', 'warning');
      return;
    }

    const { noteType, startChar, endChar, selectedText, sectionTitle } = sel;
    const sameNoteSpans = spansForNote(annotation.evidenceSpans, noteType);

    const overlap = findOverlappingOtherGroupSpan(
      sameNoteSpans,
      startChar,
      endChar,
      groupId,
      noteType,
    );
    if (overlap) {
      const other = groupById.get(overlap.groupId);
      showToast(
        `This text is already highlighted for "${other?.label ?? 'another factor'}". Remove or reassign that highlight first.`,
        'warning',
      );
      return;
    }

    const duplicate = sameNoteSpans.some(
      (sp) => sp.groupId === groupId && sp.startChar === startChar && sp.endChar === endChar,
    );
    if (duplicate) {
      showToast('This exact passage is already highlighted in this factor.', 'info');
      return;
    }

    saveScrollPosition(noteType);

    const span: EvidenceSpan = {
      id: newId('span'),
      caseId: activeCase.caseId,
      noteType,
      groupId,
      factorId: null,
      sectionTitle,
      startChar,
      endChar,
      selectedText,
      createdAt: new Date().toISOString(),
    };

    updateAnnotation((prev) => addSpanToAnnotation(prev, span));
    clearPendingSelection();
    window.getSelection()?.removeAllRanges();
    showToast('Highlighted.', 'success');
  }, [
    activeCase?.caseId,
    annotation?.evidenceSpans,
    clearPendingSelection,
    groupById,
    pendingSelection,
    resolvedActiveGroupId,
    saveScrollPosition,
    showToast,
    updateAnnotation,
  ]);

  const removeHighlight = useCallback(
    (spanId: string) => {
      const span = annotation?.evidenceSpans.find((sp) => sp.id === spanId);
      if (span) saveScrollPosition(span.noteType);
      updateAnnotation((prev) => removeSpanFromAnnotation(prev, spanId));
    },
    [annotation?.evidenceSpans, saveScrollPosition, updateAnnotation],
  );

  const updateGroupNote = useCallback(
    (groupId: string, note: string) => {
      updateAnnotation((prev) => updateEvidenceGroupNote(prev, groupId, note));
    },
    [updateAnnotation],
  );

  const saveFactor = useCallback(
    (groupId: string, patch: FactorFinalizePatch) => {
      if (!annotation) return;
      const group = annotation.evidenceGroups.find((g) => g.id === groupId);
      if (!group) return;

      const patchErrors = validateFactorPatch(patch);
      if (patchErrors.length > 0) {
        showToast('Fix fields before saving this factor.', 'error', patchErrors);
        return;
      }

      if (group.finalizedFactorId) {
        updateAnnotation((prev) => updateFinalizedFactorInAnnotation(prev, groupId, patch));
        clearFactorFormDraft(groupId);
        showToast(`"${patch.label || group.label}" updated.`, 'success');
        return;
      }

      const groupSpans = annotation.evidenceSpans.filter((sp) => sp.groupId === groupId);
      if (groupSpans.length === 0) {
        showToast('Add at least one highlight before completing this factor.', 'warning');
        return;
      }

      updateAnnotation((prev) => finalizeGroupInAnnotation(prev, groupId, patch));
      clearFactorFormDraft(groupId);
      setExpandedGroupId(groupId);
      showToast(`"${patch.label || 'Factor'}" completed.`, 'success');
    },
    [
      annotation?.evidenceGroups,
      annotation?.evidenceSpans,
      clearFactorFormDraft,
      showToast,
      updateAnnotation,
    ],
  );

  const deleteFactorFromNote = useCallback(
    (groupId: string) => {
      if (!annotation) return;
      const group = annotation.evidenceGroups.find((g) => g.id === groupId);
      if (!group) return;

      const spanCount = annotation.evidenceSpans.filter((sp) => sp.groupId === groupId).length;
      const ok = window.confirm(
        spanCount > 0
          ? `Delete "${group.label}" and its ${spanCount} highlight${spanCount !== 1 ? 's' : ''}?`
          : `Delete "${group.label}"?`,
      );
      if (!ok) return;
      removeEvidenceGroup(groupId, { skipConfirm: true });
    },
    [annotation, removeEvidenceGroup],
  );

  const scrollToSpan = useCallback(
    (spanId: string) => {
      const span = annotation?.evidenceSpans.find((sp) => sp.id === spanId);
      if (!span) return;
      const root = span.noteType === 'index_hf' ? indexScrollRef.current : readmissionScrollRef.current;
      if (!root) return;
      const el = root.querySelector(
        `.note-root[data-note-type="${span.noteType}"] [data-char-start="${span.startChar}"]`,
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [annotation?.evidenceSpans],
  );

  const saveDraft = useCallback(() => {
    if (!activeCase || !annotation) return;
    void persistDraft()
      .then(() => {
        showToast(
          hasReadmissionBackend() ? 'Draft saved.' : 'Draft saved locally.',
          'success',
        );
      })
      .catch((e) => {
        showToast('Failed to save draft.', 'error', [e instanceof Error ? e.message : 'Unknown error']);
      });
  }, [activeCase, annotation, persistDraft, showToast]);

  const submitReview = useCallback(async () => {
    if (!activeCase || !annotation || submitting) return;

    setSubmitting(true);
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    try {
      if (dirty) {
        try {
          await persistDraft();
        } catch (e) {
          showToast('Failed to save draft before submit.', 'error', [
            e instanceof Error ? e.message : 'Unknown error',
          ]);
          return;
        }
      }

      const result = submitValidation;
      if (!result.ok) {
        showToast('Fix validation errors before submitting.', 'error', result.errors);
        return;
      }

      const next: ClinicianReadmissionAnnotation = {
        ...annotation,
        status: 'submitted' as const,
        updatedAt: new Date().toISOString(),
        noteVersions: activeCase.noteVersions,
        caseMetadata: caseMetadataFromCase(activeCase),
      };

      try {
        const saved = await readmissionApi.submitAnnotation(next);
        setAnnotation(saved);
        lastSavedSnapshotRef.current = snapshot(saved);
        setDirty(false);
        setSaveStatus('saved');
        setLastSavedAt(new Date().toISOString());
        setSaveError(null);
        onQueueRefresh?.();
        if (result.warnings.length > 0) {
          showToast('Submitted with warnings.', 'warning', result.warnings);
        } else {
          showToast('Review submitted.', 'success');
        }
        onSubmitSuccess?.();
      } catch (e) {
        showToast('Failed to submit.', 'error', [
          e instanceof Error ? e.message : 'Unknown error',
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    activeCase,
    annotation,
    dirty,
    onQueueRefresh,
    onSubmitSuccess,
    persistDraft,
    showToast,
    submitting,
    submitValidation,
  ]);

  const exportJson = useCallback(() => {
    if (!annotation || !activeCase) return;
    downloadAnnotationJson({
      ...annotation,
      caseMetadata: caseMetadataFromCase(activeCase),
    });
    showToast('JSON exported.', 'success');
  }, [activeCase, annotation, showToast]);

  const highlightCount = annotation?.evidenceSpans.length ?? 0;
  const finalizedFactorCount =
    annotation?.evidenceGroups.filter((g) => g.finalizedFactorId).length ?? 0;

  if (!activeCase || !annotation || annotationLoading) {
    return {
      activeCase: null,
      annotation: null,
      loading: true,
      caseIndex: -1,
      caseCount: queueRowIds.length,
      caseNotes: null,
      indexNote: null,
      readmissionNote: null,
      activeGroupId: null,
      activeGroup: null,
      expandedGroupId,
      setExpandedGroupId,
      pendingSelection,
      setPendingSelectionSafe,
      clearPendingSelection,
      dirty,
      saveStatus,
      lastSavedAt,
      saveError,
      submitting,
      toast,
      dismissToast,
      groupById: new Map(),
      spansByGroupId: new Map(),
      factorById: new Map(),
      highlightCount: 0,
      finalizedFactorCount: 0,
      submitValidation: { ok: false, errors: [], warnings: [] },
      indexScrollRef,
      readmissionScrollRef,
      groupCardRefs,
      goPrevCase,
      goNextCase,
      selectGroup,
      toggleGroupExpand,
      factorFormDrafts,
      updateFactorFormDraft,
      getFactorFormDraft,
      renameGroup,
      addEvidenceGroup,
      removeEvidenceGroup,
      addHighlightToActiveGroup,
      removeHighlight,
      saveFactor,
      updateGroupNote,
      scrollToSpan,
      deleteFactorFromNote,
      saveDraft,
      submitReview,
      exportJson,
      isDefaultFactorLabel,
    };
  }

  return {
    activeCase,
    annotation,
    loading: false,
    caseIndex,
    caseCount: queueRowIds.length,
    caseNotes,
    indexNote: {
      noteType: 'index_hf' as const,
      title: 'Index HF admission',
      rawNote: activeCase.indexRawNote,
      sections: indexSections,
      segments: indexSegments,
      scrollRef: indexScrollRef,
    },
    readmissionNote: {
      noteType: 'readmission' as const,
      title: 'Readmission discharge',
      rawNote: activeCase.readmissionRawNote,
      sections: readmissionSections,
      segments: readmissionSegments,
      scrollRef: readmissionScrollRef,
    },
    activeGroupId: resolvedActiveGroupId,
    activeGroup,
    expandedGroupId,
    setExpandedGroupId,
    pendingSelection,
    setPendingSelectionSafe,
    clearPendingSelection,
    dirty,
    saveStatus,
    lastSavedAt,
    saveError,
    submitting,
    toast,
    dismissToast,
    groupById,
    spansByGroupId,
    factorById,
    highlightCount,
    finalizedFactorCount,
    submitValidation,
    indexScrollRef,
    readmissionScrollRef,
    groupCardRefs,
    goPrevCase,
    goNextCase,
    selectGroup,
    toggleGroupExpand,
    factorFormDrafts,
    updateFactorFormDraft,
    getFactorFormDraft,
    renameGroup,
    addEvidenceGroup,
    removeEvidenceGroup,
    addHighlightToActiveGroup,
    removeHighlight,
    saveFactor,
    updateGroupNote,
    scrollToSpan,
    deleteFactorFromNote,
    saveDraft,
    submitReview,
    exportJson,
    isDefaultFactorLabel,
  };
}
