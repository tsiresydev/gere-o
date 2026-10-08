import { useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { dashboardService } from '../services/dashboard.service';
import type { Dashboard } from '../types/dashboard';
import {
  formatBalance,
  formatDateFr,
  formatDays,
  formatDuration,
} from '../utils/time';

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

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    dashboardService
      .get()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Impossible de charger le tableau de bord.',
          );
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
  }, [reloadKey]);

  const retry = (): void => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
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
          <span className="stat-card__label">Aujourd’hui</span>
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
          <span className="segment-nav__label">
            du {formatDateFr(week.weekStart)} au {formatDateFr(week.weekEnd)}
          </span>
        </div>
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
            <span className="stat-card__label">Au-dessus de l’objectif</span>
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
    </div>
  );
}