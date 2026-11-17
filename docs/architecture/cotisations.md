# Module Cotisations — architecture

## Backend

Nouveau module NestJS `src/contributions/`, enregistré dans `AppModule`.

### Collections MongoDB

| Collection | Rôle | Index notables |
|---|---|---|
| `contribution_members` | Membres de la caisse | `email` unique, `userId` unique partiel |
| `contributions` | Une période mensuelle déclarée | unique partiel `{memberId, periodYear, periodMonth}` sur les statuts non `REFUSE`, index `{periodYear, periodMonth, status}`, `{declarationGroupId}` |
| `expenses` | Dépenses de la caisse | `{createdAt:-1}`, `{category:1}` |
| `cash_transactions` | Journal des mouvements | unique `{contributionId}` et `{expenseId}` (partiels), `{createdAt:-1}`, `{type:1}` |
| `notification_logs` | Outbox des emails | `{status:1, createdAt:1}`, `{referenceId:1}` |
| `expense_categories` | Catégories administrables | `name` unique |

Les montants sont des entiers en Ariary.

### Calcul du solde

Le solde n’est jamais stocké arbitrairement : il est calculé par agrégation des `cash_transactions` (`IN − OUT`). Les écritures financières et le log de notification sont créés dans une transaction MongoDB. Un index unique sur `contributionId` / `expenseId` empêche la double comptabilisation.

### Endpoints REST (préfixe `/api`, JWT requis)

| Méthode | Route | Droit | Description |
|---|---|---|---|
| GET | `/contributions/overview` | Lecture | KPI, graphiques, répartition |
| GET | `/contributions/members` | Lecture | Liste des membres |
| POST | `/contributions/members` | Validateur | Ajouter un membre |
| PATCH | `/contributions/members/:id` | Validateur | Activer/désactiver un membre |
| GET | `/contributions` | Lecture | Cotisations filtrées, périodes attendues incluses |
| POST | `/contributions` | Employé sur soi / validateur | Déclarer un ou plusieurs mois |
| GET | `/contributions/me` | Lecture | Situation personnelle |
| PATCH | `/contributions/:id/validate` | Validateur | Valider |
| PATCH | `/contributions/:id/reject` | Validateur | Refuser |
| GET | `/contributions/expenses` | Lecture | Liste des dépenses |
| POST | `/contributions/expenses` | Validateur | Enregistrer une dépense |
| GET | `/contributions/journal` | Lecture | Journal de caisse |
| POST | `/contributions/journal/correct` | Validateur | Correction tracée |
| GET | `/contributions/categories` | Lecture | Catégories |
| POST | `/contributions/categories` | Validateur | Créer une catégorie |
| PATCH | `/contributions/categories/:id` | Validateur | Activer/désactiver |
| GET | `/contributions/notifications` | Validateur | Journal des notifications |
| POST | `/contributions/notifications/:id/retry` | Validateur | Relancer un envoi |

### Emails

`NotificationsService` construit le message, insère un `NotificationLog` `PENDING` dans la transaction métier, puis tente l’envoi via `EmailService`. En cas d’échec : statut `FAILED`, `attempts` incrémenté, `errorMessage` conservé. Un processeur relance les logs en échec (maximum 5 tentatives), sans security doubler un envoi réussi.

Aucun email n’est envoyé pour un formulaire abandonné, un enregistrement échoué ou une validation.

## Frontend

Routes sous `/cotisations` (imbriquées dans `ProtectedRoute` + `AppLayout`) :

- `/cotisations` — tableau de bord financier
- `/cotisations/cotisations` — suivi et déclaration
- `/cotisations/depenses` — dépenses
- `/cotisations/membres` — membres
- `/cotisations/journal` — historique de la caisse

Le rail d’icônes existant gagne une entrée « Cotisations » avec sous-menu (flyout desktop, section dépliante mobile). Les composants et tokens CSS existants sont réutilisés : `.card`, `.button`, `.field`, `.modal`, `.table-wrap`, `.data-table`, `.badge`, `.toast`, palette violette `--violet-*`.

Graphiques sans nouvelle dépendance : barres CSS et donut CSS, avec valeurs textuelles adjacentes (minimum de 4,5:1, pas de couleur seule pour le statut).
