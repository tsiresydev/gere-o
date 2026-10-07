import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../services/api';
import { workDaysService } from '../services/work-days.service';
import type {
  MonthlySummary,
  WeeklySummary,
  WorkDayPage,
} from '../types/work-day';
import {
  addDays,
  addMonths,
  formatBalance,
  formatDateFr,
  formatDuration,
  mondayOfWeek,
  monthLabel,
  todayISO,
} from '../utils/time';

interface MonthKey {
  year: number;
  month: number;
}

interface HistoryFilters {
  startDate?: string;
  endDate?: string;
}

const TODAY = todayISO();

function balanceClass(value: number): string {
  if (value > 0) {
    return 'stat-card__value--positive';
  }
  if (value < 0) {
    return 'stat-card__value--negative';
  }
  return '';
}

export function OverviewPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthKey, setMonthKey] = useState<MonthKey>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [history, setHistory] = useState<WorkDayPage | null>(null);

  const [filters, setFilters] = useState<HistoryFilters>({});
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekStart = mondayOfWeek(addDays(TODAY, weekOffset * 7));
  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    let cancelled = false;

    workDaysService
      .weeklySummary(weekStart)
      .then((summary) => {
        if (!cancelled) {
          setWeekly(summary);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Impossible de charger la semaine.');
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
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;

    workDaysService
      .monthlySummary(monthKey.year, monthKey.month)
      .then((summary) => {
        if (!cancelled) {
          setMonthly(summary);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Impossible de charger le mois.');
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
  }, [monthKey.year, monthKey.month]);

  useEffect(() => {
    let cancelled = false;

    workDaysService
      .list({ ...filters, limit: 50 })
      .then((page) => {
        if (!cancelled) {
          setHistory(page);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Impossible de charger l’historique.');
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
  }, [filters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFilters({
      startDate: draftFrom || undefined,
      endDate: draftTo || undefined,
    });
  };

  const clearFilters = (): void => {
    setDraftFrom('');
    setDraftTo('');
    setFilters({});
  };

  if (loading) {
    return (
      <div className="page-loading" role="status">
        Chargement…
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Suivi du temps</h1>
        <p className="page__subtitle">Synthèses hebdomadaire et mensuelle</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">Semaine</h2>
          <div className="segment-nav">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setWeekOffset((offset) => offset - 1)}
            >
              ‹ Précédente
            </button>
            <span className="segment-nav__label">
              du {formatDateFr(weekStart)} au {formatDateFr(weekEnd)}
            </span>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setWeekOffset((offset) => offset + 1)}
            >
              Suivante ›
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-card__label">Objectif hebdo</span>
            <span className="stat-card__value">
              {formatDuration(weekly?.expectedMinutes ?? 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Réalisé</span>
            <span className="stat-card__value">
              {formatDuration(weekly?.workedMinutes ?? 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Solde</span>
            <span className={`stat-card__value ${balanceClass(weekly?.balanceMinutes ?? 0)}`}>
              {formatBalance(weekly?.balanceMinutes ?? 0)}
            </span>
          </div>
        </div>
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">Mois</h2>
          <div className="segment-nav">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() =>
                setMonthKey((key) => addMonths(key.year, key.month, -1))
              }
            >
              ‹ Précédent
            </button>
            <span className="segment-nav__label">
              {monthLabel(monthKey.year, monthKey.month)}
            </span>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setMonthKey((key) => addMonths(key.year, key.month, 1))}
            >
              Suivant ›
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-card__label">Objectif mensuel</span>
            <span className="stat-card__value">
              {formatDuration(monthly?.expectedMinutes ?? 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Réalisé</span>
            <span className="stat-card__value">
              {formatDuration(monthly?.workedMinutes ?? 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Solde</span>
            <span className={`stat-card__value ${balanceClass(monthly?.balanceMinutes ?? 0)}`}>
              {formatBalance(monthly?.balanceMinutes ?? 0)}
            </span>
          </div>
        </div>
      </section>

      <section className="card card--wide">
        <div className="section-head">
          <h2 className="section-head__title">
            Historique {history ? `(${history.total} journées)` : ''}
          </h2>

          <form className="filter-bar" onSubmit={applyFilters} noValidate>
            <div className="filter-bar__field">
              <label className="filter-bar__label" htmlFor="historyFrom">
                Du
              </label>
              <input
                id="historyFrom"
                type="date"
                className="input"
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
              />
            </div>
            <div className="filter-bar__field">
              <label className="filter-bar__label" htmlFor="historyTo">
                Au
              </label>
              <input
                id="historyTo"
                type="date"
                className="input"
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
              />
            </div>
            <button type="submit" className="button button--small">
              Appliquer
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={clearFilters}
            >
              Effacer
            </button>
          </form>
        </div>

        {history && history.items.length === 0 ? (
          <p className="empty-state">Aucune journée trouvée sur la période.</p>
        ) : (
          <ul className="history-list">
            {(history?.items ?? []).map((item) => (
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