import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import { useFinanceAccess } from '../../hooks/use-finance-access';
import { ConfirmModal, EmptyFinance, FinancePagination, StatusBadge, formatAr } from '../../components/finance-ui';
import { Toast, useToast } from '../../components/toast';
import type { ContributionFilters, ContributionRow, ContributionStatus } from '../../types/contribution';
import { CONTRIBUTION_STATUS_LABELS, FINANCE_MONTHS } from '../../types/contribution';

interface DeclarationForm {
  memberId: string;
  months: number[];
  year: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (memberId = ''): DeclarationForm => ({
  memberId,
  months: [],
  year: new Date().getFullYear(),
  paymentDate: today(),
  paymentMethod: '',
  notes: '',
});

export function ContributionsPage() {
  const { isValidator, member, members, loading: accessLoading } = useFinanceAccess();
  const { notice, notify, clear } = useToast();
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContributionFilters>({ page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<DeclarationForm>(() => initialForm());
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<{ row: ContributionRow; action: 'VALIDER' | 'REFUSER' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const page = await contributionsService.list(filters);
      setRows(page.items);
      setTotal(page.total);
      setTotalPages(page.totalPages);
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Impossible de charger les cotisations.' });
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

  const selectedMemberId = form.memberId || member?.id || '';

  const applyFilters = (event: FormEvent): void => {
    event.preventDefault();
    setFilters((previous) => ({ ...previous, search, page: 1 }));
  };

  const openForm = (): void => {
    setForm(initialForm(member?.id ?? ''));
    setFormOpen(true);
  };

  const toggleMonth = (month: number): void => {
    setForm((previous) => ({
      ...previous,
      months: previous.months.includes(month)
        ? previous.months.filter((item) => item !== month)
        : [...previous.months, month].sort((a, b) => a - b),
    }));
  };

  const submitDeclaration = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!selectedMemberId || form.months.length === 0) {
      notify({ type: 'error', text: 'Sélectionnez un membre et au moins un mois.' });
      return;
    }
    setSaving(true);
    try {
      await contributionsService.declare({
        memberId: isValidator ? selectedMemberId : undefined,
        months: form.months,
        year: form.year,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes || undefined,
      });
      notify({ type: 'success', text: `${form.months.length} cotisation(s) déclarée(s). Notification envoyée.` });
      setFormOpen(false);
      await load();
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Déclaration impossible.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDecision = async (): Promise<void> => {
    if (!decision) return;
    setBusy(true);
    try {
      if (decision.action === 'VALIDER') {
        await contributionsService.validate(decision.row.id);
        notify({ type: 'success', text: 'Cotisation validée et comptabilisée.' });
      } else {
        await contributionsService.reject(decision.row.id, reason);
        notify({ type: 'success', text: 'Déclaration refusée.' });
      }
      setDecision(null);
      setReason('');
      await load();
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Action impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const years = Array.from({ length: Math.max(1, new Date().getFullYear() - 2025) }, (_, index) => 2026 + index);

  return (
    <div className="page finance-page">
      <Toast notice={notice} onClose={clear} />
      <header className="page-header">
        <div>
          <span className="page__eyebrow">Caisse commune · 5 000 Ar / mois</span>
          <h1>Suivi des cotisations</h1>
          <p className="page-header__subtitle">{total} période(s) suivie(s) depuis janvier 2026.</p>
        </div>
        <button type="button" className="button button--primary" onClick={openForm} disabled={accessLoading || !member}>Déclarer un paiement</button>
      </header>

      <form className="card finance-filters" onSubmit={applyFilters}>
        <label className="field"><span className="field__label">Membre</span>
          <select className="input" value={filters.memberId ?? ''} onChange={(event) => setFilters((p) => ({ ...p, memberId: event.target.value || undefined, page: 1 }))}>
            <option value="">Tous les membres</option>
            {members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="field"><span className="field__label">Année</span>
          <select className="input" value={filters.year ?? ''} onChange={(event) => setFilters((p) => ({ ...p, year: event.target.value ? Number(event.target.value) : undefined, page: 1 }))}>
            <option value="">Toutes</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="field"><span className="field__label">Mois</span>
          <select className="input" value={filters.month ?? ''} onChange={(event) => setFilters((p) => ({ ...p, month: event.target.value ? Number(event.target.value) : undefined, page: 1 }))}>
            <option value="">Tous</option>
            {FINANCE_MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
        </label>
        <label className="field"><span className="field__label">Statut</span>
          <select className="input" value={filters.status ?? ''} onChange={(event) => setFilters((p) => ({ ...p, status: (event.target.value || undefined) as ContributionStatus | undefined, page: 1 }))}>
            <option value="">Tous</option>
            {Object.entries(CONTRIBUTION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="field"><span className="field__label">Recherche</span>
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou email" />
        </label>
        <button type="submit" className="button button--ghost">Filtrer</button>
      </form>

      <section className="card table-card">
        <div className="section-head"><div><h2 className="section-head__title">Périodes de cotisation</h2><p className="section-head__subtitle">Déclarations, validations et retards</p></div></div>
        {loading ? <p className="finance-empty-inline">Chargement…</p> : rows.length === 0 ? (
          <EmptyFinance title="Aucune cotisation trouvée" hint="Modifiez les filtres ou déclarez un paiement." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table finance-table">
                <thead><tr><th>Membre</th><th>Période</th><th>Attendu</th><th>Déclaré</th><th>Statut</th><th>Déclaration</th><th>Validation</th><th>Validateur</th>{isValidator && <th>Actions</th>}</tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.memberName}</strong><br /><span className="card__note">{row.memberEmail}</span></td>
                      <td className="data-table__date">{row.monthLabel}</td>
                      <td>{formatAr(row.expectedAmount)}</td>
                      <td className="data-table__value">{row.declaredAmount > 0 ? formatAr(row.declaredAmount) : '—'}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>{row.paymentDate ?? '—'}{row.paymentMethod ? <><br /><span className="card__note">{row.paymentMethod}</span></> : null}</td>
                      <td>{row.validatedAt ?? '—'}</td>
                      <td>{row.validatedBy ?? '—'}</td>
                      {isValidator && <td>{row.status === 'EN_ATTENTE_DE_VALIDATION' && !row.isSynthetic ? (
                        <div className="finance-actions">
                          <button type="button" className="button button--primary button--small" onClick={() => setDecision({ row, action: 'VALIDER' })}>Valider</button>
                          <button type="button" className="button button--ghost button--small" onClick={() => setDecision({ row, action: 'REFUSER' })}>Refuser</button>
                        </div>
                      ) : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FinancePagination page={filters.page ?? 1} totalPages={totalPages} onChange={(page) => setFilters((p) => ({ ...p, page }))} />
          </>
        )}
      </section>

      {formOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <form className="modal" role="dialog" aria-modal="true" aria-label="Déclarer une cotisation" onSubmit={submitDeclaration} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">Déclarer une cotisation</h2><button type="button" className="modal__close" onClick={() => setFormOpen(false)} aria-label="Fermer">×</button></div>
            <div className="modal__body finance-form">
              <label className="field"><span className="field__label">Membre concerné</span>
                <select className="input" value={selectedMemberId} onChange={(event) => setForm((p) => ({ ...p, memberId: event.target.value }))} disabled={!isValidator}>
                  <option value="">Sélectionner un membre</option>
                  {members.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name} — {item.email}</option>)}
                </select>
              </label>
              <div className="field"><span className="field__label">Mois à payer</span>
                <div className="finance-month-grid">
                  {FINANCE_MONTHS.map((label, index) => (
                    <label key={label} className={`finance-month ${form.months.includes(index + 1) ? 'finance-month--selected' : ''}`}>
                      <input type="checkbox" checked={form.months.includes(index + 1)} onChange={() => toggleMonth(index + 1)} />
                      <span>{label.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field-row">
                <label className="field"><span className="field__label">Année</span><input className="input" type="number" min={2026} value={form.year} onChange={(event) => setForm((p) => ({ ...p, year: Number(event.target.value) }))} /></label>
                <label className="field"><span className="field__label">Date du paiement</span><input className="input" type="date" value={form.paymentDate} onChange={(event) => setForm((p) => ({ ...p, paymentDate: event.target.value }))} /></label>
              </div>
              <label className="field"><span className="field__label">Mode de paiement (facultatif)</span><input className="input" value={form.paymentMethod} onChange={(event) => setForm((p) => ({ ...p, paymentMethod: event.target.value }))} placeholder="Espèces, virement…" /></label>
              <label className="field"><span className="field__label">Observation (facultative)</span><textarea className="input" rows={2} value={form.notes} onChange={(event) => setForm((p) => ({ ...p, notes: event.target.value }))} /></label>
              <div className="finance-total"><span>Montant calculé automatiquement</span><strong>{formatAr(form.months.length * 5000)}</strong></div>
            </div>
            <div className="modal__footer"><button type="button" className="button button--ghost" onClick={() => setFormOpen(false)}>Annuler</button><button type="submit" className="button button--primary" disabled={saving}>{saving ? 'Envoi…' : 'Déclarer'}</button></div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={decision !== null}
        title={decision?.action === 'VALIDER' ? 'Valider cette cotisation ?' : 'Refuser cette déclaration ?'}
        busy={busy}
        confirmLabel={decision?.action === 'VALIDER' ? 'Valider' : 'Refuser'}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
      >
        {decision && (
          <>
            <p><strong>{decision.row.memberName}</strong> — {decision.row.monthLabel} — {formatAr(decision.row.declaredAmount)}</p>
            {decision.action === 'VALIDER' ? (
              <p className="modal__hint">La validation est irréversible et comptabilise le montant dans la caisse. Aucun email supplémentaire ne sera envoyé.</p>
            ) : (
              <label className="field"><span className="field__label">Motif du refus</span><textarea className="input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            )}
          </>
        )}
      </ConfirmModal>
    </div>
  );
}
