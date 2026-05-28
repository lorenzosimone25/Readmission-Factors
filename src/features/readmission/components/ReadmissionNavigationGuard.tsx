import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

import { UnsavedChangesDialog } from '@/features/readmission/components/UnsavedChangesDialog';
import { useReadmissionSession } from '@/features/readmission/context/ReadmissionSessionContext';

export function ReadmissionNavigationGuard() {
  const session = useReadmissionSession();
  const handledBlockRef = useRef(false);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!session?.dirty || !session.hasActiveCase) return false;
    if (session.guardDisabled) return false;
    if (
      currentLocation.pathname === nextLocation.pathname &&
      currentLocation.search === nextLocation.search
    ) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (blocker.state !== 'blocked' || !session) {
      handledBlockRef.current = false;
      return;
    }
    if (handledBlockRef.current) return;
    handledBlockRef.current = true;
    session.requestLeave(() => {
      handledBlockRef.current = false;
      blocker.proceed();
    });
  }, [blocker, session]);

  if (!session) return null;

  const handleCancel = () => {
    session.cancelLeave();
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    handledBlockRef.current = false;
  };

  const handleSave = () => {
    void session.saveAndLeave().then(() => {
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    });
  };

  return (
    <UnsavedChangesDialog
      open={session.leaveDialogOpen}
      saving={session.leaveSaving}
      onSave={handleSave}
      onDiscard={session.discardAndLeave}
      onCancel={handleCancel}
    />
  );
}
