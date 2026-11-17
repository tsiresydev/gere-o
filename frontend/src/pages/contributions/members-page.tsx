import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import { useFinanceAccess } from '../../hooks/use-finance-access';
import { ConfirmModal, EmptyFinance } from '../../components/finance-ui';
import { Toast, useToast } from '../../components/toast';
import type { MemberRow } from '../../types/contribution';

export function MembersPage() {
  const { isValidator, members: accessMembers } = useFinanceAccess();
  const { notice, notify, clear } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<MemberRow | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    contributionsService.members()
      .then((data) => { setMembers(data); setLoading(false); })
      .catch((err: unknown) => {
        notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Impossible de charger les membres.' });
        setLoading(false);
      });
  }, [notify]);

  const displayMembers = members.length > 0 ? members : accessMembers;

  const create = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await contributionsService.updateMember(editing.id, { name, email });
      } else {
        await contributionsService.createMember({ name, email });
      }
      setMembers(await contributionsService.members());
      setName('');
      setEmail('');
      setOpen(false);
      notify({ type: 'success', text: editing ? 'Membre modifié.' : 'Membre ajouté à la caisse.' });
      setEditing(null);
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Enregistrement impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (): Promise<void> => {
    const row = statusTarget;
    if (!row) return;
    setBusy(true);
    try {
      await contributionsService.updateMember(row.id, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      setMembers(await contributionsService.members());
      notify({ type: 'success', text: `Membre ${row.status === 'ACTIVE' ? 'désactivé' : 'réactivé'}.` });
      setStatusTarget(null);
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Mise à jour impossible.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page finance-page">
      <Toast notice={notice} onClose={clear} />
      <header className="page-header">
        <div>
          <span className="page__eyebrow">Caisse commune</span>
          <h1>Membres participants</h1>
          <p className="page-header__subtitle">Cotisation de 5 000 Ar par membre et par mois depuis janvier 2026.</p>
        </div>
        {isValidator && <button type="button" className="button button--primary" onClick={() => { setEditing(null); setName(''); setEmail(''); setOpen(true); }}>Ajouter un membre</button>}
      </header>

      <section className="card table-card">
        <div className="section-head"><div><h2 className="section-head__title">Liste des membres</h2><p className="section-head__subtitle">{displayMembers.length} participant(s)</p></div></div>
        {loading ? <p className="finance-empty-inline">Chargement…</p> : displayMembers.length === 0 ? <EmptyFinance title="Aucun membre" /> : (
          <div className="table-wrap">
            <table className="data-table finance-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Statut</th><th>Mois validés</th><th>En retard</th>{isValidator && <th>Actions</th>}</tr></thead>
              <tbody>
                {displayMembers.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.name}</strong><br /><span className="card__note">Depuis {row.joinedAt}</span></td>
                    <td>{row.email}</td>
                    <td><span className={`finance-status ${row.status === 'ACTIVE' ? 'finance-status--valide' : 'finance-status--refuse'}`}>{row.status === 'ACTIVE' ? 'Actif' : 'Désactivé'}</span></td>
                    <td className="data-table__value">{row.validatedMonths}</td>
                    <td className={row.lateMonths > 0 ? 'is-negative' : ''}>{row.lateMonths}</td>
                    {isValidator && <td><div className="finance-actions"><button type="button" className="button button--ghost button--small" onClick={() => { setEditing(row); setName(row.name); setEmail(row.email); setOpen(true); }} aria-label={`Modifier ${row.name}`}>Modifier</button><button type="button" className="button button--ghost button--small" onClick={() => setStatusTarget(row)} aria-label={`${row.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'} ${row.name}`}>{row.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}</button></div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
          <form className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Modifier un membre' : 'Ajouter un membre'} onSubmit={create} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">{editing ? 'Modifier un membre' : 'Ajouter un membre'}</h2><button type="button" className="modal__close" onClick={() => setOpen(false)} aria-label="Fermer">×</button></div>
            <div className="modal__body finance-form">
              <label className="field"><span className="field__label">Nom</span><input className="input" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="field"><span className="field__label">Email</span><input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <p className="modal__hint">Aucun compte Gere-o n’est créé automatiquement. Si l’adresse change, le lien avec l’ancien compte est retiré.</p>
            </div>
            <div className="modal__footer"><button type="button" className="button button--ghost" onClick={() => setOpen(false)}>Annuler</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}</button></div>
          </form>
        </div>
      )}
      <ConfirmModal open={statusTarget !== null} title={statusTarget?.status === 'ACTIVE' ? 'Désactiver ce membre ?' : 'Réactiver ce membre ?'} busy={busy} confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'} onClose={() => setStatusTarget(null)} onConfirm={toggleStatus}>
        <p>{statusTarget?.name} — {statusTarget?.email}</p>
        <p className="modal__hint">L’historique des cotisations est conservé.</p>
      </ConfirmModal>
    </div>
  );
}
