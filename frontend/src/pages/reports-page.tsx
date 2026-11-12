import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';
import {
  reportService,
  type SentReportDetail,
  type SentReportSummary,
} from '../services/report.service';
import { EmailMessage } from '../components/email-message';
import { MonthlyReportSection } from '../components/monthly-report-section';
import { Toast, useToast } from '../components/toast';

const PAGE_SIZE = 10;

type Tab = 'new' | 'history';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatNumber = (value: number): string =>
  String(Math.round(value * 100) / 100).replace('.', ',');

const formatDayCount = (value: number): string =>
  `${formatNumber(value)} ${value > 1 ? 'jours' : 'jour'}`;

const formatSentAt = (isoDate: string): string => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
};

const buildPageItems = (
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, currentPage - 2);
  const end = Math.min(totalPages - 1, currentPage + 2);

  if (start > 2) {
    items.push('ellipsis');
  }
  for (let pageNumber = start; pageNumber <= end; pageNumber++) {
    items.push(pageNumber);
  }
  if (end < totalPages - 1) {
    items.push('ellipsis');
  }
  items.push(totalPages);

  return items;
};

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('new');
  const { notice, notify, clear } = useToast();

  const [reports, setReports] = useState<SentReportSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const historyRef = useRef<HTMLElement>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<SentReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const loadReports = useCallback(async (targetPage: number) => {
    setLoading(true);
    setListError(null);

    try {
      const data = await reportService.list({ page: targetPage, limit: PAGE_SIZE });
      setReports(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Impossible de charger l'historique.",
      );
    } finally {
      setLoading(false);
    }
  }, [setLoading, setListError, setPage, setReports, setTotal]);

  useEffect(() => {
    let cancelled = false;

    reportService
      .list({ page: 1, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setReports(data.items);
        setTotal(data.total);
        setPage(data.page);
        setListError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setListError(
          err instanceof ApiError ? err.message : "Impossible de charger l'historique.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSent = useCallback(() => {
    setTab('history');
    void loadReports(1);
  }, [loadReports]);

  const openDetail = useCallback(async (id: string) => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    setDetail(null);
    setDetailError(null);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      setDetail(await reportService.get(id));
    } catch (err) {
      setDetailError(
        err instanceof ApiError ? err.message : 'Impossible de charger ce rapport.',
      );
    } finally {
      setDetailLoading(false);
    }
  }, [setDetail, setDetailError, setDetailLoading, setDetailOpen]);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
  }, [setDetailOpen]);

  useEffect(() => {
    if (!detailOpen) return;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetail();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      lastTriggerRef.current?.focus();
      lastTriggerRef.current = null;
    };
  }, [detailOpen, closeDetail]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = buildPageItems(page, totalPages);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (loading || targetPage < 1 || targetPage > totalPages || targetPage === page) {
        return;
      }

      void loadReports(targetPage).then(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        historyRef.current?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    },
    [loading, loadReports, page, totalPages],
  );

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Rapports</h1>
        <p className="page__subtitle">
          Générez, envoyez et consultez vos récapitulatifs mensuels par e-mail.
        </p>
      </div>

      <div className="report-tabs" role="tablist" aria-label="Sections des rapports">
        <button
          type="button"
          role="tab"
          id="report-tab-new"
          aria-selected={tab === 'new'}
          aria-controls="report-panel-new"
          className={`report-tabs__btn${tab === 'new' ? ' report-tabs__btn--active' : ''}`}
          onClick={() => setTab('new')}
        >
          Nouveau rapport
        </button>
        <button
          type="button"
          role="tab"
          id="report-tab-history"
          aria-selected={tab === 'history'}
          aria-controls="report-panel-history"
          className={`report-tabs__btn${tab === 'history' ? ' report-tabs__btn--active' : ''}`}
          onClick={() => setTab('history')}
        >
          Historique
          {total > 0 && <span className="report-tabs__count">{total}</span>}
        </button>
      </div>

      {tab === 'new' ? (
        <div
          role="tabpanel"
          id="report-panel-new"
          aria-labelledby="report-tab-new"
          className="report-tab-panel"
        >
          <MonthlyReportSection onSent={handleSent} notify={notify} />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="report-panel-history"
          aria-labelledby="report-tab-history"
          className="report-tab-panel"
        >
          <section
            ref={historyRef}
            className="card report-history-card"
            aria-label="Historique des rapports envoyés"
            aria-busy={loading}
          >
            <div className="report-history__head">
              <div>
                <h2 className="card__title">Rapports envoyés</h2>
                <p className="report-history__desc">
                  Chaque envoi est archivé tel qu'il a été expédié.
                  {totalPages > 1 && ` Page ${page} sur ${totalPages}.`}
                </p>
              </div>
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => void loadReports(page)}
                disabled={loading}
              >
                {loading ? 'Chargement…' : 'Actualiser'}
              </button>
            </div>

            {listError && (
              <div className="alert alert--error" role="alert">
                <span>{listError}</span>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => void loadReports(page)}
                >
                  Réessayer
                </button>
              </div>
            )}

            {loading && reports === null && (
              <div className="report-history__skeleton" role="status" aria-label="Chargement de l'historique">
                <span />
                <span />
                <span />
              </div>
            )}

            {!loading && !listError && reports?.length === 0 && (
              <div className="empty-state report-history__empty">
                <p>Aucun rapport envoyé pour le moment.</p>
                <p className="empty-state__hint">
                  Générez votre premier récapitulatif puis envoyez-le : il apparaîtra ici.
                </p>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => setTab('new')}
                >
                  Créer mon premier rapport
                </button>
              </div>
            )}

            {reports !== null && reports.length > 0 && (
              <ul className="report-history">
                {reports.map((report) => (
                  <li key={report.id} className="report-history__item">
                    <div className="report-history__main">
                      <div className="report-history__top">
                        <span className="report-history__month">{report.monthLabel}</span>
                        <span className="badge badge--ok">Envoyé</span>
                      </div>
                      <p className="report-history__recipients">
                        À {report.to}
                        {report.cc ? ` · CC ${report.cc}` : ''}
                      </p>
                      <p className="report-history__meta">
                        {formatSentAt(report.createdAt)} · {formatDayCount(report.workedDays)}{' '}
                        {report.workedDays > 1 ? 'travaillés' : 'travaillé'} ·{' '}
                        {formatDayCount(report.totalLeaveDays)} de congés
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button--ghost button--small report-history__action"
                      onClick={() => void openDetail(report.id)}
                    >
                      Consulter
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {reports !== null && reports.length > 0 && totalPages > 1 && (
              <nav className="report-pagination" aria-label="Pagination de l'historique">
                <button
                  type="button"
                  className="report-pagination__btn"
                  onClick={() => goToPage(page - 1)}
                  disabled={loading || page <= 1}
                  aria-label="Page précédente"
                >
                  ‹
                </button>

                {pageItems.map((item, index) =>
                  item === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="report-pagination__ellipsis"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className="report-pagination__btn"
                      aria-current={item === page ? 'page' : undefined}
                      onClick={() => goToPage(item)}
                      disabled={loading}
                      aria-label={`Page ${item}`}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  className="report-pagination__btn"
                  onClick={() => goToPage(page + 1)}
                  disabled={loading || page >= totalPages}
                  aria-label="Page suivante"
                >
                  ›
                </button>
              </nav>
            )}
          </section>
        </div>
      )}

      {detailOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeDetail}
        >
          <div
            ref={dialogRef}
            className="modal modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <h2 id="report-detail-title" className="modal__title">
                {detail ? `Rapport — ${detail.monthLabel}` : 'Rapport envoyé'}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                className="modal__close"
                onClick={closeDetail}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="modal__body">
              {detailLoading && (
                <p className="empty-state" role="status">
                  Chargement du rapport…
                </p>
              )}

              {detailError && (
                <div className="alert alert--error" role="alert">
                  {detailError}
                </div>
              )}

              {detail && (
                <>
                  <dl className="details report-detail__meta">
                    <div className="details__row">
                      <dt>Envoyé le</dt>
                      <dd>{formatSentAt(detail.createdAt)}</dd>
                    </div>
                    <div className="details__row">
                      <dt>De</dt>
                      <dd>{detail.from}</dd>
                    </div>
                    <div className="details__row">
                      <dt>À</dt>
                      <dd>{detail.to}</dd>
                    </div>
                    <div className="details__row">
                      <dt>CC</dt>
                      <dd>{detail.cc || '—'}</dd>
                    </div>
                    <div className="details__row">
                      <dt>Objet</dt>
                      <dd>{detail.subject}</dd>
                    </div>
                    {detail.messageId && (
                      <div className="details__row">
                        <dt>Message ID</dt>
                        <dd className="mono">{detail.messageId}</dd>
                      </div>
                    )}
                  </dl>

                  <EmailMessage text={detail.message} className="report-detail__body" />
                </>
              )}
            </div>

            <div className="modal__footer">
              <button type="button" className="button button--primary" onClick={closeDetail}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast notice={notice} onClose={clear} />
    </div>
  );
}
