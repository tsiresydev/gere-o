import { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  type: ToastType;
  text: string;
}

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const AUTO_DISMISS_MS = 6000;

/** Gère une notification éphémère, refermée automatiquement. */
export function useToast() {
  const [notice, setNotice] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const clear = useCallback(() => setNotice(null), []);

  return { notice, notify: setNotice, clear };
}

interface ToastProps {
  notice: ToastMessage | null;
  onClose: () => void;
}

export function Toast({ notice, onClose }: ToastProps) {
  if (!notice) {
    return null;
  }

  return (
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
        onClick={onClose}
        aria-label="Fermer la notification"
      >
        ×
      </button>
    </div>
  );
}
