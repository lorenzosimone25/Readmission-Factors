import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ReadmissionSessionValue = {
  dirty: boolean;
  hasActiveCase: boolean;
  guardDisabled: boolean;
  leaveDialogOpen: boolean;
  leaveSaving: boolean;
  requestLeave: (proceed: () => void) => void;
  saveAndLeave: () => Promise<void>;
  discardAndLeave: () => void;
  cancelLeave: () => void;
};

const ReadmissionSessionContext = createContext<ReadmissionSessionValue | null>(null);

type SessionRegistration = {
  dirty: boolean;
  hasActiveCase: boolean;
  guardDisabled: boolean;
  persistDraft: () => Promise<void>;
  discardChanges: () => void;
};

export function ReadmissionSessionProvider({
  children,
  onAfterSave,
}: {
  children: ReactNode;
  onAfterSave?: () => void;
}) {
  const [registration, setRegistration] = useState<SessionRegistration | null>(null);
  const [pendingProceed, setPendingProceed] = useState<(() => void) | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);

  const registerSession = useCallback((next: SessionRegistration | null) => {
    setRegistration(next);
  }, []);

  const requestLeave = useCallback(
    (proceed: () => void) => {
      if (!registration?.dirty || registration?.guardDisabled) {
        proceed();
        return;
      }
      setPendingProceed(() => proceed);
      setLeaveDialogOpen(true);
    },
    [registration?.dirty, registration?.guardDisabled],
  );

  const cancelLeave = useCallback(() => {
    setLeaveDialogOpen(false);
    setPendingProceed(null);
  }, []);

  const discardAndLeave = useCallback(() => {
    registration?.discardChanges();
    const proceed = pendingProceed;
    setLeaveDialogOpen(false);
    setPendingProceed(null);
    proceed?.();
  }, [pendingProceed, registration]);

  const saveAndLeave = useCallback(async () => {
    if (!registration) return;
    setLeaveSaving(true);
    try {
      await registration.persistDraft();
      const proceed = pendingProceed;
      setLeaveDialogOpen(false);
      setPendingProceed(null);
      onAfterSave?.();
      proceed?.();
    } catch {
      // keep the dialog open so the user can retry or discard; save error
      // surfaces via the review-bar indicator + toast
    } finally {
      setLeaveSaving(false);
    }
  }, [onAfterSave, pendingProceed, registration]);

  const sessionValue = useMemo<ReadmissionSessionValue>(
    () => ({
      dirty: registration?.dirty ?? false,
      hasActiveCase: registration?.hasActiveCase ?? false,
      guardDisabled: registration?.guardDisabled ?? false,
      leaveDialogOpen,
      leaveSaving,
      requestLeave,
      saveAndLeave,
      discardAndLeave,
      cancelLeave,
    }),
    [
      cancelLeave,
      discardAndLeave,
      leaveDialogOpen,
      leaveSaving,
      registration?.dirty,
      registration?.guardDisabled,
      registration?.hasActiveCase,
      requestLeave,
      saveAndLeave,
    ],
  );

  return (
    <ReadmissionSessionContext.Provider value={sessionValue}>
      <SessionRegistrationContext.Provider value={registerSession}>
        {children}
      </SessionRegistrationContext.Provider>
    </ReadmissionSessionContext.Provider>
  );
}

const SessionRegistrationContext = createContext<
  ((next: SessionRegistration | null) => void) | null
>(null);

export function useReadmissionSession(): ReadmissionSessionValue | null {
  return useContext(ReadmissionSessionContext);
}

export function useRegisterReadmissionSession(): (next: SessionRegistration | null) => void {
  const register = useContext(SessionRegistrationContext);
  if (!register) {
    throw new Error('useRegisterReadmissionSession must be used within ReadmissionSessionProvider');
  }
  return register;
}
