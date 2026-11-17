import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import { useFinanceAccess } from '../../hooks/use-finance-access';
import { ConfirmModal, EmptyFinance, FinancePagination, formatAr } from '../../components/finance-ui';
import { Toast, useToast } from '../../components/toast';
import type { CreateExpenseInput, Expense, ExpenseCategory, ExpenseFilters } from '../../types/contribution';

const emptyExpense = (): CreateExpenseInput => ({
  description: '',
  category: 'FAHASOAVANA',
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

export function ExpensesPage() {
  const { isValidator } = useFinanceAccess();
  const { notice, notify, clear } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>({ page: 1, limit: 10 });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateExpenseInput>(emptyExpense);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [page, cats] = await Promise.all([
        contributionsService.expenses(filters),
        contributionsService.categories(),
      ]);
      setExpenses(page.items);
      setTotalPages(page.totalPages);
      setCategories(cats);
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Impossible de charger les dépenses.' });
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      await contributionsService.createExpense(form);
      notify({ type: 'success', text: 'Dépense enregistrée. Notification envoyée à la caisse.' });
      setConfirmOpen(false);
      setFormOpen(false);
      setForm(emptyExpense());
      await load();
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Enregistrement impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="page finance-page">
      <Toast notice={notice} onClose={clear} />
      <header className="page-header">
        <div>
          <span className="page__eyebrow">Caisse commune</span>
          <h1>Dépenses</h1>
          <p className="page-header__subtitle">Enregistrez et suivez les sorties d’argent de la caisse.</p>
        </div>
        <div className="page__actions">
          <Link className="button button--ghost" to="/cotisations/categories">Catégories</Link>
          {isValidator && (
            <button type="button" className="button button--primary" onClick={() => setFormOpen(true)}>
              Enregistrer une dépense
            </button>
          )}
        </div>
      </header>

      <section className="finance-summary">
        <div><span>Total affiché</span><strong>{formatAr(total)}</strong></div>
        <div><span>Catégories disponibles</span><strong>{categories.filter((item) => item.isActive).length}</strong></div>
        <div><span>Solde après dernière opération</span><strong>{expenses[0]?.balanceAfter !== undefined ? formatAr(expenses[0].balanceAfter) : '—'}</strong></div>
      </section>

      <form
        className="card finance-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((previous) => ({ ...previous, page: 1 }));
        }}
      >
        <label className="field">
          <span className="field__label">Catégorie</span>
          <select
            className="input"
            value={filters.category ?? ''}
            onChange={(event) => setFilters((previous) => ({ ...previous, category: event.target.value || undefined, page: 1 }))}
          >
            <option value="">Toutes</option>
            {categories.map((item) => <option key={item.id} value={item.name}>{item.label}</option>)}
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
        <button type="submit" className="button button--ghost">Filtrer</button>
      </form>

      <section className="card table-card">
        <div className="section-head"><div><h2 className="section-head__title">Historique des dépenses</h2><p className="section-head__subtitle">Chaque sortie est comptabilisée immédiatement</p></div></div>
        {loading ? <p className="finance-empty-inline">Chargement…</p> : expenses.length === 0 ? (
          <EmptyFinance title="Aucune dépense enregistrée" hint="Les dépenses apparaîtront ici dès leur enregistrement." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table finance-table">
                <thead><tr><th>Motif</th><th>Catégorie</th><th>Montant</th><th>Date</th><th>Auteur</th><th>Solde après</th></tr></thead>
                <tbody>
                  {expenses.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong>{item.notes && <><br /><span className="card__note">{item.notes}</span></>}</td>
                      <td><span className="pill">{item.category}</span></td>
                      <td className="data-table__value is-negative">− {formatAr(item.amount)}</td>
                      <td className="data-table__date">{item.expenseDate}</td>
                      <td>{item.createdByName}</td>
                      <td className="data-table__value">{item.balanceAfter !== undefined ? formatAr(item.balanceAfter) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FinancePagination page={filters.page ?? 1} totalPages={totalPages} onChange={(page) => setFilters((previous) => ({ ...previous, page }))} />
          </>
        )}
      </section>

      {formOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Enregistrer une dépense"
            onSubmit={(event) => { event.preventDefault(); setConfirmOpen(true); }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal__header"><h2 className="modal__title">Nouvelle dépense</h2><button type="button" className="modal__close" onClick={() => setFormOpen(false)} aria-label="Fermer">×</button></div>
            <div className="modal__body finance-form">
              <label className="field"><span className="field__label">Motif</span><input className="input" required minLength={2} value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} /></label>
              <label className="field">
                <span className="field__label">Catégorie</span>
                <select className="input" value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}>
                  {categories.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.name}>{item.label}</option>)}
                </select>
              </label>
              <div className="field-row">
                <label className="field"><span className="field__label">Montant (Ar)</span><input className="input" type="number" min={1} required value={form.amount || ''} onChange={(event) => setForm((previous) => ({ ...previous, amount: Number(event.target.value) }))} /></label>
                <label className="field"><span className="field__label">Date</span><input className="input" type="date" required value={form.expenseDate} onChange={(event) => setForm((previous) => ({ ...previous, expenseDate: event.target.value }))} /></label>
              </div>
              <label className="field"><span className="field__label">Description complémentaire</span><textarea className="input" rows={3} value={form.notes} onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))} /></label>
              <p className="modal__hint">Le solde est vérifié par le backend avant enregistrement. Aucun justificatif n’est requis.</p>
            </div>
            <div className="modal__footer"><button type="button" className="button button--ghost" onClick={() => setFormOpen(false)}>Annuler</button><button type="submit" className="button button--primary">Continuer</button></div>
          </form>
        </div>
      )}

      <ConfirmModal open={confirmOpen} title="Confirmer la dépense ?" busy={busy} confirmLabel="Enregistrer" onClose={() => setConfirmOpen(false)} onConfirm={save}>
        <p>{form.description}</p>
        <p><strong>{formatAr(form.amount)}</strong> — {form.category} — {form.expenseDate}</p>
        <p className="modal__hint">La sortie sera immédiatement comptabilisée et une notification sera envoyée aux membres actifs.</p>
      </ConfirmModal>
    </div>
  );
}
