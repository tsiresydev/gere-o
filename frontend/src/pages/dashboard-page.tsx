import { useEffect, useState } from 'react';
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
}

function balanceClass(value: number): string {
  if (value > 0) {
    return 'stat-card__value--positive';
  }
  if (value < 0) {
    return 'stat-card__value--negative';
  }
  return '';
}

function BarChart({ points }: { points: ChartPoint[] }) {
  const scale = Math.max(
    1,
    ...points.map((point) => Math.max(point.value, point.objective)),
  );

  return (
    <div className="bar-chart">
      {points.map((point) => (
        <div className="bar-chart__column" key={point.key} title={point.title}>
          <div className="bar-chart__track">
            <div
              className={`bar-chart__bar ${point.isWeekend ? 'bar-chart__bar--weekend' : ''}`}
              style={{ height: `${Math.round((point.value / scale) * 100)}%` }}
            />
            <span
              className="bar-chart__objective"
              style={{ bottom: `${Math.round((point.objective / scale) * 100)}%` }}
            />
          </div>
          <span className={`bar-chart__label ${point.isWeekend ? 'bar-chart__label--weekend' : ''}`}>{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function WeekSummarySkeleton() {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <span className="stat-card__label">Réalisé</span>
        <div className="skeleton skeleton--text" style={{ width: '80px' }} />
      </div>
      <div className="stat-card">
        <span className="stat-card__label">Objectif</span>
        <div className="skeleton skeleton--text" style={{ width: '80px' }} />
      </div>
      <div className="stat-card">
        <span className="stat-card__label">Solde</span>
        <div className="skeleton skeleton--text" style={{ width: '80px' }} />
      </div>
      <div className="stat-card">
        <span className="stat-card__label">Jours pointés</span>
        <div className="skeleton skeleton--text" style={{ width: '60px' }} />
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
      <div className="page-loading" role="status">
        Chargement…
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

  // Filter to business days only (Mon-Fri) for the chart
  const businessDayPoints: ChartPoint[] = trends.daily
    .filter((point) => !point.isWeekend)
    .map((point) => ({
      key: point.date,
      label: point.date.slice(8),
      title: `${formatDateFr(point.date)} : ${formatDuration(point.workedMinutes)}`,
      value: point.workedMinutes,
      objective: dailyObjective,
      isWeekend: false,
    }));

  const weeklyPoints: ChartPoint[] = trends.weekly.map((point) => ({
    key: point.weekStart,
    label: `${point.weekStart.slice(8)}/${point.weekStart.slice(5, 7)}`,
    title: `Semaine du ${formatDateFr(point.weekStart)} : ${formatDuration(point.workedMinutes)}`,
    value: point.workedMinutes,
    objective: point.expectedMinutes,
  }));

  const hasDailyData = trends.daily.some((point) => point.workedMinutes > 0);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Tableau de bord</h1>
        <p className="page__subtitle">Vue synthétique du temps et des congés</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-card__label">Aujourd'hui</span>
          <span className="stat-card__value">
            {formatDuration(today.workedMinutes)}
          </span>
          <span className="card__note">
            {today.recorded
              ? `Objectif ${formatDuration(today.expectedMinutes)} · Solde ${formatBalance(today.balanceMinutes)}`
              : 'Journée non pointée'}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Semaine</span>
          <span className="stat-card__value">
            {formatDuration(week.workedMinutes)}
          </span>
          <span className="card__note">
            Objectif {formatDuration(week.expectedMinutes)} ·{' '}
            <span className={balanceClass(week.balanceMinutes)}>
              {formatBalance(week.balanceMinutes)}
            </span>
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Solde de congés</span>
          <span className="stat-card__value">{formatDays(leaves.availableDays)}</span>
          <span className="card__note">
            {formatDays(leaves.consumedDays)} consommés ·{' '}
            {formatDays(leaves.accruedDays)} acquis
          </span>
        </div>
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">Heures de la semaine</h2>
          <span className="segment-nav__label">
            Objectif {formatDuration(dailyObjective)} par jour
          </span>
        </div>
        {hasDailyData ? (
          <BarChart points={businessDayPoints} />
        ) : (
          <p className="empty-state">
            Aucune journée enregistrée cette semaine.
          </p>
        )}
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">Résumé de la semaine</h2>
          <div className="week-nav">
            <span className="segment-nav__label">
              du {formatDateFr(week.weekStart)} au {formatDateFr(week.weekEnd)}
            </span>
            <div className="week-nav__actions">
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => navigateWeek('prev')}
                aria-label="Semaine précédente"
                disabled={weekLoading}
              >
                ‹ Précédente
              </button>
              {!isCurrentWeek && (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={goToCurrentWeek}
                  aria-label="Semaine actuelle"
                  disabled={weekLoading}
                >
                  Semaine actuelle
                </button>
              )}
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => navigateWeek('next')}
                aria-label="Semaine suivante"
                disabled={weekLoading}
              >
                Suivante ›
              </button>
            </div>
          </div>
        </div>
        {weekLoading ? (
          <WeekSummarySkeleton />
        ) : (
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card__label">Réalisé</span>
              <span className="stat-card__value">
                {formatDuration(week.workedMinutes)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Objectif</span>
              <span className="stat-card__value">
                {formatDuration(week.expectedMinutes)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Solde</span>
              <span
                className={`stat-card__value ${balanceClass(week.balanceMinutes)}`}
              >
                {formatBalance(week.balanceMinutes)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Jours pointés</span>
              <span className="stat-card__value">{week.recordedDays}</span>
            </div>
          </div>
        )}
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">Tendance hebdomadaire</h2>
          <span className="segment-nav__label">8 dernières semaines</span>
        </div>
        <BarChart points={weeklyPoints} />
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">
            Statistiques — {stats.windowDays} derniers jours
          </h2>
          <span className="segment-nav__label">
            Mis à jour le {new Date(dashboard.generatedAt).toLocaleString('fr-FR')}
          </span>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-card__label">Jours pointés</span>
            <span className="stat-card__value">{stats.recordedDays}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Total travaillé</span>
            <span className="stat-card__value">
              {formatDuration(stats.totalWorkedMinutes)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Moyenne / jour</span>
            <span className="stat-card__value">
              {formatDuration(stats.averageMinutesPerDay)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Au-dessus de l'objectif</span>
            <span className="stat-card__value stat-card__value--positive">
              {stats.daysAboveObjective}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">En dessous</span>
            <span className="stat-card__value stat-card__value--negative">
              {stats.daysBelowObjective}
            </span>
          </div>
        </div>
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">Historique (5 journées)</h2>

          <div className="date-range">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setShowCalendar((open) => !open)}
              aria-expanded={showCalendar}
            >
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
                  rangeColors={['#2563eb']}
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
          <ul className="history-list">
            {history.map((item) => (
              <li key={item.id} className="history-item">
                <span className="history-item__date">{formatDateFr(item.date)}</span>
                <span className="history-item__hours">
                  {item.entryTime ?? '--:--'} → {item.exitTime ?? '--:--'}
                  {item.breakStart && (
                    <span className="history-item__break">
                      {' '}
                      pause {item.breakStart}–{item.breakEnd ?? '?'}
                    </span>
                  )}
                </span>
                <span className="history-item__worked">
                  {formatDuration(item.workedMinutes)}
                </span>
                <span
                  className={`history-item__balance ${
                    item.balanceMinutes > 0
                      ? 'history-item__balance--positive'
                      : item.balanceMinutes < 0
                        ? 'history-item__balance--negative'
                        : ''
                  }`}
                >
                  {item.status === 'COMPLETED'
                    ? formatBalance(item.balanceMinutes)
                    : 'En cours'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}