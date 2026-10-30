import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthProvider';
import { RequireAuth } from '@/components/RequireAuth';
import { AppShell } from '@/components/AppShell';
import LoginPage from '@/routes/LoginPage';
import HomePage from '@/routes/HomePage';
import ComingSoonPage from '@/routes/ComingSoonPage';

/**
 * Route table.
 *
 * `/home` is the landing screen once signed in. The stub routes exist so every
 * link on the home page resolves; each one is replaced by its real screen as
 * it is built.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />

                <Route
                  path="/attendance"
                  element={
                    <ComingSoonPage
                      title="Attendance"
                      description="Marking a section's attendance, the way the app does it — one list, one tap per student, and a register that stays in sync with the phone."
                    />
                  }
                />
                <Route
                  path="/announcements"
                  element={
                    <ComingSoonPage
                      title="Announcements"
                      description="Writing and reading announcements, to everyone, to one school, or to a single section."
                    />
                  }
                />
                <Route
                  path="/fees"
                  element={
                    <ComingSoonPage
                      title="Fees"
                      description="Fee structures, invoices, and the counter payments an admin records by hand."
                    />
                  }
                />
                <Route
                  path="/school"
                  element={
                    <ComingSoonPage
                      title="School"
                      description="Sections, staff accounts and the academic calendar."
                    />
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ComingSoonPage
                      title="Notifications"
                      description="Everything that has happened on your account, in one list."
                    />
                  }
                />
              </Route>
            </Route>

            {/* Unknown paths are not an error page yet — send them to the root,
                which either lands on the home page or bounces to /login. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
