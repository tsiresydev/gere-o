import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/app-layout';
import { ProtectedRoute } from './components/protected-route';
import { DashboardPage } from './pages/dashboard-page';
import { CalendarPage } from './pages/calendar-page';
import { LeavesPage } from './pages/leaves-page';
import { ProfilePage } from './pages/profile-page';
import { ReportsPage } from './pages/reports-page';
import { WorkDayPage } from './pages/work-day-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { ContributionsDashboardPage } from './pages/contributions/contributions-dashboard-page';
import { ContributionsPage } from './pages/contributions/contributions-page';
import { ExpensesPage } from './pages/contributions/expenses-page';
import { MembersPage } from './pages/contributions/members-page';
import { CategoriesPage } from './pages/contributions/categories-page';
import { CashJournalPage } from './pages/contributions/cash-journal-page';

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
          <Route path="/rapports" element={<ReportsPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/cotisations" element={<ContributionsDashboardPage />} />
          <Route path="/cotisations/cotisations" element={<ContributionsPage />} />
          <Route path="/cotisations/depenses" element={<ExpensesPage />} />
          <Route path="/cotisations/membres" element={<MembersPage />} />
          <Route path="/cotisations/categories" element={<CategoriesPage />} />
          <Route path="/cotisations/journal" element={<CashJournalPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
