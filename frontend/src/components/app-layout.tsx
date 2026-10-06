import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { ROLE_LABELS, roleClass } from '../types/roles';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-brand">Gere-o</span>

          {user && (
            <div className="app-header__user">
              <span className="app-user-name">
                {user.firstName} {user.lastName}
              </span>
              <span className={`role-badge role-badge--${roleClass(user.role)}`}>
                {ROLE_LABELS[user.role]}
              </span>
              <button type="button" className="button button--ghost" onClick={handleLogout}>
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
