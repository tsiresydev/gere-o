import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { ApiError } from '../services/api';

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(from, { replace: true });
    }
  }, [status, from, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Connexion impossible. Veuillez réessayer.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="app-brand app-brand--large">Gere-o</span>
        <h1 className="auth-title">Connexion</h1>
        <p className="auth-subtitle">Accédez à votre espace de suivi du temps.</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor="login-email">
              Adresse email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="button button--block" disabled={submitting}>
            {submitting ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-footer">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
