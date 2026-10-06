import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/app-layout';
import { ProtectedRoute } from './components/protected-route';
import { HomePage } from './pages/home-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
