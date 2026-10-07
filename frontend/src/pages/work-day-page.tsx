import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../services/api';
import { workDaysService } from '../services/work-days.service';
import { DEFAULT_SCHEDULE } from '../types/work-day';
import type { DailySummary, WorkDay, WorkDayTimes } from '../types/work-day';
import {
  currentClock,
  formatBalance,
  formatDateFr,
  formatDuration,
  todayISO,
} from '../utils/time';

interface FormState {
  entryTime: string;
  breakStart: string;
  breakEnd: string;
  exitTime: string;
}

const EMPTY_FORM: FormState = {
  entryTime: '',
  breakStart: '',
  breakEnd: '',
  exitTime: '',
};

function cleanTimes(values: FormState): WorkDayTimes {
  const cleaned: WorkDayTimes = {};
  if (values.entryTime) cleaned.entryTime = values.entryTime;
  if (values.breakStart) cleaned.breakStart = values.breakStart;
  if (values.breakEnd) cleaned.breakEnd = values.breakEnd;
  if (values.exitTime) cleaned.exitTime = values.exitTime;
  return cleaned;
}

function buildForm(current: WorkDay | null): FormState {
  return {
    entryTime: current?.entryTime ?? '',
    breakStart: current?.breakStart ?? '',
    breakEnd: current?.breakEnd ?? '',
    exitTime: current?.exitTime ?? '',
  };
}

export function WorkDayPage() {
  const today = todayISO();

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [day, setDay] = useState<WorkDay | null>(null);
  const [history, setHistory] = useState<WorkDay[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [page, daily] = await Promise.all([
      workDaysService.list(),
      workDaysService.dailySummary(today),
    ]);

    const current = page.items.find((item) => item.date === today) ?? null;
    setHistory(page.items);
    setSummary(daily);
    setDay(current);
    setForm(buildForm(current));
  }, [today]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([workDaysService.list(), workDaysService.dailySummary(today)])
      .then(([page, daily]) => {
        if (cancelled) {
          return;
        }
        const current = page.items.find((item) => item.date === today) ?? null;
        setHistory(page.items);
        setSummary(daily);
        setDay(current);
        setForm(buildForm(current));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Impossible de charger la journée.',
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
  }, [today]);

  const persist = async (override?: Partial<FormState>): Promise<void> => {
    const values = { ...form, ...override };
    setSaving(true);
    setError(null);

    try {
      const cleaned = cleanTimes(values);
      if (day) {
        await workDaysService.update(day.id, cleaned);
      } else {
        await workDaysService.create({ date: today, ...cleaned });
      }
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Enregistrement impossible.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void persist();
  };

  const fillDefaults = (): void => {
    setForm({
      entryTime: DEFAULT_SCHEDULE.entryTime ?? '',
      breakStart: DEFAULT_SCHEDULE.breakStart ?? '',
      breakEnd: DEFAULT_SCHEDULE.breakEnd ?? '',
      exitTime: DEFAULT_SCHEDULE.exitTime ?? '',
    });
  };

  const setField = (field: keyof FormState, value: string): void => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const balanceClass =
    (summary?.balanceMinutes ?? 0) > 0
      ? 'stat-card__value--positive'
      : (summary?.balanceMinutes ?? 0) < 0
        ? 'stat-card__value--negative'
        : '';

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
        <h1 className="page__title">Ma journée</h1>
        <p className="page__subtitle">{formatDateFr(today)}</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <section className="stats-row" aria-label="Résumé du jour">
        <div className="stat-card">
          <span className="stat-card__label">Objectif</span>
          <span className="stat-card__value">
            {formatDuration(summary?.expectedMinutes ?? 480)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Réalisé</span>
          <span className="stat-card__value">
            {formatDuration(summary?.workedMinutes ?? 0)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Solde</span>
          <span className={`stat-card__value ${balanceClass}`}>
            {formatBalance(summary?.balanceMinutes ?? 0)}
          </span>
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <h2 className="card__title">
            Pointage{' '}
            {day && (
              <span
                className={`role-badge role-badge--${
                  day.status === 'COMPLETED' ? 'manager' : 'employee'
                }`}
              >
                {day.status === 'COMPLETED' ? 'Journée terminée' : 'Journée en cours'}
              </span>
            )}
          </h2>

          <div className="quick-actions">
            {!form.entryTime && (
              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => void persist({ entryTime: currentClock() })}
              >
                Pointer l’entrée ({currentClock()})
              </button>
            )}

            {form.entryTime && !form.breakStart && (
              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => void persist({ breakStart: currentClock() })}
              >
                Début de pause ({currentClock()})
              </button>
            )}

            {form.breakStart && !form.breakEnd && (
              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => void persist({ breakEnd: currentClock() })}
              >
                Fin de pause ({currentClock()})
              </button>
            )}

            {form.entryTime && !form.exitTime && (
              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => void persist({ exitTime: currentClock() })}
              >
                Pointer la sortie ({currentClock()})
              </button>
            )}

            {!form.entryTime && (
              <button
                type="button"
                className="button button--ghost"
                disabled={saving}
                onClick={fillDefaults}
              >
                Horaires par défaut
              </button>
            )}
          </div>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="entryTime">
                  Entrée
                </label>
                <input
                  id="entryTime"
                  type="time"
                  className="input"
                  value={form.entryTime}
                  onChange={(event) => setField('entryTime', event.target.value)}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="exitTime">
                  Sortie
                </label>
                <input
                  id="exitTime"
                  type="time"
                  className="input"
                  value={form.exitTime}
                  onChange={(event) => setField('exitTime', event.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="breakStart">
                  Début de pause
                </label>
                <input
                  id="breakStart"
                  type="time"
                  className="input"
                  value={form.breakStart}
                  onChange={(event) => setField('breakStart', event.target.value)}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="breakEnd">
                  Fin de pause
                </label>
                <input
                  id="breakEnd"
                  type="time"
                  className="input"
                  value={form.breakEnd}
                  onChange={(event) => setField('breakEnd', event.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="button button--block" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer la journée'}
            </button>
          </form>
        </section>

        <section className="card card--wide">
          <h2 className="card__title">Historique</h2>

          {history.length === 0 ? (
            <p className="empty-state">
              Aucune journée enregistrée. Commencez par pointer votre entrée.
            </p>
          ) : (
            <ul className="history-list">
              {history.slice(0, 7).map((item) => (
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
    </div>
  );
}
