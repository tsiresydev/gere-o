import type { CSSProperties, ReactNode } from 'react';
import { CONTRIBUTION_STATUS_LABELS } from '../types/contribution';
import type { ContributionStatus } from '../types/contribution';

export const formatAr = (amount: number): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} Ar`;

export function StatusBadge({ status }: { status: ContributionStatus }) {
  const modifier = status
    .toLowerCase()
    .replace(/_/g, '-')
    .replace('en-attente-de-validation', 'attente');
  return (
    <span className={`finance-status finance-status--${modifier}`}>
      {CONTRIBUTION_STATUS_LABELS[status]}
    </span>
  );
}

export function FinanceBarChart({
  points,
}: {
  points: Array<{ label: string; contributions: number; expenses: number }>;
}) {
  const scale = Math.max(
    1,
    ...points.map((point) => Math.max(point.contributions, point.expenses)),
  );

  return (
    <div className="finance-bars" role="img" aria-label="Entrées et sorties par mois">
      <div className="finance-bars__legend">
        <span><i className="finance-dot finance-dot--in" /> Cotisations</span>
        <span><i className="finance-dot finance-dot--out" /> Dépenses</span>
      </div>
      <div className="finance-bars__plot">
        {points.map((point) => (
          <div className="finance-bars__group" key={point.label} title={`${point.label} : ${formatAr(point.contributions)} entrés, ${formatAr(point.expenses)} sortis`}>
            <div className="finance-bars__pair">
              <span className="finance-bars__bar finance-bars__bar--in" style={{ height: `${Math.round((point.contributions / scale) * 100)}%` }} />
              <span className="finance-bars__bar finance-bars__bar--out" style={{ height: `${Math.round((point.expenses / scale) * 100)}%` }} />
            </div>
            <span className="finance-bars__label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinanceDonut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;
  const stops = segments
    .map((segment) => {
      const start = total > 0 ? (offset / total) * 100 : 0;
      offset += segment.value;
      const end = total > 0 ? (offset / total) * 100 : 0;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');
  const style = {
    background: total > 0 ? `conic-gradient(${stops})` : '#e2e8f0',
  } as CSSProperties;

  return (
    <div className="finance-donut-wrap">
      <div className="finance-donut" style={style} role="img" aria-label={centerLabel}>
        <div className="finance-donut__inner">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="finance-legend">
        {segments.length === 0 && <li>Aucune dépense enregistrée</li>}
        {segments.map((segment) => (
          <li key={segment.label}>
            <i style={{ background: segment.color }} aria-hidden="true" />
            <span>{segment.label}</span>
            <strong>{formatAr(segment.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FinancePagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <nav className="finance-pagination" aria-label="Pagination">
      <button type="button" className="button button--ghost button--small" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Précédent
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className="finance-pagination__page"
          aria-current={item === page ? 'page' : undefined}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
      <button type="button" className="button button--ghost button--small" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Suivant
      </button>
    </nav>
  );
}

export function EmptyFinance({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="finance-empty">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Confirmer',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal__body">{children}</div>
        <div className="modal__footer">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="button" className="button button--primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Traitement…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
