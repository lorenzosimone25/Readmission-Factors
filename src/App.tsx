import { RequireAuth } from '@/components/auth/RequireAuth';
import { AuthenticatedApp } from '@/components/layout/AuthenticatedApp';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardUiProvider } from '@/context/DashboardUiContext';
import { ReadmissionQueueProvider } from '@/features/readmission/context/ReadmissionQueueContext';
import { LoginPage } from '@/pages/LoginPage';

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
                  <AuthenticatedApp />
                </RequireAuth>
              }
            />
          </Routes>
        </ReadmissionQueueProvider>
      </DashboardUiProvider>
    </AuthProvider>
  );
}
