import { useState, useCallback, useEffect } from 'react';
import { ApiError } from '../services/api';
import { reportService, type ReportPreview } from '../services/report.service';
import { formatDays } from '../utils/time';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const IconEnvelope = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 7 10-7" />
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconLeave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m22 2-7 20-4-9-9-4 20-7z" />
    <path d="M22 2 11 13" />
  </svg>
);

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const Spinner = () => (
  <span className="spinner" aria-hidden="true" />
);

export function MonthlyReportSection() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  // La notification disparaît automatiquement après quelques secondes.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Editable fields
  const [to, setTo] = useState('kevin.doste@madasoftware.com');
  const [cc, setCc] = useState('voarizara@gmail.com');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    setPreview(null);
    try {
      const data = await reportService.preview(year, month);
      setPreview(data);
      setTo(data.to);
      setCc(data.cc ?? '');
      setSubject(data.subject);
      setMessage(data.message);
      setView('edit');
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Impossible de générer le récapitulatif.',
      });
    } finally {
      setLoading(false);
    }
  }, [year, month, setLoading, setNotice, setPreview, setTo, setCc, setSubject, setMessage, setView]);

  const handleSend = useCallback(async () => {
    if (!preview) return;
    setSending(true);
    setNotice(null);
    try {
      const result = await reportService.send({
        year,
        month,
        to,
        cc: cc || undefined,
        subject,
        message,
      });
      if (result.success) {
        setShowConfirm(false);
        setNotice({
          type: 'success',
          text: to
            ? `Email envoyé avec succès à ${to}.`
            : 'Email envoyé avec succès.',
        });
      } else {
        setNotice({ type: 'error', text: result.error ?? "Échec de l'envoi de l'email." });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof ApiError ? err.message : "Échec de l'envoi de l'email.",
      });
    } finally {
      setSending(false);
    }
  }, [preview, year, month, to, cc, subject, message, setSending, setNotice, setShowConfirm]);

  return (
    <section className="card card--wide report-card" aria-label="Récapitulatif mensuel par email">
      <div className="report-header">
        <div className="report-header__icon">
          <IconEnvelope />
        </div>
        <div className="report-header__text">
          <h2 className="report-header__title">Récapitulatif mensuel par email</h2>
          <p className="report-header__desc">
            Générez et envoyez le récapitulatif de vos jours travaillés et de vos congés à votre responsable.
          </p>
        </div>
      </div>

      {/* Sélection de la période */}
      <div className="report-period">
        <div className="report-period__field">
          <label className="field__label" htmlFor="report-month">
            Mois
          </label>
          <select
            id="report-month"
            className="input"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="report-period__field report-period__field--year">
          <label className="field__label" htmlFor="report-year">
            Année
          </label>
          <select
            id="report-year"
            className="input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button button--primary report-generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? <><Spinner /> Génération…</> : <><IconCalendar /> Générer</>}
        </button>
      </div>

      {/* Aperçu et édition */}
      {preview && (
        <div className="report-preview">
          <div className="report-preview__top">
            <h3 className="report-preview__title">
              {preview.monthLabel}
            </h3>
            <div className="report-view-toggle" role="tablist" aria-label="Mode d'affichage">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'edit'}
                className={`report-view-toggle__btn${view === 'edit' ? ' report-view-toggle__btn--active' : ''}`}
                onClick={() => setView('edit')}
              >
                Édition
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'preview'}
                className={`report-view-toggle__btn${view === 'preview' ? ' report-view-toggle__btn--active' : ''}`}
                onClick={() => setView('preview')}
              >
                Aperçu
              </button>
            </div>
          </div>

          <div className="report-preview__stats">
            <div className="report-stat">
              <span className="report-stat__icon report-stat__icon--worked">
                <IconCheck />
              </span>
              <span className="report-stat__value">{preview.workedDays}</span>
              <span className="report-stat__label">Jours travaillés</span>
            </div>
            <div className="report-stat">
              <span className="report-stat__icon report-stat__icon--leave">
                <IconLeave />
              </span>
              <span className="report-stat__value">{formatDays(preview.totalLeaveDays)}</span>
              <span className="report-stat__label">Congés pris</span>
            </div>
          </div>

          {view === 'edit' ? (
            <form className="form" onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }} noValidate>
              <div className="report-fields">
                <div className="field">
                  <label className="field__label" htmlFor="report-from">
                    De
                  </label>
                  <div className="input-readonly">
                    <IconLock />
                    <input
                      id="report-from"
                      type="email"
                      className="input"
                      value={preview.from}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="report-to">
                    À
                  </label>
                  <input
                    id="report-to"
                    type="email"
                    className="input"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="report-cc">
                    CC
                  </label>
                  <input
                    id="report-cc"
                    type="email"
                    className="input"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="report-subject">
                    Objet
                  </label>
                  <input
                    id="report-subject"
                    type="text"
                    className="input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="report-message">
                  Message
                </label>
                <textarea
                  id="report-message"
                  className="input"
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="report-send-row">
                <button
                  type="submit"
                  className="button button--primary report-send-btn"
                  disabled={sending || !to || !subject || !message}
                >
                  {sending ? <><Spinner /> Envoi…</> : <><IconSend /> Envoyer l'email</>}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="report-email-preview">
                <div className="report-email-preview__head">
                  <div className="report-email-preview__row">
                    <span className="report-email-preview__label">De</span>
                    <span className="report-email-preview__value">{preview.from}</span>
                  </div>
                  <div className="report-email-preview__row">
                    <span className="report-email-preview__label">À</span>
                    <span className="report-email-preview__value">{to}</span>
                  </div>
                  {cc && (
                    <div className="report-email-preview__row">
                      <span className="report-email-preview__label">CC</span>
                      <span className="report-email-preview__value">{cc}</span>
                    </div>
                  )}
                  <div className="report-email-preview__row">
                    <span className="report-email-preview__label">Objet</span>
                    <span className="report-email-preview__value report-email-preview__value--subject">{subject}</span>
                  </div>
                </div>
                <div className="report-email-preview__body">
                  {message.split('\n').map((line, i) => {
                    if (line === '') return <br key={i} />;
                    const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                  })}
                </div>
              </div>

              <div className="report-send-row">
                <button
                  type="button"
                  className="button button--primary report-send-btn"
                  onClick={() => setShowConfirm(true)}
                  disabled={sending || !to || !subject || !message}
                >
                  {sending ? <><Spinner /> Envoi…</> : <><IconSend /> Envoyer l'email</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de confirmation */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 id="confirm-modal-title" className="modal__title">Confirmer l'envoi ?</h2>
              <button type="button" className="modal__close" onClick={() => setShowConfirm(false)} aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="modal__body">
              <p className="modal__hint">Vérifiez les destinataires et le contenu avant de confirmer.</p>
              <dl className="details">
                <div className="details__row">
                  <dt>Expéditeur</dt>
                  <dd>{preview?.from}</dd>
                </div>
                <div className="details__row">
                  <dt>Destinataire</dt>
                  <dd>{to}</dd>
                </div>
                <div className="details__row">
                  <dt>Copie (CC)</dt>
                  <dd>{cc || '—'}</dd>
                </div>
                <div className="details__row">
                  <dt>Période</dt>
                  <dd>{preview?.monthLabel}</dd>
                </div>
              </dl>
            </div>
            <div className="modal__footer">
              <button type="button" className="button button--ghost" onClick={() => setShowConfirm(false)} disabled={sending}>
                Annuler
              </button>
              <button type="button" className="button button--primary" onClick={handleSend} disabled={sending}>
                {sending ? <><Spinner /> Envoi…</> : <><IconSend /> Confirmer et envoyer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification d'envoi */}
      {notice && (
        <div
          className={`toast toast--${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
          aria-live={notice.type === 'error' ? 'assertive' : 'polite'}
        >
          <span className="toast__icon" aria-hidden="true">
            {notice.type === 'success' ? <IconCheck /> : <IconAlert />}
          </span>
          <p className="toast__text">{notice.text}</p>
          <button
            type="button"
            className="toast__close"
            onClick={() => setNotice(null)}
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
}
