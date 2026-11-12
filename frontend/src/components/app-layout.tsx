import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Ma journée' },
  { to: '/dashboard', label: 'Tableau de bord' },
  { to: '/calendrier', label: 'Calendrier' },
  { to: '/conges', label: 'Mes congés' },
  { to: '/rapports', label: 'Rapports' },
  { to: '/profil', label: 'Mon profil' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        const toggle = document.querySelector('.app-menu-toggle');
        if (toggle && !toggle.contains(e.target as Node)) setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-brand" onClick={closeMenu}>
            Gere-o
          </Link>

          {user && (
            <>
              <button
                type="button"
                className="app-menu-toggle"
                aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? '✕' : '☰'}
              </button>

              <nav ref={navRef} className={`app-nav ${menuOpen ? 'app-nav--open' : ''}`} aria-label="Navigation principale">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="nav-link"
                    aria-current={location.pathname === item.to ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
                <span className="app-user-name">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  type="button"
                  className="app-logout"
                  onClick={handleLogout}
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </nav>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}