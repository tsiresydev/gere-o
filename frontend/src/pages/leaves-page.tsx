import { useCallback, useEffect, useState, useMemo } from 'react';
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
  LEAVE_TYPE_LABELS,
} from '../types/leave';
import type { LeaveDurationType, LeaveType } from '../types/leave';
import { formatDateFr, formatDays, todayISO } from '../utils/time';

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

const ITEMS_PER_PAGE = 10;

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const refresh = useCallback(async () => {
    const [balanceData, list] = await Promise.all([
      leavesService.balance(),
      leavesService.list(),
    ]);
    setBalance(balanceData);
    setRequests(list);
    setCurrentPage(1);
  }, []);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return requests.slice(start, end);
  }, [requests, currentPage]);

  const totalPages = useMemo(() => Math.ceil(requests.length / ITEMS_PER_PAGE), [requests.length]);

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

      {/* Solde de congés - Section principale */}
      {balance && (
        <section className="card balance-card" aria-label="Solde de congés">
          <div className="balance-card__header">
            <h2 className="balance-card__title">Mon solde</h2>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={handleOpenInitModal}
              disabled={initSubmitting}
            >
              {initSubmitting ? 'Initialisation…' : 'Initialiser / Modifier'}
            </button>
          </div>

          <div className="balance-card__main">
            <div className="balance-card__available">
              <span className="balance-card__available-label">Jours disponibles</span>
              <span className="balance-card__available-value">
                {formatDays(balance.availableDays)}
              </span>
            </div>

            <div className="balance-card__details">
              <div className="balance-detail">
                <span className="balance-detail__label">Consommés</span>
                <span className="balance-detail__value">{formatDays(balance.consumedDays)}</span>
              </div>
              <div className="balance-detail">
                <span className="balance-detail__label">Acquis</span>
                <span className="balance-detail__value">{formatDays(balance.accruedDays)}</span>
              </div>
              <div className="balance-detail">
                <span className="balance-detail__label">Initial</span>
                <span className="balance-detail__value">{formatDays(balance.initialBalance)}</span>
              </div>
            </div>
          </div>

          {balance.availableDays <= 0 && (
            <div className="balance-card__alert">
              <span className="balance-card__alert-icon">⚠</span>
              <span>Solde à zéro — cliquez sur "Initialiser / Modifier" pour définir votre solde</span>
            </div>
          )}
        </section>
      )}

      <div className="grid">
        {/* Formulaire de demande */}
        <section className="card card--form">
          <h2 className="card__title">Nouvelle demande</h2>

          <form className="form" onSubmit={handleSubmit} noValidate>
            {/* Type et durée - première ligne */}
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="leaveType">
                  Type de congé <span className="required" aria-hidden="true">*</span>
                </label>
                <select
                  id="leaveType"
                  className="input"
                  value={form.leaveType}
                  onChange={(event) =>
                    setField('leaveType', event.target.value as LeaveType)
                  }
                  required
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
                  Durée <span className="required" aria-hidden="true">*</span>
                </label>
                <select
                  id="durationType"
                  className="input"
                  value={form.durationType}
                  onChange={(event) =>
                    setField('durationType', event.target.value as LeaveDurationType)
                  }
                  required
                >
                  {LEAVE_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick actions pour demi-journée */}
            {form.durationType !== 'FULL_DAY' && (
              <div className="quick-note">
                <span className="quick-note__icon">ℹ</span>
                <span>Pour une demi-journée, les dates de début et fin doivent être identiques.</span>
              </div>
            )}

            {/* Dates */}
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="startDate">
                  Début <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={(event) => setField('startDate', event.target.value)}
                  required
                  min={todayISO()}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="endDate">
                  Fin <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="input"
                  value={form.endDate}
                  onChange={(event) => setField('endDate', event.target.value)}
                  required
                  min={form.startDate || todayISO()}
                />
              </div>
            </div>

            {/* Aperçu durée + solde restant */}
            {(form.startDate && form.endDate) && (
              <div className="leave-preview">
                <div className="leave-preview__row">
                  <span className="leave-preview__label">Durée</span>
                  <span className="leave-preview__value leave-preview__value--duration">
                    {(() => {
                      const start = new Date(`${form.startDate}T00:00:00.000Z`);
                      const end = new Date(`${form.endDate}T00:00:00.000Z`);
                      if (end < start) return '—';
                      const durationType = form.durationType;
                      if (durationType === 'HALF_DAY_MORNING' || durationType === 'HALF_DAY_AFTERNOON') {
                        return '0,5 jour';
                      }
                      let count = 0;
                      const current = new Date(start);
                      while (current <= end) {
                        const day = current.getUTCDay();
                        if (day !== 0 && day !== 6) count++;
                        current.setUTCDate(current.getUTCDate() + 1);
                      }
                      return count === 1 ? '1 jour' : `${count} jours`;
                    })()}
                  </span>
                </div>
                {balance && (
                  <div className="leave-preview__row leave-preview__row--balance">
                    <span className="leave-preview__label">Solde après demande</span>
                    <span className="leave-preview__value leave-preview__value--balance">
                      {(() => {
                        const durationDays = (() => {
                          const start = new Date(`${form.startDate}T00:00:00.000Z`);
                          const end = new Date(`${form.endDate}T00:00:00.000Z`);
                          if (end < start) return 0;
                          const durationType = form.durationType;
                          if (durationType === 'HALF_DAY_MORNING' || durationType === 'HALF_DAY_AFTERNOON') {
                            return 0.5;
                          }
                          let count = 0;
                          const current = new Date(start);
                          while (current <= end) {
                            const day = current.getUTCDay();
                            if (day !== 0 && day !== 6) count++;
                            current.setUTCDate(current.getUTCDate() + 1);
                          }
                          return count;
                        })();
                        const remaining = balance.availableDays - durationDays;
                        return formatDays(remaining);
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Motif */}
            <div className="field">
              <label className="field__label" htmlFor="reason">
                Motif <span className="required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="reason"
                className="input"
                rows={3}
                value={form.reason}
                onChange={(event) => setField('reason', event.target.value)}
                required
                placeholder="Ex: Vacances d'été, rendez-vous médical, événement familial..."
              />
            </div>

            <button type="submit" className="button button--block button--primary" disabled={saving || !form.startDate || !form.endDate || !form.reason || !form.leaveType || !form.durationType}>
              {saving ? 'Envoi en cours…' : 'Envoyer la demande'}
            </button>

            <p className="field__hint">
              Les samedis et dimanches ne sont pas comptabilisés. La demande est
              automatiquement approuvée et déduite de votre solde.
            </p>
          </form>
        </section>

        {/* Historique */}
        <section className="card card--history">
          <h2 className="card__title">Historique des demandes</h2>

          {requests.length === 0 ? (
            <p className="empty-state">Aucune demande pour le moment.</p>
          ) : (
            <>
              <ul className="history-list">
                {paginatedRequests.map((request: LeaveRequest) => (
                  <li key={request.id} className="history-item">
                    <span className="history-item__date">
                      {formatDateFr(request.startDate)} → {formatDateFr(request.endDate)}
                    </span>
                    <span className="history-item__reason">
                      {request.reason}
                    </span>
                    <span className="history-item__meta">
                      {LEAVE_TYPE_LABELS[request.leaveType]} ·{' '}
                      {LEAVE_DURATION_LABELS[request.durationType]}
                    </span>
                    <span className="history-item__duration">
                      {formatDays(request.durationDays)}
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

              {totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination de l'historique">
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Page précédente"
                  >
                    ‹ Précédente
                  </button>
                  <span className="pagination__info">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Page suivante"
                  >
                    Suivante ›
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {/* Modal d'initialisation du solde */}
      {initModalOpen && (
        <div className="modal-overlay" onClick={handleCloseInitModal} role="dialog" aria-modal="true" aria-labelledby="init-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 id="init-modal-title" className="modal__title">Initialiser / Modifier mon solde</h2>
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
              <p className="modal__hint">
                Cela définit votre solde initial de congés. La valeur actuelle sera remplacée.
              </p>
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
              {balance && (
                <p className="modal__current">
                  Solde initial actuel : <strong>{formatDays(balance.initialBalance)}</strong> jours
                </p>
              )}
            </div>
            <div className="modal__footer">
              <button type="button" className="button button--ghost" onClick={handleCloseInitModal} disabled={initSubmitting}>
                Annuler
              </button>
              <button type="button" className="button button--primary" onClick={handleInitSubmit} disabled={initSubmitting}>
                {initSubmitting ? 'Initialisation…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}