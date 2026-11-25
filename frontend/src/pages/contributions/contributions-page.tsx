import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import { useFinanceAccess } from '../../hooks/use-finance-access';
import { EmptyFinance, StatusBadge, formatAr } from '../../components/finance-ui';
import { Toast, useToast } from '../../components/toast';
import type { ContributionFilters, ContributionRow, ContributionStatus } from '../../types/contribution';
import { CONTRIBUTION_STATUS_LABELS, FINANCE_MONTHS } from '../../types/contribution';

interface DeclarationForm {
  memberId: string;
  months: number[];
  year: number;
  paymentDate: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (memberId = ''): DeclarationForm => ({
  memberId,
  months: [],
  year: new Date().getFullYear(),
  paymentDate: today(),
});

export function ContributionsPage() {
  const { isValidator, member, members, loading: accessLoading } = useFinanceAccess();
  const canDeclare = isValidator && member?.email.toLowerCase() === 'tsiresy.madasoftware@gmail.com';
  const canDecide = isValidator && ['tsiresy.madasoftware@gmail.com', 'mahefa.madasoftware@gmail.com'].includes(member?.email.toLowerCase() ?? '');
  const [pendingRows, setPendingRows] = useState<ContributionRow[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [decision, setDecision] = useState<{ group: ContributionRow[]; reject: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const decisionRef = useRef<HTMLDialogElement>(null);
  const { notice, notify, clear } = useToast();
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContributionFilters>({ page: 1, limit: 100, year: new Date().getFullYear() });
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef(0);
  const [form, setForm] = useState<DeclarationForm>(() => initialForm());
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [availability, setAvailability] = useState<{
    key: string;
    rows: ContributionRow[];
    error?: string;
  } | null>(null);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    await Promise.resolve();
    setLoading(true);
    try {
      const first = await contributionsService.list({ ...filters, page: 1, limit: 100 });
      const remaining = await Promise.all(
        Array.from({ length: first.totalPages - 1 }, (_, index) =>
          contributionsService.list({ ...filters, page: index + 2, limit: 100 }),
        ),
      );
      const pending = canDecide ? await contributionsService.pendingDeclarations() : [];
      if (request !== requestRef.current) return;
      setRows([first, ...remaining].flatMap((page) => page.items));
      setTotal(first.total);
      setPendingRows(pending);
      setLoadError(false);
    } catch (err) {
      if (request !== requestRef.current) return;
      setRows([]);
      setTotal(0);
      setPendingRows([]);
      setLoadError(true);
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Impossible de charger les cotisations.' });
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [filters, notify, canDecide]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; };
  }, [load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (detailId && dialog && !dialog.open) dialog.showModal();
    if (!detailId && dialog?.open) dialog.close();
  }, [detailId]);

  useEffect(() => {
    const dialog = decisionRef.current;
    if (decision && dialog && !dialog.open) dialog.showModal();
    if (!decision && dialog?.open) dialog.close();
  }, [decision]);

  const groups = Array.from(rows.reduce((map, row) => {
    const group = map.get(row.memberId) ?? { id: row.memberId, name: row.memberName, email: row.memberEmail, rows: [] as ContributionRow[] };
    group.rows.push(row);
    map.set(row.memberId, group);
    return map;
  }, new Map<string, { id: string; name: string; email: string; rows: ContributionRow[] }>()).values())
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const detail = groups.find((group) => group.id === detailId);
  const detailPageSize = 2;
  const detailPageCount = Math.max(1, Math.ceil((detail?.rows.length ?? 0) / detailPageSize));
  const currentDetailPage = Math.min(detailPage, detailPageCount - 1);
  const mobileDetailRows = detail?.rows.slice(currentDetailPage * detailPageSize, (currentDetailPage + 1) * detailPageSize) ?? [];
  const pendingGroups = Array.from(pendingRows.reduce((map, row) => {
    const key = row.declarationGroupId || row.id;
    const items = map.get(key) ?? [];
    items.push(row);
    map.set(key, items);
    return map;
  }, new Map<string, ContributionRow[]>()).values());

  const decide = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!decision || (decision.reject && !reason.trim())) return;
    const { group, reject } = decision;
    setDeciding(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      if (reject) await contributionsService.reject(group[0].id, reason.trim());
      else await contributionsService.validate(group[0].id, controller.signal);
      notify({ type: 'success', text: reject ? 'Déclaration refusée.' : 'Cotisation validée. Envoi du mail en cours ; consultez le journal des notifications.' });
      setDecision(null);
      setReason('');
      void load();
    } catch (err) {
      const uncertain = !reject && (!(err instanceof ApiError) || err.status >= 500);
      if (uncertain) {
        setDecision(null);
        notify({ type: 'error', text: 'Réponse non confirmée. Vérifiez le statut et le journal de caisse avant toute nouvelle validation.' });
      } else {
        notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Décision impossible.' });
      }
      void load();
    } finally { window.clearTimeout(timeout); setDeciding(false); }
  };

  const selectedMemberId = form.memberId || member?.id || '';
  const availabilityKey = `${selectedMemberId}:${form.year}:${availabilityRevision}`;
  const availabilityReady = availability?.key === availabilityKey;
  const availabilityError = availabilityReady ? availability.error : undefined;
  const monthStatuses = availabilityReady && !availabilityError
    ? new Map(availability.rows.map((row) => [row.periodMonth, row.status]))
    : new Map<number, ContributionStatus>();

  useEffect(() => {
    if (!formOpen || !selectedMemberId || form.year < 2026 || !Number.isInteger(form.year)) return;
    let cancelled = false;
    contributionsService.list({ memberId: selectedMemberId, year: form.year, page: 1, limit: 12 })
      .then((page) => {
        if (!cancelled) setAvailability({ key: availabilityKey, rows: page.items });
      })
      .catch((err: unknown) => {
        if (!cancelled) setAvailability({ key: availabilityKey, rows: [], error: err instanceof ApiError ? err.message : 'Impossible de vérifier les mois déjà déclarés.' });
      });
    return () => { cancelled = true; };
  }, [formOpen, selectedMemberId, form.year, availabilityKey]);

  const applyFilters = (event: FormEvent): void => {
    event.preventDefault();
    setFilters((previous) => ({ ...previous, search, page: 1 }));
  };

  const openForm = (): void => {
    setForm(initialForm(member?.id ?? ''));
    setAvailabilityRevision((revision) => revision + 1);
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
    if (!availabilityReady || availabilityError) return;
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
      });
      notify({ type: 'success', text: `${form.months.length} cotisation(s) en attente de validation.` });
      setFormOpen(false);
      await load();
    } catch (err) {
      notify({ type: 'error', text: err instanceof ApiError ? err.message : 'Déclaration impossible.' });
    } finally {
      setSaving(false);
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
          <p className="page-header__subtitle">Consultez les cotisations par membre depuis janvier 2026.</p>
        </div>
        {canDeclare && <button type="button" className="button button--primary" onClick={openForm} disabled={accessLoading}>Déclarer un paiement</button>}
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
          {(['NON_PAYE', 'VALIDE', 'EN_RETARD', 'EN_ATTENTE_DE_VALIDATION', 'REFUSE'] as const).map((value) => <option key={value} value={value}>{CONTRIBUTION_STATUS_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="field"><span className="field__label">Recherche</span>
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou email" />
        </label>
        <button type="submit" className="button button--ghost">Filtrer</button>
      </form>

      {canDecide && <section className="card table-card">
        <div className="section-head"><h2 className="section-head__title">Déclarations en attente</h2></div>
        {loading ? <p className="finance-empty-inline" role="status">Chargement des déclarations…</p> : loadError ? <p className="finance-empty-inline" role="alert">Impossible de charger les déclarations. <button type="button" className="button button--ghost button--small" onClick={() => void load()}>Réessayer</button></p> : pendingGroups.length === 0 ? <p className="finance-empty-inline">Aucune déclaration en attente.</p> : <div className="table-wrap"><table className="data-table mobile-card-table"><thead><tr><th>Membre</th><th>Mois</th><th>Montant</th><th>Actions</th></tr></thead><tbody>
          {pendingGroups.map((group) => <tr key={group[0].declarationGroupId || group[0].id}><td data-label="Membre">{group[0].memberName}</td><td data-label="Mois">{group.map((row) => row.monthLabel).join(', ')}</td><td data-label="Montant">{formatAr(group.reduce((sum, row) => sum + row.declaredAmount, 0))}</td><td data-label="Actions"><div className="decision-actions"><button type="button" className="button button--primary button--small" disabled={deciding} onClick={() => { setReason(''); setDecision({ group, reject: false }); }}>Valider</button><button type="button" className="button button--ghost button--small" disabled={deciding} onClick={() => { setReason(''); setDecision({ group, reject: true }); }}>Refuser</button></div></td></tr>)}
        </tbody></table></div>}
      </section>}

      <dialog ref={decisionRef} className="modal decision-dialog" aria-labelledby="decision-title" onCancel={(event) => { if (deciding) event.preventDefault(); }} onClose={() => setDecision(null)}>
        {decision && <form onSubmit={(event) => void decide(event)}>
          <div className="modal__header"><h2 className="modal__title" id="decision-title">{decision.reject ? 'Refuser la déclaration' : 'Valider la déclaration'}</h2><button type="button" className="modal__close" disabled={deciding} onClick={() => setDecision(null)} aria-label="Fermer">×</button></div>
          <div className="modal__body">
            <p><strong>{decision.group[0].memberName}</strong> · {formatAr(decision.group.reduce((sum, row) => sum + row.declaredAmount, 0))}</p>
            <p>{decision.group.map((row) => row.monthLabel).join(', ')}</p>
            {decision.reject ? <><p className="modal__hint">Tous les mois de cette déclaration seront refusés et pourront être déclarés à nouveau.</p><label className="field"><span className="field__label">Motif du refus</span><textarea className="input decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={500} placeholder="Indiquez la raison du refus" /></label></> : <p className="modal__hint">Tous les mois seront validés, comptabilisés et feront l’objet d’un seul mail récapitulatif.</p>}
          </div>
          <div className="modal__footer"><button type="button" className="button button--ghost" disabled={deciding} onClick={() => setDecision(null)}>Annuler</button><button type="submit" className="button button--primary" disabled={deciding || (decision.reject && !reason.trim())}>{deciding ? 'Traitement…' : decision.reject ? 'Confirmer le refus' : 'Confirmer la validation'}</button></div>
        </form>}
      </dialog>

      <section className="card table-card">
        <div className="section-head"><div><h2 className="section-head__title">Cotisations par membre</h2><p className="section-head__subtitle">{groups.length} membre(s) · {total} période(s) correspondant aux filtres</p></div></div>
        {loading ? <p className="finance-empty-inline">Chargement…</p> : rows.length === 0 ? (
          <EmptyFinance title="Aucune cotisation trouvée" hint="Modifiez les filtres ou déclarez un paiement." />
        ) : (
            <div className="table-wrap">
              <table className="data-table finance-table mobile-card-table">
                <thead><tr><th>Membre</th><th>Périodes</th><th>Payées</th><th>En retard</th><th>Détail</th></tr></thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id}>
                      <td data-label="Membre"><span><strong>{group.name}</strong><br /><span className="card__note">{group.email}</span></span></td>
                      <td data-label="Périodes">{group.rows.length}</td>
                      <td data-label="Payées">{group.rows.filter((row) => row.status === 'VALIDE').length}</td>
                      <td data-label="En retard">{group.rows.filter((row) => row.status === 'EN_RETARD').length}</td>
                      <td data-label="Détail"><button type="button" className="button button--ghost button--small" onClick={() => { setDetailPage(0); setDetailId(group.id); }} aria-label={`Voir les cotisations de ${group.name}`}>Voir les mois</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </section>

      <dialog ref={dialogRef} className="modal contribution-detail-dialog" aria-labelledby="contribution-detail-title" onClose={() => setDetailId(null)}>
        {detail && <>
          <div className="modal__header"><div><h2 className="modal__title" id="contribution-detail-title">Cotisations de {detail.name}</h2><p className="card__note">{detail.email} · {detail.rows.length} période(s) selon les filtres</p></div><button type="button" className="modal__close" onClick={() => dialogRef.current?.close()} aria-label="Fermer">×</button></div>
          <div className="modal__body contribution-detail-desktop">
            <table className="data-table contribution-detail-table"><thead><tr><th>Période</th><th>Déclaré</th><th>Statut</th><th>Date de paiement</th></tr></thead><tbody>
              {detail.rows.map((row) => <tr key={row.id}><td data-label="Période">{row.monthLabel}</td><td data-label="Déclaré">{row.declaredAmount > 0 ? formatAr(row.declaredAmount) : '—'}</td><td data-label="Statut"><StatusBadge status={row.status} /></td><td data-label="Date de paiement"><span>{row.paymentDate ?? '—'}{row.paymentMethod ? <><br /><span className="card__note">{row.paymentMethod}</span></> : null}</span></td></tr>)}
            </tbody></table>
          </div>
          <div className="contribution-detail-mobile">
            <div className="contribution-month-list" aria-live="polite">
              {mobileDetailRows.map((row) => <dl className="contribution-month-card" key={row.id}>
                <div><dt>Période</dt><dd><strong>{row.monthLabel}</strong></dd></div>
                <div><dt>Déclaré</dt><dd>{row.declaredAmount > 0 ? formatAr(row.declaredAmount) : '—'}</dd></div>
                <div><dt>Statut</dt><dd><StatusBadge status={row.status} /></dd></div>
                <div><dt>Date de paiement</dt><dd>{row.paymentDate ?? '—'}{row.paymentMethod ? ` · ${row.paymentMethod}` : ''}</dd></div>
              </dl>)}
            </div>
            {detailPageCount > 1 && <nav className="contribution-month-pagination" aria-label="Pages des cotisations">
              <button type="button" className="button button--ghost button--small" disabled={currentDetailPage === 0} onClick={() => setDetailPage(currentDetailPage - 1)} aria-label="Mois précédents">Précédent</button>
              <span aria-live="polite">{currentDetailPage + 1} / {detailPageCount}</span>
              <button type="button" className="button button--ghost button--small" disabled={currentDetailPage >= detailPageCount - 1} onClick={() => setDetailPage(currentDetailPage + 1)} aria-label="Mois suivants">Suivant</button>
            </nav>}
          </div>
          <div className="modal__footer"><button type="button" className="button button--primary" onClick={() => dialogRef.current?.close()}>Fermer</button></div>
        </>}
      </dialog>

      {formOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <form className="modal" role="dialog" aria-modal="true" aria-label="Déclarer une cotisation" onSubmit={submitDeclaration} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal__header"><h2 className="modal__title">Déclarer une cotisation</h2><button type="button" className="modal__close" onClick={() => setFormOpen(false)} aria-label="Fermer">×</button></div>
            <div className="modal__body finance-form">
              <label className="field"><span className="field__label">Membre concerné</span>
                <select className="input" value={selectedMemberId} onChange={(event) => setForm((p) => ({ ...p, memberId: event.target.value, months: [] }))} disabled={!isValidator}>
                  <option value="">Sélectionner un membre</option>
                  {members.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name} — {item.email}</option>)}
                </select>
              </label>
              <div className="field"><span className="field__label">Mois à payer</span>
                <div className="finance-month-grid">
                  {FINANCE_MONTHS.map((label, index) => {
                    const status = monthStatuses.get(index + 1);
                    const alreadyPaid = status === 'VALIDE';
                    const pending = status === 'EN_ATTENTE_DE_VALIDATION';
                    const disabled = !availabilityReady || Boolean(availabilityError) || alreadyPaid || pending;
                    return (
                      <label key={label} className={`finance-month ${form.months.includes(index + 1) ? 'finance-month--selected' : ''} ${disabled ? 'finance-month--disabled' : ''}`}>
                        <input type="checkbox" disabled={disabled} checked={form.months.includes(index + 1)} onChange={() => toggleMonth(index + 1)} aria-label={`${label}${alreadyPaid ? ' — déjà payé' : pending ? ' — déjà déclaré' : ''}`} />
                        <span>{label.slice(0, 3)}{alreadyPaid && <small>Payé</small>}{pending && <small>Déclaré</small>}</span>
                      </label>
                    );
                  })}
                </div>
                {!availabilityReady && <p className="modal__hint" role="status">{!selectedMemberId ? 'Sélectionnez un membre.' : form.year < 2026 || !Number.isInteger(form.year) ? 'Indiquez une année valide à partir de 2026.' : 'Vérification des mois déjà payés…'}</p>}
                {availabilityError && <p className="modal__hint" role="alert">{availabilityError} <button type="button" className="button button--ghost button--small" onClick={() => setAvailabilityRevision((revision) => revision + 1)}>Réessayer</button></p>}
                {availabilityReady && !availabilityError && <p className="modal__hint">Les mois déjà payés ou déclarés ne peuvent pas être sélectionnés.</p>}
              </div>
              <div className="field-row">
                <label className="field"><span className="field__label">Année</span><input className="input" type="number" min={2026} value={form.year} onChange={(event) => setForm((p) => ({ ...p, year: Number(event.target.value), months: [] }))} /></label>
                <label className="field"><span className="field__label">Date du paiement</span><input className="input" type="date" value={form.paymentDate} onChange={(event) => setForm((p) => ({ ...p, paymentDate: event.target.value }))} /></label>
              </div>
              <p className="modal__hint">La déclaration restera en attente avant validation et comptabilisation.</p>
              <div className="finance-total"><span>Montant calculé automatiquement</span><strong>{formatAr(form.months.length * 5000)}</strong></div>
            </div>
            <div className="modal__footer"><button type="button" className="button button--ghost" onClick={() => setFormOpen(false)}>Annuler</button><button type="submit" className="button button--primary" disabled={saving || !availabilityReady || Boolean(availabilityError)}>{saving ? 'Envoi…' : 'Déclarer'}</button></div>
          </form>
        </div>
      )}

    </div>
  );
}
