import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

type IconName =
  | 'clock'
  | 'grid'
  | 'calendar'
  | 'umbrella'
  | 'file'
  | 'wallet'
  | 'user'
  | 'logout'
  | 'menu'
  | 'close';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  subItems?: Array<{ to: string; label: string }>;
}

const FINANCE_SUB_ITEMS = [
  { to: '/cotisations', label: 'Tableau de bord' },
  { to: '/cotisations/cotisations', label: 'Cotisations' },
  { to: '/cotisations/depenses', label: 'Dépenses' },
  { to: '/cotisations/membres', label: 'Membres' },
  { to: '/cotisations/journal', label: 'Historique de la caisse' },
];

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Ma journée', icon: 'clock' },
  { to: '/dashboard', label: 'Tableau de bord', icon: 'grid' },
  { to: '/calendrier', label: 'Calendrier', icon: 'calendar' },
  { to: '/conges', label: 'Mes congés', icon: 'umbrella' },
  { to: '/rapports', label: 'Rapports', icon: 'file' },
  {
    to: '/cotisations',
    label: 'Cotisations',
    icon: 'wallet',
    subItems: FINANCE_SUB_ITEMS,
  },
  { to: '/profil', label: 'Mon profil', icon: 'user' },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'umbrella':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9Z" />
          <path d="M12 12v7a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'file':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="3" />
          <path d="M3 10h18M16 15h2" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    default:
      return null;
  }
}

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(() =>
    location.pathname.startsWith('/cotisations'),
  );

  useEffect(() => {
    if (!menuOpen) return;
    const sidebar = document.getElementById('app-sidebar');
    const toggle = document.querySelector<HTMLButtonElement>('.app-menu-toggle');
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggle?.focus();
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = user ? initialsOf(firstName, lastName) : '';
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const dateLabel = `${today.charAt(0).toUpperCase()}${today.slice(1)}`;

  return (
    <div className="app-shell">
      <aside
        id="app-sidebar"
        className={`app-sidebar ${menuOpen ? 'app-sidebar--open' : ''}`}
        aria-label="Barre de navigation"
      >
        <Link
          to="/"
          className="app-sidebar__brand"
          onClick={closeMenu}
          aria-label="Gere-o — Accueil"
        >
          <span className="app-brand-mark">G</span>
          <span className="app-brand-word">Gere-o</span>
        </Link>

        <nav className="app-sidebar__nav" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            if (item.subItems) {
              const isActive = location.pathname.startsWith('/cotisations');
              return (
                <div className="sidebar-group" key={item.to}>
                  <button
                    type="button"
                    className={`sidebar-link sidebar-link--group ${financeOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`}
                    data-label={item.label}
                    aria-label={item.label}
                    aria-expanded={financeOpen}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setFinanceOpen((value) => !value)}
                  >
                    <Icon name={item.icon} />
                    <span className="sidebar-link__label">{item.label}</span>
                  </button>
                  {financeOpen && (
                    <div className="sidebar-flyout" aria-label="Sous-menu Cotisations">
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          className={`sidebar-flyout__link ${location.pathname === sub.to ? 'is-current' : ''}`}
                          onClick={closeMenu}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className="sidebar-link"
                data-label={item.label}
                aria-label={item.label}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                onClick={closeMenu}
              >
                <Icon name={item.icon} />
                <span className="sidebar-link__label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="app-sidebar__footer">
            <div className="app-sidebar__account" title={fullName}>
              <span className="app-avatar">{initials}</span>
              <span className="app-sidebar__account-text">
                <strong>{fullName}</strong>
                <span>{user.email}</span>
              </span>
            </div>
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <Icon name="logout" size={18} />
              <span className="sidebar-logout__label">Se déconnecter</span>
            </button>
          </div>
        )}
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={closeMenu}
        />
      )}

      <div className="app-frame">
        <header className="app-topbar">
          <button
            type="button"
            className="app-menu-toggle"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>

          <div className="app-topbar__greeting">
            <span className="app-topbar__eyebrow">Espace personnel</span>
            <span className="app-topbar__title">
              Bonjour, {firstName || 'à vous'}
            </span>
          </div>

          <span className="app-date-chip">
            <Icon name="calendar" size={14} />
            {dateLabel}
          </span>

          {user && (
            <div className="app-topbar__user">
              <div className="app-user-chip">
                <span className="app-avatar app-avatar--sm">{initials}</span>
                <span className="app-user-chip__text">
                  <span className="app-user-chip__name">{fullName}</span>
                  <span className="app-user-chip__email">{user.email}</span>
                </span>
              </div>
            </div>
          )}
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
