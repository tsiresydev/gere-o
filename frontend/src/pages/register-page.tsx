import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { ApiError } from '../services/api';

export function RegisterPage() {
  const { register, status } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);

    try {
      await register({ firstName, lastName, email, password });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Création du compte impossible. Veuillez réessayer.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="app-brand app-brand--large">Gere-o</span>
        <h1 className="auth-title">Créer un compte</h1>
        <p className="auth-subtitle">Votre compte collaborateur est créé en quelques secondes.</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="register-firstname">
                Prénom
              </label>
              <input
                id="register-firstname"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                className="input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="register-lastname">
                Nom
              </label>
              <input
                id="register-lastname"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                className="input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-email">
              Adresse email
            </label>
            <input
              id="register-email"
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
            <label className="field__label" htmlFor="register-password">
              Mot de passe
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="field__hint">8 caractères minimum.</span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-confirmation">
              Confirmation du mot de passe
            </label>
            <input
              id="register-confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>

          <button type="submit" className="button button--block" disabled={submitting}>
            {submitting ? 'Création en cours…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
