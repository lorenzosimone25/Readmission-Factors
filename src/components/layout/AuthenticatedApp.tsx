import { useCallback } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ReadmissionNavigationGuard } from '@/features/readmission/components/ReadmissionNavigationGuard';
import { ReadmissionSessionProvider } from '@/features/readmission/context/ReadmissionSessionContext';
import { useReadmissionQueue } from '@/features/readmission/context/ReadmissionQueueContext';
import { SyncProvider } from '@/features/readmission/offline/SyncProvider';
import { NotesLeftPage } from '@/pages/NotesLeftPage';
import { ReadmissionPage } from '@/pages/ReadmissionPage';

export function AuthenticatedApp() {
  const queue = useReadmissionQueue();

  const handleBootstrapComplete = useCallback(() => {
    void queue.refresh();
  }, [queue.refresh]);

  const handleAfterSave = useCallback(() => {
    void queue.refresh();
  }, [queue.refresh]);

  return (
    <SyncProvider onBootstrapComplete={handleBootstrapComplete}>
      <ReadmissionSessionProvider onAfterSave={handleAfterSave}>
        <ReadmissionNavigationGuard />
        <AppShell>
          <Routes>
            <Route path="/" element={<NotesLeftPage />} />
            <Route path="/research" element={<ReadmissionPage />} />
          </Routes>
        </AppShell>
      </ReadmissionSessionProvider>
    </SyncProvider>
  );
}
