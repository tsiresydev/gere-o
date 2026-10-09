import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/app-layout';
import { ProtectedRoute } from './components/protected-route';
import { DashboardPage } from './pages/dashboard-page';
import { CalendarPage } from './pages/calendar-page';
import { LeavesPage } from './pages/leaves-page';
import { ProfilePage } from './pages/profile-page';
import { WorkDayPage } from './pages/work-day-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WorkDayPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calendrier" element={<CalendarPage />} />
          <Route path="/conges" element={<LeavesPage />} />
          <Route path="/profil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
