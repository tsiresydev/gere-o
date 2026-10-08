import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { ApiError } from '../services/api';
import { leavesService } from '../services/leaves.service';
import type {
  CreateLeaveInput,
  LeaveBalance,
  LeaveRequest,
  InitializeBalanceInput,
} from '../types/leave';
import {
  LEAVE_DURATION_LABELS,
  LEAVE_DURATION_OPTIONS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from '../types/leave';
import type { LeaveDurationType, LeaveType } from '../types/leave';
import { formatDateFr, formatDays } from '../utils/time';

interface LeaveForm {
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  durationType: LeaveDurationType;
}

const EMPTY_FORM: LeaveForm = {
  leaveType: 'PAID',
  reason: '',
  startDate: '',
  endDate: '',
  durationType: 'FULL_DAY',
};

const statusClass = (status: LeaveRequest['status']): string =>
  status.toLowerCase();

export function LeavesPage() {
  useAuth();

  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [form, setForm] = useState<LeaveForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [initModalOpen, setInitModalOpen] = useState(false);
  const [initInitialDays, setInitInitialDays] = useState<number>(20);
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [balanceData, list] = await Promise.all([
      leavesService.balance(),
      leavesService.list(),
    ]);
    setBalance(balanceData);
    setRequests(list);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      leavesService.balance(),
      leavesService.list(),
    ])
      .then(([balanceData, list]) => {
        if (cancelled) {
          return;
        }
        setBalance(balanceData);
        setRequests(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Impossible de charger les congés.',
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
  }, []);

  const setField = <K extends keyof LeaveForm>(key: K, value: LeaveForm[K]): void => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const input: CreateLeaveInput = { ...form };
    setSaving(true);
    setError(null);

    leavesService
      .create(input)
      .then(() => refresh())
      .then(() => setForm(EMPTY_FORM))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : 'Impossible d\'envoyer la demande.',
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const handleCancel = (id: string): void => {
    setCancellingId(id);
    setError(null);

    leavesService
      .remove(id)
      .then(() => refresh())
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : 'Impossible d\'annuler la demande.',
        );
      })
      .finally(() => {
        setCancellingId(null);
      });
  };

  const handleOpenInitModal = (): void => {
    setInitModalOpen(true);
    setInitError(null);
    setInitInitialDays(20);
  };

  const handleCloseInitModal = (): void => {
    setInitModalOpen(false);
    setInitError(null);
  };

  const handleInitSubmit = (): void => {
    if (initInitialDays < 0) {
      setInitError('Le nombre de jours doit être positif.');
      return;
    }
    setInitSubmitting(true);
    setInitError(null);

    const input: InitializeBalanceInput = {
      initialDays: initInitialDays,
    };

    leavesService
      .initialize(input)
      .then(() => {
        handleCloseInitModal();
        refresh();
      })
      .catch((err: unknown) => {
        setInitError(err instanceof ApiError ? err.message : "Impossible d'initialiser le solde.");
      })
      .finally(() => {
        setInitSubmitting(false);
      });
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
        <h1 className="page__title">Mes congés</h1>
        <p className="page__subtitle">Solde, demande et historique</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {balance && (
        <section className="stats-row" aria-label="Solde de congés">
          <div className="stat-card">
            <span className="stat-card__label">Disponible</span>
            <span className="stat-card__value">
              {formatDays(balance.availableDays)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Consommés</span>
            <span className="stat-card__value">
              {formatDays(balance.consumedDays)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Acquis</span>
            <span className="stat-card__value">
              {formatDays(balance.accruedDays)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Initial</span>
            <span className="stat-card__value">
              {formatDays(balance.initialBalance)}
            </span>
          </div>
          <div className="stat-card">
            <button
              type="button"
              className="button button--ghost button--block"
              onClick={handleOpenInitModal}
              disabled={initSubmitting}
            >
              {initSubmitting ? 'Initialisation…' : 'Initialiser mon solde'}
            </button>
          </div>
        </section>
      )}

      {balance && balance.availableDays <= 0 && (
        <p className="card__note">
          Solde de congés à zéro : initialisez votre solde ci-dessus.
        </p>
      )}

      <div className="grid">
        <section className="card">
          <h2 className="card__title">Demander un congé</h2>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="leaveType">
                  Type de congé
                </label>
                <select
                  id="leaveType"
                  className="input"
                  value={form.leaveType}
                  onChange={(event) =>
                    setField('leaveType', event.target.value as LeaveType)
                  }
                >
                  {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => (
                    <option key={type} value={type}>
                      {LEAVE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="durationType">
                  Durée
                </label>
                <select
                  id="durationType"
                  className="input"
                  value={form.durationType}
                  onChange={(event) =>
                    setField('durationType', event.target.value as LeaveDurationType)
                  }
                >
                  {LEAVE_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="startDate">
                  Début
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={(event) => setField('startDate', event.target.value)}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="endDate">
                  Fin
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="input"
                  value={form.endDate}
                  onChange={(event) => setField('endDate', event.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="reason">
                Motif
              </label>
              <textarea
                id="reason"
                className="input"
                rows={3}
                value={form.reason}
                onChange={(event) => setField('reason', event.target.value)}
              />
            </div>

            <button type="submit" className="button button--block" disabled={saving}>
              {saving ? 'Demande en cours…' : 'Envoyer la demande'}
            </button>

            <p className="field__hint">
              Les samedis et dimanches ne sont pas comptabilisés. Votre demande est
              automatiquement approuvée et déduite de votre solde. Vous pouvez l\'annuler
              tant qu\'elle n\'a pas été prise en compte.
            </p>
          </form>
        </section>

        <section className="card card--wide">
          <h2 className="card__title">Historique des demandes</h2>

          {requests.length === 0 ? (
            <p className="empty-state">Aucune demande pour le moment.</p>
          ) : (
            <ul className="leave-list">
              {requests.map((request) => (
                <li key={request.id} className="leave-item">
                  <span className="leave-item__dates">
                    {formatDateFr(request.startDate)} → {formatDateFr(request.endDate)}
                  </span>
                  <span className="leave-item__reason">
                    {request.reason}
                    <span className="leave-item__meta">
                      {LEAVE_TYPE_LABELS[request.leaveType]} ·{' '}
                      {LEAVE_DURATION_LABELS[request.durationType]}
                    </span>
                  </span>
                  <span className="leave-item__days">
                    {formatDays(request.durationDays)}
                  </span>
                  <span
                    className={`leave-badge leave-badge--${statusClass(request.status)}`}
                  >
                    {LEAVE_STATUS_LABELS[request.status]}
                  </span>
                  {(request.status === 'APPROVED' || request.status === 'PENDING') && (
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      disabled={cancellingId === request.id}
                      onClick={() => handleCancel(request.id)}
                    >
                      {cancellingId === request.id ? 'Annulation…' : 'Annuler'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {initModalOpen && (
        <div className="modal-overlay" onClick={handleCloseInitModal} role="dialog" aria-modal="true" aria-labelledby="init-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 id="init-modal-title" className="modal__title">Initialiser mon solde de congés</h2>
              <button type="button" className="modal__close" onClick={handleCloseInitModal} aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="modal__body">
              {initError && (
                <div className="alert alert--error" role="alert">
                  {initError}
                </div>
              )}
              <div className="field">
                <label className="field__label" htmlFor="initDays">Jours initiaux</label>
                <input
                  id="initDays"
                  type="number"
                  className="input"
                  min="0"
                  step="0.5"
                  value={initInitialDays}
                  onChange={(e) => setInitInitialDays(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button type="button" className="button button--ghost" onClick={handleCloseInitModal} disabled={initSubmitting}>
                Annuler
              </button>
              <button type="button" className="button" onClick={handleInitSubmit} disabled={initSubmitting}>
                {initSubmitting ? 'Initialisation…' : 'Initialiser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}