import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../services/api';
import { contributionsService } from '../../services/contributions.service';
import type { ContributionRow, FinanceOverview } from '../../types/contribution';
import { FinanceBarChart, FinanceDonut, formatAr } from '../../components/finance-ui';
import { CATEGORIE_COLORS } from '../../types/contribution';

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function ContributionsDashboardPage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [pending, setPending] = useState<ContributionRow[]>([]);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      contributionsService.overview(year, month),
      contributionsService.list({ status: 'EN_ATTENTE_DE_VALIDATION', limit: 5 }),
    ])
      .then(([data, rows]) => {
        if (!cancelled) {
          setOverview(data);
          setPending(rows.items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Impossible de charger la caisse.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(1, currentYear - 2026 + 1) },
    (_, index) => 2026 + index,
  );

  if (loading) {
    return <div className="page page-loading"><p>Chargement de la caisse…</p></div>;
  }
  if (error || !overview) {
    return <div className="page"><div className="alert alert--error">{error ?? 'Données indisponibles'}</div></div>;
  }

  const collectedPercent = overview.totalExpected > 0
    ? Math.round((overview.totalCollected / overview.totalExpected) * 100)
    : 0;

  return (
    <div className="page finance-page">
      <header className="page-header">
        <div>
          <span className="page__eyebrow">Caisse commune</span>
          <h1>Tableau de bord financier</h1>
          <p className="page-header__subtitle">Situation en temps réel de la caisse et des cotisations.</p>
        </div>
        <div className="finance-filters">
          <label className="field">
            <span className="field__label">Année</span>
            <select
              className="input"
              value={year ?? ''}
              onChange={(event) => setYear(event.target.value ? Number(event.target.value) : undefined)}
            >
              <option value="">Toutes les années</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Mois</span>
            <select
              className="input"
              value={month ?? ''}
              onChange={(event) => setMonth(event.target.value ? Number(event.target.value) : undefined)}
            >
              <option value="">Tous les mois</option>
              {FRENCH_MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card kpi-card--violet">
          <div className="kpi-card__top"><span className="kpi-card__label">Solde de la caisse</span><span className="kpi-card__icon">Ar</span></div>
          <strong className="kpi-card__value">{formatAr(overview.balance)}</strong>
          <p className="kpi-card__note">Entrées validées − sorties enregistrées</p>
        </article>
        <article className="kpi-card">
          <div className="kpi-card__top"><span className="kpi-card__label">Cotisations encaissées</span><span className="kpi-card__icon">↓</span></div>
          <strong className="kpi-card__value">{formatAr(overview.totalCollected)}</strong>
          <div className="kpi-progress">
            <span className="kpi-progress__track"><span className="kpi-progress__fill" style={{ width: `${collectedPercent}%` }} /></span>
            <span className="kpi-progress__meta"><span>{collectedPercent} % de l’attendu</span><span>{formatAr(overview.totalExpected)}</span></span>
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-card__top"><span className="kpi-card__label">Montant attendu</span><span className="kpi-card__icon">○</span></div>
          <strong className="kpi-card__value">{formatAr(overview.totalExpected)}</strong>
          <p className="kpi-card__note">Sur la période sélectionnée</p>
        </article>
        <article className="kpi-card kpi-card--warm">
          <div className="kpi-card__top"><span className="kpi-card__label">Dépenses</span><span className="kpi-card__icon">↑</span></div>
          <strong className="kpi-card__value">{formatAr(overview.totalExpenses)}</strong>
          <p className="kpi-card__note">Sorties comptabilisées sur la période</p>
        </article>
        <article className="kpi-card kpi-card--dark">
          <div className="kpi-card__top"><span className="kpi-card__label">En retard</span><span className="kpi-card__icon">!</span></div>
          <strong className="kpi-card__value">{overview.lateMembers}</strong>
          <p className="kpi-card__note">Membres avec une période non réglée</p>
        </article>
      </section>

      <section className="finance-grid">
        <article className="card">
          <div className="section-head">
            <div><h2 className="section-head__title">Entrées et sorties mensuelles</h2><p className="section-head__subtitle">Comparaison des flux validés</p></div>
          </div>
          <FinanceBarChart points={overview.monthly.slice(-12)} />
        </article>
        <article className="card">
          <div className="section-head">
            <div><h2 className="section-head__title">Dépenses par catégorie</h2><p className="section-head__subtitle">Répartition du total des sorties</p></div>
          </div>
          <FinanceDonut
            segments={overview.categories.map((item, index) => ({
              label: item.category,
              value: item.amount,
              color: CATEGORIE_COLORS[index % CATEGORIE_COLORS.length],
            }))}
            centerLabel="Total dépenses"
            centerValue={formatAr(overview.totalExpenses)}
          />
        </article>
      </section>

      <section className="card">
        <div className="section-head">
          <div><h2 className="section-head__title">Déclarations en attente</h2><p className="section-head__subtitle">{overview.pendingCount} paiement(s) à valider</p></div>
          <Link className="button button--ghost button--small" to="/cotisations/cotisations">Voir toutes les cotisations</Link>
        </div>
        {pending.length === 0 ? (
          <p className="finance-empty-inline">Aucune déclaration en attente de validation.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Membre</th><th>Période</th><th>Montant déclaré</th><th>Date de déclaration</th></tr></thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.memberName}</strong><br /><span className="card__note">{row.memberEmail}</span></td>
                    <td>{row.monthLabel}</td>
                    <td className="data-table__value">{formatAr(row.declaredAmount)}</td>
                    <td>{row.declaredAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
