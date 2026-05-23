import { DashboardUiProvider } from '@/context/DashboardUiContext';
import { AppShell } from '@/components/layout/AppShell';
import { ReadmissionQueueProvider } from '@/features/readmission/context/ReadmissionQueueContext';
import { NotesLeftPage } from '@/pages/NotesLeftPage';
import { ReadmissionPage } from '@/pages/ReadmissionPage';

import { Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <DashboardUiProvider>
      <ReadmissionQueueProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<NotesLeftPage />} />
            <Route path="/research" element={<ReadmissionPage />} />
          </Routes>
        </AppShell>
      </ReadmissionQueueProvider>
    </DashboardUiProvider>
  );
}
