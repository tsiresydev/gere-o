import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import { useFinanceAccess } from '../../hooks/use-finance-access';
import { Toast, useToast } from '../../components/toast';
import type { ExpenseCategory } from '../../types/contribution';

export function CategoriesPage() {
  const { isValidator } = useFinanceAccess();
  const { notice, notify, clear } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    contributionsService.categories()
      .then(setCategories)
      .catch((err: unknown) => notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Impossible de charger les catégories.' }));
  }, [notify]);

  const create = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      await contributionsService.createCategory({ name, label });
      setCategories(await contributionsService.categories());
      setName(''); setLabel('');
      notify({ type: 'success', text: 'Catégorie ajoutée.' });
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Ajout impossible.' });
    } finally { setBusy(false); }
  };

  const toggle = async (row: ExpenseCategory): Promise<void> => {
    try {
      await contributionsService.updateCategory(row.id, { isActive: !row.isActive });
      setCategories(await contributionsService.categories());
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Mise à jour impossible.' });
    }
  };

  return (
    <div className="page finance-page">
      <Toast notice={notice} onClose={clear} />
      <header className="page-header"><div><span className="page__eyebrow">Caisse commune</span><h1>Catégories de dépenses</h1><p className="page-header__subtitle">Catégories initiales et ajouts autorisés.</p></div></header>
      <section className="card table-card">
        <div className="section-head"><div><h2 className="section-head__title">Catégories</h2><p className="section-head__subtitle">{categories.length} catégorie(s)</p></div></div>
        <div className="table-wrap">
          <table className="data-table finance-table">
            <thead><tr><th>Nom</th><th>Libellé</th><th>Statut</th>{isValidator && <th>Action</th>}</tr></thead>
            <tbody>
              {categories.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.label}</td>
                  <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                  {isValidator && <td><button type="button" className="button button--ghost button--small" onClick={() => toggle(row)}>{row.isActive ? 'Désactiver' : 'Activer'}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {isValidator && (
        <form className="card finance-filters" onSubmit={create}>
          <label className="field"><span className="field__label">Nom (majuscules)</span><input className="input" required minLength={2} value={name} onChange={(event) => setName(event.target.value.toUpperCase())} /></label>
          <label className="field"><span className="field__label">Libellé</span><input className="input" required minLength={2} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
          <button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Ajout…' : 'Ajouter'}</button>
        </form>
      )}
    </div>
  );
}
