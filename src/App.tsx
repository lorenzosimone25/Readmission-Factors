import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardUiProvider } from '@/context/DashboardUiContext';
import { ReadmissionQueueProvider } from '@/features/readmission/context/ReadmissionQueueContext';
import { LoginPage } from '@/pages/LoginPage';
import { NotesLeftPage } from '@/pages/NotesLeftPage';
import { ReadmissionPage } from '@/pages/ReadmissionPage';

import { Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <AuthProvider>
      <DashboardUiProvider>
        <ReadmissionQueueProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<NotesLeftPage />} />
                      <Route path="/research" element={<ReadmissionPage />} />
                    </Routes>
                  </AppShell>
                </RequireAuth>
              }
            />
          </Routes>
        </ReadmissionQueueProvider>
      </DashboardUiProvider>
    </AuthProvider>
  );
}
