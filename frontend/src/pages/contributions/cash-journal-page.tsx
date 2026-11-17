import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import { useFinanceAccess } from '../../hooks/use-finance-access';
import { EmptyFinance, FinancePagination, formatAr } from '../../components/finance-ui';
import { Toast, useToast } from '../../components/toast';
import type { CashTransaction, JournalFilters, NotificationLog } from '../../types/contribution';

const TYPE_LABELS: Record<string, string> = {
  CONTRIBUTION_VALIDEE: 'Cotisation validée',
  DEPENSE: 'Dépense',
  CORRECTION: 'Correction comptable',
};

export function CashJournalPage() {
  const { isValidator } = useFinanceAccess();
  const { notice, notify, clear } = useToast();
  const [entries, setEntries] = useState<CashTransaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [filters, setFilters] = useState<JournalFilters>({ page: 1, limit: 10 });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CashTransaction | null>(null);
  const [correction, setCorrection] = useState<{
    entry: CashTransaction;
    amount: number;
    direction: 'IN' | 'OUT';
    reason: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [journal, logs] = await Promise.all([
        contributionsService.journal(filters),
        isValidator ? contributionsService.notifications(1) : Promise.resolve(null),
      ]);
      setEntries(journal.items);
      setTotalPages(journal.totalPages);
      setNotifications(logs?.items ?? []);
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Impossible de charger le journal.' });
    } finally {
      setLoading(false);
    }
  }, [filters, isValidator, notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submitCorrection = async (): Promise<void> => {
    if (!correction) return;
    setBusy(true);
    try {
      await contributionsService.correct({
        transactionId: correction.entry.id,
        amount: correction.amount,
        direction: correction.direction,
        reason: correction.reason,
      });
      notify({ type: 'success', text: 'Correction comptable enregistrée et tracée.' });
      setCorrection(null);
      await load();
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Correction impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const retry = async (id: string): Promise<void> => {
    try {
      const result = await contributionsService.retryNotification(id);
      notify({
        type: result.sent ? 'success' : 'error',
        text: result.sent ? 'Email envoyé.' : (result.skipped ?? 'Envoi impossible.'),
      });
      await load();
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Nouvelle tentative impossible.' });
    }
  };

  return (
    <div className="page finance-page">
      <Toast notice={notice} onClose={clear} />
      <header className="page-header">
        <div>
          <span className="page__eyebrow">Caisse commune</span>
          <h1>Historique de la caisse</h1>
          <p className="page-header__subtitle">Journal centralisé, traçable et non supprimable.</p>
        </div>
      </header>

      <form
        className="card finance-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((previous) => ({ ...previous, page: 1 }));
        }}
      >
        <label className="field">
          <span className="field__label">Type</span>
          <select className="input" value={filters.type ?? ''} onChange={(event) => setFilters((previous) => ({ ...previous, type: event.target.value || undefined, page: 1 }))}>
            <option value="">Tous</option>
            <option value="CONTRIBUTION_VALIDEE">Cotisation validée</option>
            <option value="DEPENSE">Dépense</option>
            <option value="CORRECTION">Correction</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Du</span>
          <input className="input" type="date" value={filters.startDate ?? ''} onChange={(event) => setFilters((previous) => ({ ...previous, startDate: event.target.value || undefined, page: 1 }))} />
        </label>
        <label className="field">
          <span className="field__label">Au</span>
          <input className="input" type="date" value={filters.endDate ?? ''} onChange={(event) => setFilters((previous) => ({ ...previous, endDate: event.target.value || undefined, page: 1 }))} />
        </label>
        <label className="field">
          <span className="field__label">Recherche</span>
          <input className="input" value={filters.search ?? ''} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value, page: 1 }))} placeholder="Motif ou auteur" />
        </label>
        <button type="submit" className="button button--ghost">Filtrer</button>
      </form>

      <section className="card table-card">
        <div className="section-head"><div><h2 className="section-head__title">Journal financier</h2><p className="section-head__subtitle">Solde recalculé après chaque opération</p></div></div>
        {loading ? <p className="finance-empty-inline">Chargement…</p> : entries.length === 0 ? (
          <EmptyFinance title="Aucune opération" hint="Les mouvements de la caisse apparaîtront ici." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table finance-table">
                <thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Auteur</th><th>Entrée</th><th>Sortie</th><th>Solde</th><th>Détails</th></tr></thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="data-table__date">{entry.createdAt ? entry.createdAt.slice(0, 10) : '—'}</td>
                      <td><span className="pill">{TYPE_LABELS[entry.type] ?? entry.type}</span></td>
                      <td>{entry.description}</td>
                      <td>{entry.createdByName}</td>
                      <td className="data-table__value is-positive">{entry.direction === 'IN' ? formatAr(entry.amount) : '—'}</td>
                      <td className="data-table__value is-negative">{entry.direction === 'OUT' ? `− ${formatAr(entry.amount)}` : '—'}</td>
                      <td className="data-table__value">{entry.balanceAfter !== undefined ? formatAr(entry.balanceAfter) : '—'}</td>
                      <td><button type="button" className="button button--ghost button--small" onClick={() => setDetail(entry)}>Voir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FinancePagination page={filters.page ?? 1} totalPages={totalPages} onChange={(page) => setFilters((previous) => ({ ...previous, page }))} />
          </>
        )}
      </section>

      {isValidator && notifications.length > 0 && (
        <section className="card table-card">
          <div className="section-head"><div><h2 className="section-head__title">Journal des notifications</h2><p className="section-head__subtitle">Nouvelle tentative sans doublon</p></div></div>
          <div className="table-wrap">
            <table className="data-table finance-table">
              <thead><tr><th>Date</th><th>Événement</th><th>Objet</th><th>Tentatives</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>
                {notifications.map((log) => (
                  <tr key={log.id}>
                    <td>{log.createdAt?.slice(0, 10)}</td>
                    <td>{log.eventType === 'CONTRIBUTION_DECLAREE' ? 'Déclaration' : 'Dépense'}</td>
                    <td>{log.subject}</td>
                    <td>{log.attempts}</td>
                    <td><span className={`finance-status ${log.status === 'SENT' ? 'finance-status--valide' : log.status === 'FAILED' ? 'finance-status--refuse' : 'finance-status--attente'}`}>{log.status}</span></td>
                    <td>{log.status !== 'SENT' && <button type="button" className="button button--ghost button--small" onClick={() => retry(log.id)}>Réessayer</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {detail && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setDetail(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Détail de l'opération" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">Détail de l’opération</h2><button type="button" className="modal__close" onClick={() => setDetail(null)} aria-label="Fermer">×</button></div>
            <div className="modal__body finance-form">
              <p><strong>{detail.description}</strong></p>
              <p>Type : {TYPE_LABELS[detail.type] ?? detail.type}</p>
              <p>Montant : {formatAr(detail.amount)} ({detail.direction === 'IN' ? 'entrée' : 'sortie'})</p>
              <p>Solde après : {detail.balanceAfter !== undefined ? formatAr(detail.balanceAfter) : '—'}</p>
              <p>Auteur : {detail.createdByName}</p>
              {detail.correctionOf && <p>Correction de l’opération {detail.correctionOf}</p>}
            </div>
            <div className="modal__footer">
              {isValidator && detail.type !== 'CORRECTION' && (
                <button type="button" className="button button--ghost" onClick={() => { setCorrection({ entry: detail, amount: detail.amount, direction: detail.direction, reason: '' }); setDetail(null); }}>
                  Corriger
                </button>
              )}
              <button type="button" className="button button--primary" onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {correction && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setCorrection(null)}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Correction comptable"
            onSubmit={(event: FormEvent) => { event.preventDefault(); void submitCorrection(); }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal__header"><h2 className="modal__title">Correction comptable</h2><button type="button" className="modal__close" onClick={() => setCorrection(null)} aria-label="Fermer">×</button></div>
            <div className="modal__body finance-form">
              <p className="modal__hint">L’opération d’origine n’est jamais modifiée : une écriture distincte est créée.</p>
              <label className="field">
                <span className="field__label">Montant (Ar)</span>
                <input className="input" type="number" min={1} required value={correction.amount || ''} onChange={(event) => setCorrection((previous) => previous && ({ ...previous, amount: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span className="field__label">Sens</span>
                <select className="input" value={correction.direction} onChange={(event) => setCorrection((previous) => previous && ({ ...previous, direction: event.target.value as 'IN' | 'OUT' }))}>
                  <option value="IN">Entrée</option>
                  <option value="OUT">Sortie</option>
                </select>
              </label>
              <label className="field">
                <span className="field__label">Motif de la correction</span>
                <textarea className="input" rows={3} required minLength={3} value={correction.reason} onChange={(event) => setCorrection((previous) => previous && ({ ...previous, reason: event.target.value }))} />
              </label>
            </div>
            <div className="modal__footer"><button type="button" className="button button--ghost" onClick={() => setCorrection(null)}>Annuler</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la correction'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
