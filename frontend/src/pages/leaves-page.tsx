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
  UpdateLeaveInput,
} from '../types/leave';
import {
  LEAVE_DURATION_LABELS,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  START_DURATION_OPTIONS,
  END_DURATION_OPTIONS,
} from '../types/leave';
import type { LeaveDurationType, LeaveType } from '../types/leave';
import { formatDateFr, formatDays, todayISO } from '../utils/time';

interface LeaveForm {
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  startDurationType: LeaveDurationType;
  endDurationType: LeaveDurationType;
}

const EMPTY_FORM: LeaveForm = {
  leaveType: 'PAID',
  reason: '',
  startDate: '',
  endDate: '',
  startDurationType: 'FULL_DAY',
  endDurationType: 'FULL_DAY',
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
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [initModalOpen, setInitModalOpen] = useState(false);
  const [initInitialDays, setInitInitialDays] = useState<number>(20);
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterReason, setFilterReason] = useState<string>('');

  const refresh = useCallback(async () => {
    const [balanceData, list] = await Promise.all([
      leavesService.balance(),
      leavesService.list(),
    ]);
    setBalance(balanceData);
    setRequests(list);
    setCurrentPage(1);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesStart = !filterStartDate || req.startDate >= filterStartDate;
      const matchesEnd = !filterEndDate || req.endDate <= filterEndDate;
      const matchesReason = !filterReason || req.reason.toLowerCase().includes(filterReason.toLowerCase());
      return matchesStart && matchesEnd && matchesReason;
    });
  }, [requests, filterStartDate, filterEndDate, filterReason]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredRequests.slice(start, end);
  }, [filteredRequests, currentPage]);

  const totalPages = useMemo(() => Math.ceil(filteredRequests.length / ITEMS_PER_PAGE), [filteredRequests.length]);

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

  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  };

  const computeDurationDays = (form: LeaveForm): number => {
    if (!form.startDate || !form.endDate) return 0;
    if (form.endDate < form.startDate) return 0;

    if (form.startDate === form.endDate) {
      // Une seule date : demi-journée si l'un des deux est HALF_*
      if (
        form.startDurationType === 'HALF_DAY_MORNING' ||
        form.startDurationType === 'HALF_DAY_AFTERNOON' ||
        form.endDurationType === 'HALF_DAY_MORNING' ||
        form.endDurationType === 'HALF_DAY_AFTERNOON'
      ) {
        return 0.5;
      }
      return 1;
    }

    let total = 0;

    // Jour de début
    if (!isWeekend(form.startDate)) {
      if (
        form.startDurationType === 'HALF_DAY_MORNING' ||
        form.startDurationType === 'HALF_DAY_AFTERNOON'
      ) {
        total += 0.5;
      } else {
        total += 1;
      }
    }

    // Jour de fin
    if (!isWeekend(form.endDate)) {
      if (
        form.endDurationType === 'HALF_DAY_MORNING' ||
        form.endDurationType === 'HALF_DAY_AFTERNOON'
      ) {
        total += 0.5;
      } else {
        total += 1;
      }
    }

    // Jours intermédiaires (exclusifs)
    const startDate = new Date(`${form.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${form.endDate}T00:00:00.000Z`);
    const current = new Date(startDate);
    current.setUTCDate(current.getUTCDate() + 1);
    const last = new Date(endDate);
    last.setUTCDate(last.getUTCDate() - 1);

    while (current <= last) {
      const day = current.getUTCDay();
      if (day !== 0 && day !== 6) total++;
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return total;
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (request: LeaveRequest): void => {
    setEditingId(request.id);
    setForm({
      leaveType: request.leaveType,
      reason: request.reason,
      startDate: request.startDate,
      endDate: request.endDate,
      startDurationType: request.startDurationType ?? request.durationType ?? 'FULL_DAY',
      endDurationType: request.endDurationType ?? 'FULL_DAY',
    });
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const input: CreateLeaveInput = { ...form };
    setSaving(true);
    setError(null);

    const promise = editingId
      ? leavesService.update(editingId, input as UpdateLeaveInput)
      : leavesService.create(input);

    promise
      .then(() => {
        refresh();
        handleCancelEdit();
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : editingId ? 'Impossible de modifier la demande.' : 'Impossible d\'enregistrer la demande.',
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

  const handleValidate = (id: string): void => {
    setValidatingId(id);
    setError(null);

    leavesService
      .validate(id)
      .then(() => refresh())
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : 'Impossible de valider la demande.',
        );
      })
      .finally(() => {
        setValidatingId(null);
      });
  };

  const handleFilterStartChange = (date: string) => {
    setFilterStartDate(date);
    setCurrentPage(1);
  };

  const handleFilterEndChange = (date: string) => {
    setFilterEndDate(date);
    setCurrentPage(1);
  };

  const handleFilterReasonChange = (value: string) => {
    setFilterReason(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterReason('');
    setCurrentPage(1);
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

  const submitButtonText = editingId ? 'Enregistrer les modifications' : 'Enregistrer la demande';

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
          <h2 className="card__title">{editingId ? 'Modifier la demande' : 'Nouvelle demande'}</h2>

          {editingId && (
            <div className="edit-banner">
              <span>Mode modification — </span>
              <button type="button" className="button button--ghost button--small" onClick={handleCancelEdit}>
                Annuler la modification
              </button>
            </div>
          )}

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
            </div>

            {/* Début du congé - deuxième ligne */}
            <div className="field-row">
              <div className="field">
                <label className="field__label" htmlFor="startDurationType">
                  Début du congé <span className="required" aria-hidden="true">*</span>
                </label>
                <select
                  id="startDurationType"
                  className="input"
                  value={form.startDurationType}
                  onChange={(event) =>
                    setField('startDurationType', event.target.value as LeaveDurationType)
                  }
                  required
                >
                  {START_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="endDurationType">
                  Fin du congé <span className="required" aria-hidden="true">*</span>
                </label>
                <select
                  id="endDurationType"
                  className="input"
                  value={form.endDurationType}
                  onChange={(event) =>
                    setField('endDurationType', event.target.value as LeaveDurationType)
                  }
                  required
                >
                  {END_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                  onChange={(event) => {
                    const newStartDate = event.target.value;
                    setField('startDate', newStartDate);
                    // Si la fin est antérieure à la nouvelle début, la mettre à jour
                    if (form.endDate && form.endDate < newStartDate) {
                      setField('endDate', newStartDate);
                    }
                  }}
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
                    {formatDays(computeDurationDays(form))}
                  </span>
                </div>
                {balance && (
                  <div className="leave-preview__row leave-preview__row--balance">
                    <span className="leave-preview__label">Solde après demande</span>
                    <span className="leave-preview__value leave-preview__value--balance">
                      {formatDays(balance.availableDays - computeDurationDays(form))}
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

            <button type="submit" className="button button--block button--primary" disabled={saving || !form.startDate || !form.endDate || !form.reason || !form.leaveType || !form.startDurationType || !form.endDurationType}>
              {saving ? 'Enregistrement…' : submitButtonText}
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

          {/* Filtres */}
          <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div className="field" style={{ flex: '1', minWidth: '150px' }}>
              <label className="field__label">Date de début</label>
              <input
                type="date"
                className="input"
                value={filterStartDate}
                onChange={(e) => handleFilterStartChange(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: '1', minWidth: '150px' }}>
              <label className="field__label">Date de fin</label>
              <input
                type="date"
                className="input"
                value={filterEndDate}
                onChange={(e) => handleFilterEndChange(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: '1', minWidth: '200px' }}>
              <label className="field__label">Motif</label>
              <input
                type="text"
                className="input"
                placeholder="Rechercher par motif..."
                value={filterReason}
                onChange={(e) => handleFilterReasonChange(e.target.value)}
              />
            </div>
            {(filterStartDate || filterEndDate || filterReason) && (
              <button type="button" className="button button--ghost" onClick={handleClearFilters} style={{ height: 'fit-content' }}>
                Effacer les filtres
              </button>
            )}
          </div>

          {filteredRequests.length === 0 ? (
            <p className="empty-state">Aucune demande pour le moment.</p>
          ) : (
            <>
              <ul className="history-list">
                {paginatedRequests.map((request: LeaveRequest) => (
                  <li key={request.id} className={`history-item ${request.status === 'CANCELLED' ? 'history-item--cancelled' : ''} ${request.validated ? 'history-item--validated' : ''}`}>
                    <span className="history-item__date">
                      {formatDateFr(request.startDate)} → {formatDateFr(request.endDate)}
                    </span>
                    <span className="history-item__reason">
                      {request.reason}
                    </span>
                    <span className="history-item__meta">
                      {LEAVE_TYPE_LABELS[request.leaveType]} ·{' '}
                      {request.startDurationType ? LEAVE_DURATION_LABELS[request.startDurationType] : LEAVE_DURATION_LABELS[request.durationType]} →{' '}
                      {request.endDurationType ? LEAVE_DURATION_LABELS[request.endDurationType] : LEAVE_DURATION_LABELS[request.durationType]}
                    </span>
                    <span className="history-item__duration">
                      {formatDays(request.durationDays)}
                    </span>
                    {request.validated && (
                      <span className="leave-badge leave-badge--validated">
                        Validée
                      </span>
                    )}
                    {request.status === 'CANCELLED' && !request.validated && (
                      <span className="leave-badge leave-badge--cancelled">
                        {LEAVE_STATUS_LABELS.CANCELLED}
                      </span>
                    )}
                    {!request.validated && request.status !== 'CANCELLED' && (
                      <>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => handleEdit(request)}
                          disabled={editingId !== null && editingId !== request.id}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          disabled={cancellingId === request.id || validatingId === request.id}
                          onClick={() => handleCancel(request.id)}
                        >
                          {cancellingId === request.id ? 'Annulation…' : 'Annuler'}
                        </button>
                        <button
                          type="button"
                          className="button button--primary button--small"
                          disabled={validatingId === request.id}
                          onClick={() => handleValidate(request.id)}
                        >
                          {validatingId === request.id ? 'Validation…' : 'Valider'}
                        </button>
                      </>
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