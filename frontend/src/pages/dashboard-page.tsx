import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-date-range';
import type { Range, RangeKeyDict } from 'react-date-range';
import { ApiError } from '../services/api';
import { dashboardService } from '../services/dashboard.service';
import { workDaysService } from '../services/work-days.service';
import type { Dashboard } from '../types/dashboard';
import type { WorkDay } from '../types/work-day';
import {
  formatBalance,
  formatDateFr,
  formatDays,
  formatDuration,
} from '../utils/time';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface ChartPoint {
  key: string;
  label: string;
  title: string;
  value: number;
  objective: number;
  isWeekend?: boolean;
  isActive?: boolean;
}

type IconName =
  | 'sun'
  | 'week'
  | 'calendar'
  | 'spark'
  | 'refresh'
  | 'chevron-left'
  | 'chevron-right';

const WEEKDAY_LABELS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
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
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case 'week':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path d="M3 17l5-6 4 3 7-9" />
          <path d="M15 5h4v4" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      );
    default:
      return null;
  }
}

function balanceModifier(value: number): string {
  if (value > 0) return 'is-positive';
  if (value < 0) return 'is-negative';
  return '';
}

function BarChart({ points }: { points: ChartPoint[] }) {
  const scale = Math.max(
    1,
    ...points.map((point) => Math.max(point.value, point.objective)),
  );

  return (
    <div
      className="bar-chart"
      role="img"
      aria-label="Graphique des heures travaillées"
    >
      {points.map((point) => (
        <div className="bar-chart__column" key={point.key} title={point.title}>
          <div className="bar-chart__track">
            <div
              className={`bar-chart__bar ${
                point.isActive ? 'bar-chart__bar--active' : ''
              } ${point.isWeekend ? 'bar-chart__bar--weekend' : ''}`}
              style={{ height: `${Math.round((point.value / scale) * 100)}%` }}
            />
            {point.objective > 0 && (
              <span
                className="bar-chart__objective"
                style={{
                  bottom: `${Math.round((point.objective / scale) * 100)}%`,
                }}
              />
            )}
          </div>
          <span
            className={`bar-chart__label ${
              point.isWeekend ? 'bar-chart__label--weekend' : ''
            }`}
          >
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniBars({
  values,
  activeIndex,
  mutedIndexes = [],
}: {
  values: number[];
  activeIndex?: number;
  mutedIndexes?: number[];
}) {
  const max = Math.max(1, ...values);

  return (
    <div className="mini-bars" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={index}
          className={`mini-bars__bar ${
            index === activeIndex ? 'mini-bars__bar--active' : ''
          } ${mutedIndexes.includes(index) ? 'mini-bars__bar--muted' : ''}`}
          style={{ height: `${Math.max(10, Math.round((value / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 37 - (value / max) * 31;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `0,40 ${points.join(' ')} 100,40`;

  return (
    <svg
      className="sparkline"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={area} />
      <polyline points={points.join(' ')} />
    </svg>
  );
}

function Donut({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const style = { '--donut-value': `${percent}%` } as CSSProperties;

  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={style}
        role="img"
        aria-label={`${percent} % de l'objectif hebdomadaire réalisé`}
      >
        <div className="donut__inner">
          <span className="donut__value">{percent}%</span>
          <span className="donut__label">Objectif</span>
        </div>
      </div>
      <div className="progress-legend" aria-hidden="true">
        <span>Réalisé</span>
        <span>Restant</span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [history, setHistory] = useState<WorkDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [range, setRange] = useState<Range>({ key: 'selection' });
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      dashboardService.get(weekStart ?? undefined),
      workDaysService.list({ ...historyFilters, limit: 5 }),
    ])
      .then(([data, page]) => {
        if (!cancelled) {
          setDashboard(data);
          setHistory(page.items);
          setError(null);
          setWeekLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Impossible de charger le tableau de bord.',
          );
          setWeekLoading(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, weekStart, historyFilters]);

  const handleRangeChange = (ranges: RangeKeyDict): void => {
    setRange(ranges.selection);
  };

  const applyHistoryFilters = (): void => {
    setHistoryFilters({
      startDate: range.startDate
        ? format(range.startDate, 'yyyy-MM-dd')
        : undefined,
      endDate: range.endDate ? format(range.endDate, 'yyyy-MM-dd') : undefined,
    });
    setShowCalendar(false);
  };

  const clearHistoryFilters = (): void => {
    setRange({ key: 'selection' });
    setHistoryFilters({});
  };

  const rangeLabel =
    range.startDate && range.endDate
      ? `Du ${format(range.startDate, 'dd/MM/yyyy')} au ${format(range.endDate, 'dd/MM/yyyy')}`
      : 'Sélectionner une période';

  const retry = (): void => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  const navigateWeek = (direction: 'prev' | 'next'): void => {
    const currentWeekStart = weekStart ?? dashboard?.week.weekStart;
    if (!currentWeekStart) return;
    const date = new Date(`${currentWeekStart}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + (direction === 'next' ? 7 : -7));
    const newWeekStart = date.toISOString().slice(0, 10);
    setWeekStart(newWeekStart);
    setWeekLoading(true);
  };

  const goToCurrentWeek = (): void => {
    if (weekStart !== null) {
      setWeekStart(null);
      setWeekLoading(true);
    }
  };

  if (loading) {
    return (
      <div className="page dashboard-page" aria-busy="true">
        <div className="page__head page__head--split">
          <div>
            <span className="page__eyebrow">Vue d&apos;ensemble</span>
            <h1 className="page__title">Tableau de bord</h1>
          </div>
        </div>
        <div className="kpi-grid">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton skeleton--kpi" />
          ))}
        </div>
        <div className="dashboard-grid">
          <div className="skeleton skeleton--panel" />
          <div className="skeleton skeleton--panel" />
        </div>
        <span className="sr-only" role="status">
          Chargement du tableau de bord…
        </span>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">Tableau de bord</h1>
        </div>
        <div className="alert alert--error" role="alert">
          {error ?? 'Une erreur est survenue.'}
        </div>
        <button type="button" className="button" onClick={retry}>
          Réessayer
        </button>
      </div>
    );
  }

  const { today, week, leaves, trends, stats } = dashboard;
  const dailyObjective = today.expectedMinutes;
  const isCurrentWeek = weekStart === null;
  const weekProgress =
    week.expectedMinutes > 0
      ? Math.min(100, Math.round((week.workedMinutes / week.expectedMinutes) * 100))
      : 0;
  const weekRemaining = Math.max(0, week.expectedMinutes - week.workedMinutes);
  const dailyActiveIndex = trends.daily.findIndex(
    (point) => point.date === today.date,
  );

  const dailyPoints: ChartPoint[] = trends.daily.map((point) => ({
    key: point.date,
    label: WEEKDAY_LABELS[new Date(`${point.date}T00:00:00`).getDay()],
    title: `${formatDateFr(point.date)} : ${formatDuration(point.workedMinutes)}`,
    value: point.workedMinutes,
    objective: point.isWeekend ? 0 : dailyObjective,
    isWeekend: point.isWeekend,
    isActive: point.date === today.date,
  }));

  const weeklyPoints: ChartPoint[] = trends.weekly.map((point) => ({
    key: point.weekStart,
    label: `${point.weekStart.slice(8)}/${point.weekStart.slice(5, 7)}`,
    title: `Semaine du ${formatDateFr(point.weekStart)} : ${formatDuration(point.workedMinutes)}`,
    value: point.workedMinutes,
    objective: point.expectedMinutes,
    isActive: point.weekStart === week.weekStart,
  }));

  const hasDailyData = trends.daily.some((point) => point.workedMinutes > 0);
  const updatedAt = new Date(dashboard.generatedAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const holidaySuffix = leaves.holidaysThisMonth > 1 ? 's' : '';

  return (
    <div className="page dashboard-page">
      <header className="page__head page__head--split">
        <div>
          <span className="page__eyebrow">Vue d&apos;ensemble</span>
          <h1 className="page__title">Tableau de bord</h1>
          <p className="page__subtitle">
            Votre activité et vos congés en un coup d&apos;œil.
          </p>
        </div>
        <div className="page__actions">
          <span className="update-chip">Mis à jour à {updatedAt}</span>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={retry}
          >
            <Icon name="refresh" size={14} />
            Actualiser
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <section className="kpi-grid" aria-label="Indicateurs clés">
        <article className="kpi-card kpi-card--violet">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Aujourd&apos;hui</span>
            <span className="kpi-card__icon">
              <Icon name="sun" size={18} />
            </span>
          </div>
          <strong className="kpi-card__value">
            {formatDuration(today.workedMinutes)}
          </strong>
          <p className="kpi-card__note">
            {today.recorded ? (
              <>
                Objectif {formatDuration(today.expectedMinutes)}{' '}
                <span
                  className={`kpi-balance ${
                    today.balanceMinutes >= 0
                      ? 'kpi-balance--positive'
                      : 'kpi-balance--negative'
                  }`}
                >
                  {formatBalance(today.balanceMinutes)}
                </span>
              </>
            ) : (
              'Journée non pointée'
            )}
          </p>
          <div className="kpi-card__foot">
            <MiniBars
              values={trends.daily.map((point) => point.workedMinutes)}
              activeIndex={dailyActiveIndex}
              mutedIndexes={trends.daily
                .map((point, index) => (point.isWeekend ? index : -1))
                .filter((index) => index >= 0)}
            />
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Cette semaine</span>
            <span className="kpi-card__icon">
              <Icon name="week" size={18} />
            </span>
          </div>
          <strong className="kpi-card__value">
            {formatDuration(week.workedMinutes)}
          </strong>
          <p className="kpi-card__note">
            Objectif {formatDuration(week.expectedMinutes)} ·{' '}
            <span className={balanceModifier(week.balanceMinutes)}>
              {formatBalance(week.balanceMinutes)}
            </span>
          </p>
          <div className="kpi-progress">
            <div className="kpi-progress__track">
              <span
                className="kpi-progress__fill"
                style={{ width: `${weekProgress}%` }}
              />
            </div>
            <div className="kpi-progress__meta">
              <span>{weekProgress}% de l&apos;objectif</span>
              <span>{formatDuration(weekRemaining)} restantes</span>
            </div>
          </div>
        </article>

        <article className="kpi-card kpi-card--warm">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Solde de congés</span>
            <span className="kpi-card__icon">
              <Icon name="calendar" size={18} />
            </span>
          </div>
          <strong className="kpi-card__value">
            {formatDays(leaves.availableDays)}
          </strong>
          <p className="kpi-card__note">
            {formatDays(leaves.consumedThisMonth)} pris ce mois
          </p>
          <div className="kpi-card__foot kpi-card__meta">
            <span className="kpi-chip">
              {formatDays(leaves.pendingDays)} en attente
            </span>
            <span className="kpi-chip">
              {leaves.holidaysThisMonth} férié{holidaySuffix}
            </span>
          </div>
        </article>

        <article className="kpi-card kpi-card--dark">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Jours travaillés</span>
            <span className="kpi-card__icon">
              <Icon name="spark" size={18} />
            </span>
          </div>
          <strong className="kpi-card__value">
            {formatDays(leaves.workedDaysThisMonth)}
          </strong>
          <p className="kpi-card__note">ce mois · hors fériés et congés</p>
          <div className="kpi-card__foot">
            <Sparkline
              values={trends.weekly.map((point) => point.workedMinutes)}
            />
          </div>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">Activité de la semaine</h2>
              <p className="section-head__subtitle">
                Heures travaillées par jour
              </p>
            </div>
            <span className="chart-legend" aria-hidden="true">
              <span>
                <i className="chart-legend__dot" />
                Réalisé
              </span>
              <span>
                <i className="chart-legend__dash" />
                Objectif
              </span>
            </span>
          </div>
          {hasDailyData ? (
            <BarChart points={dailyPoints} />
          ) : (
            <p className="empty-state">
              Aucune journée enregistrée cette semaine.
            </p>
          )}
        </section>

        <aside className="card progress-card">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">Progression</h2>
              <p className="section-head__subtitle">
                Semaine du {formatDateFr(week.weekStart)} au{' '}
                {formatDateFr(week.weekEnd)}
              </p>
            </div>
            {!isCurrentWeek && (
              <button
                type="button"
                className="link-button"
                onClick={goToCurrentWeek}
                disabled={weekLoading}
              >
                Aujourd&apos;hui
              </button>
            )}
          </div>

          {weekLoading ? (
            <div className="progress-card__loading">
              <div className="skeleton skeleton--donut" />
              <div className="skeleton skeleton--text" />
            </div>
          ) : (
            <Donut value={week.workedMinutes} max={week.expectedMinutes} />
          )}

          <div className="progress-card__stats">
            <div className="progress-stat">
              <span>Réalisé</span>
              <strong>{formatDuration(week.workedMinutes)}</strong>
            </div>
            <div className="progress-stat">
              <span>Objectif</span>
              <strong>{formatDuration(week.expectedMinutes)}</strong>
            </div>
            <div className="progress-stat">
              <span>Solde</span>
              <strong className={balanceModifier(week.balanceMinutes)}>
                {formatBalance(week.balanceMinutes)}
              </strong>
            </div>
            <div className="progress-stat">
              <span>Jours pointés</span>
              <strong>{week.recordedDays}</strong>
            </div>
          </div>

          <div className="progress-card__nav">
            <button
              type="button"
              className="icon-button"
              onClick={() => navigateWeek('prev')}
              aria-label="Semaine précédente"
              disabled={weekLoading}
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <span className="progress-card__nav-label">
              {isCurrentWeek ? 'Semaine actuelle' : 'Semaine sélectionnée'}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => navigateWeek('next')}
              aria-label="Semaine suivante"
              disabled={weekLoading}
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </aside>
      </div>

      <div className="dashboard-grid dashboard-grid--balanced">
        <section className="card chart-card chart-card--short">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">Tendance hebdomadaire</h2>
              <p className="section-head__subtitle">8 dernières semaines</p>
            </div>
            <span className="pill">8 semaines</span>
          </div>
          <BarChart points={weeklyPoints} />
        </section>

        <aside className="card stats-panel">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">
                {stats.windowDays} derniers jours
              </h2>
              <p className="section-head__subtitle">Vue d&apos;ensemble</p>
            </div>
          </div>
          <ul className="stats-panel__list">
            <li>
              <span>Jours pointés</span>
              <strong>{stats.recordedDays}</strong>
            </li>
            <li>
              <span>Total travaillé</span>
              <strong>{formatDuration(stats.totalWorkedMinutes)}</strong>
            </li>
            <li>
              <span>Moyenne / jour</span>
              <strong>{formatDuration(stats.averageMinutesPerDay)}</strong>
            </li>
            <li>
              <span>Au-dessus de l&apos;objectif</span>
              <strong className="is-positive">{stats.daysAboveObjective}</strong>
            </li>
            <li>
              <span>En dessous</span>
              <strong className="is-negative">{stats.daysBelowObjective}</strong>
            </li>
          </ul>
          <p className="stats-panel__foot">
            Mis à jour le{' '}
            {new Date(dashboard.generatedAt).toLocaleString('fr-FR')}
          </p>
        </aside>
      </div>

      <section className="card table-card">
        <div className="section-head">
          <div>
            <h2 className="section-head__title">Historique récent</h2>
            <p className="section-head__subtitle">5 dernières journées</p>
          </div>

          <div className="date-range">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setShowCalendar((open) => !open)}
              aria-expanded={showCalendar}
            >
              <Icon name="calendar" size={14} />
              {rangeLabel}
            </button>

            {showCalendar && (
              <div className="date-range__panel">
                <DateRange
                  ranges={[range]}
                  onChange={handleRangeChange}
                  months={1}
                  direction="horizontal"
                  weekStartsOn={1}
                  showDateDisplay={false}
                  moveRangeOnFirstSelection={false}
                  rangeColors={['#7c3aed']}
                />
                <div className="date-range__actions">
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={clearHistoryFilters}
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    className="button button--small"
                    onClick={applyHistoryFilters}
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="empty-state">Aucune journée enregistrée.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Horaires</th>
                  <th scope="col">Travaillé</th>
                  <th scope="col">Solde</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="data-table__date">
                        {formatDateFr(item.date)}
                      </span>
                    </td>
                    <td>
                      <span className="data-table__hours">
                        {item.entryTime ?? '--:--'} → {item.exitTime ?? '--:--'}
                      </span>
                      {item.breakStart && (
                        <span className="data-table__break">
                          Pause {item.breakStart}–{item.breakEnd ?? '?'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="data-table__value">
                        {formatDuration(item.workedMinutes)}
                      </span>
                    </td>
                    <td>
                      {item.status === 'COMPLETED' ? (
                        <span
                          className={`data-table__value ${
                            item.balanceMinutes > 0
                              ? 'is-positive'
                              : item.balanceMinutes < 0
                                ? 'is-negative'
                                : ''
                          }`}
                        >
                          {formatBalance(item.balanceMinutes)}
                        </span>
                      ) : (
                        <span className="data-table__status">En cours</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
