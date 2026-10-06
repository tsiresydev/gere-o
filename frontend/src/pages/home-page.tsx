import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { api, ApiError } from '../services/api';
import { ROLE_LABELS, roleClass } from '../types/roles';
import type { User } from '../types/user';

export function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [members, setMembers] = useState<User[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  const loadingMembers = isAdmin && members === null && membersError === null;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;

    api<User[]>('/users')
      .then((list) => {
        if (!cancelled) {
          setMembers(list);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMembersError(
            err instanceof ApiError ? err.message : 'Impossible de charger les utilisateurs.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!user) {
    return null;
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">
          Bonjour {user.firstName} {user.lastName}
        </h1>
        <p className="page__subtitle">Votre espace de gestion du temps et des congés.</p>
      </div>

      <div className="grid">
        <section className="card">
          <h2 className="card__title">Utilisateur courant</h2>
          <dl className="details">
            <div className="details__row">
              <dt>Nom</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div className="details__row">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="details__row">
              <dt>Rôle</dt>
              <dd>
                <span className={`role-badge role-badge--${roleClass(user.role)}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </dd>
            </div>
            <div className="details__row">
              <dt>Identifiant</dt>
              <dd className="mono">{user.id}</dd>
            </div>
          </dl>
          <p className="card__note">Source : GET /api/auth/me</p>
        </section>

        <section className="card">
          <h2 className="card__title">Suivi du temps</h2>
          <p className="empty-state">
            L’enregistrement quotidien des heures (entrée, pause, sortie) arrivera avec le prochain
            sprint.
          </p>
        </section>

        <section className="card">
          <h2 className="card__title">Congés</h2>
          <p className="empty-state">
            Le solde de congés et les demandes seront disponibles lors du sprint dédié.
          </p>
        </section>

        {isAdmin && (
          <section className="card card--wide">
            <h2 className="card__title">Utilisateurs de l’entreprise</h2>
            <p className="card__note">Réservé au rôle Administrateur — GET /api/users</p>

            {loadingMembers && (
              <p className="empty-state" role="status">
                Chargement…
              </p>
            )}

            {membersError && (
              <div className="alert alert--error" role="alert">
                {membersError}
              </div>
            )}

            {!loadingMembers && !membersError && members?.length === 0 && (
              <p className="empty-state">Aucun utilisateur enregistré.</p>
            )}

            {members && members.length > 0 && (
              <ul className="user-list">
                {members.map((member) => (
                  <li key={member.id} className="user-list__item">
                    <span className="user-list__name">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="user-list__email">{member.email}</span>
                    <span className={`role-badge role-badge--${roleClass(member.role)}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
