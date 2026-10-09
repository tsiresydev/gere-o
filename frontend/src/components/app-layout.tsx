import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { ROLE_LABELS, roleClass } from '../types/roles';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-brand">
            Gere-o
          </Link>

          {user && (
            <div className="app-header__user">
               <Link to="/" className="nav-link" aria-current={location.pathname === '/' ? 'page' : undefined}>
                 Ma journée
               </Link>
               <Link to="/dashboard" className="nav-link" aria-current={location.pathname === '/dashboard' ? 'page' : undefined}>
                 Tableau de bord
               </Link>
               <Link to="/calendrier" className="nav-link" aria-current={location.pathname === '/calendrier' ? 'page' : undefined}>
                 Calendrier
               </Link>
               <Link to="/conges" className="nav-link" aria-current={location.pathname === '/conges' ? 'page' : undefined}>
                 Mes congés
               </Link>
               <Link to="/profil" className="nav-link" aria-current={location.pathname === '/profil' ? 'page' : undefined}>
                 Mon profil
               </Link>
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
