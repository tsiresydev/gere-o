# Données de test

Référence des comptes, données et scénarios utilisés pour les tests (unitaires, lint, build, E2E Atlas).

> **Sécrets** : `MONGODB_URI` et `JWT_SECRET` ne sont **jamais** listés ici. Ils restent uniquement dans `backend/.env` (gitignoré).

## Comptes de test (base Atlas `gere-o`)

| Compte | E-mail | Mot de passe | Rôle | MongoDB `_id` |
|---|---|---|---|---|
| Alice Testeur | `alice.testeur@exemple.fr` | `Motdepasse1` | `EMPLOYEE` | `6ac4ff462368f51475cceb1b` |
| RABEKOTO Tsiresy | `tsiresy.madasoftware@gmail.com` | défini par vous (non stocké en clair) | `ADMIN` | `6ac500f43c78e127c62aa20e` |

- Alice = compte de test E2E créé pendant les validations ; elle sert aussi de `MANAGER` **temporairement** (élévation de rôle via script seed, puis remise à `EMPLOYEE`).
- Aucun compte `MANAGER` permanent en base.

## État de la base (après E2E Sprint 6, 2026-10-07)

| Collection | Documents | Détail |
|---|---|---|
| `users` | 2 | Alice (EMPLOYEE), Tsiresy (ADMIN) |
| `leave_balances` | 2 | Tous en `userId` **string** : Admin `0/0`, Alice `0/0` (recréé automatiquement par le premier accès au solde/dashboard) |
| `leave_transactions` | 4 | 4 × `INIT` (Solde initial, amount 0) |
| `leave_requests` | 0 | nettoyé par le reset Sprint 5 |
| `work_days` | 2 | 2026-10-06 `COMPLETED` (Alice, 540 min), 2026-10-06 `COMPLETED` (Admin) — pointé dans la semaine en cours, visible sur le dashboard |

## Règles métier de référence

- Acquisition congés : **2,08 jours/mois** (mis à jour automatiquement à la lecture du solde selon `lastAccrualMonth`).
- Jours ouvrés : lundi → vendredi ; demi-journée : `durationDays = 0,5`.
- Solde : `availableDays = initialBalance + accruedDays − consumedDays − pendingDays`.
- `POST /api/leaves/balance/init` : réservé MANAGER/ADMIN (initialise le solde, transaction `INIT`).

## Scénarios E2E utilisés (sprints 4 et 5)

Login : `POST /api/auth/login` avec les comptes ci-dessus → `accessToken` (le **rôle est embarqué dans le JWT** : re-login obligatoire après changement de rôle).

### Sprint 4 — Solde de congés
- `GET /api/leaves/balance` sans solde → crée `initial=0` (EMPLOYEE).
- `POST /api/leaves/balance/init` sans solde → **400** « Solde de congés insuffisant ».
- `POST .../init` en EMPLOYEE → **403** « Rôle insuffisant » ; sans token → **401**.

### Sprint 5 — Workflow de validation
| Étape | Appel | Attendu |
|---|---|---|
| Seed | script temp : Alice → `MANAGER`, solde initial `10` | — |
| Création | `POST /api/leaves` `PAID`, `2026-10-12 → 2026-10-16`, `FULL_DAY` | `201`, `status=PENDING`, `durationDays=5` |
| File d'attente | `GET /api/leaves/pending` | liste enrichie `applicantName="Alice Testeur"` |
| Approbation | `PATCH /api/leaves/:id` `{"status":"APPROVED","comment":"E2E valide"}` | `200`, `decidedBy`/`decidedAt` renseignés |
| Solde | `GET /api/leaves/balance` | `pending=0, consumed=5, available=5` |
| Redécision | même `PATCH` | **409** « Seules les demandes en attente peuvent être traitées » |
| Refus | `POST` demande 2 (`2026-10-19 → 2026-10-20`, 2j) puis `PATCH` `{"status":"REJECTED","comment":"E2E refuse"}` | `200`, solde restitué (`available=5`, `consumed=5`) |
| Historique | `GET /api/leaves` | `status`, `decidedBy`, `decidedAt`, `comment` exposés |
| Annulation | `DELETE /api/leaves/:id` (demandeur uniquement) | `CANCELLED` + remboursement |
| RBAC | `GET /pending` + `PATCH` en `EMPLOYEE` | **403** « Rôle insuffisant » |

### Sprint 6 — Dashboard
| Étape | Appel | Attendu |
|---|---|---|
| Structure | `GET /api/dashboard` | `today`/`week`/`leaves`/`trends`(14j, 8 sem)/`stats`(30j) présents, `today.recorded=false` si non pointé |
| Pointage | `POST /api/work-days` (08:45→17:45, pause 13:00–14:00) puis re-`GET` | `today.workedMinutes=480`, `recorded=true`, `trends.daily[13]=480`, `week`/`stats` incrémentés |
| Solde congés | solde absent → premier `GET` | `leaves` tous à 0 (création automatique via `LeavesService.balance()`) |
| Sans token | `GET /api/dashboard` | **401** |
| Nettoyage | `DELETE /api/work-days/:id` | `today.recorded=false` repasse à `false` (les pointés antérieurs restent) |

## Commandes de test

```bash
# Backend (racine backend/)
npm test          # 119 tests, 7 suites (jest, testTimeout 30000)
npm run lint      # 0 erreur
npm run build     # dist/ propre

# Frontend (racine frontend/)
npm run lint      # 0 erreur
npm run build     # tsc + vite
npm run dev       # port 5173

# Serveur local
node dist/main.js # port 3000 (API sur http://localhost:3000/api)
```

## Pièges connus

- **Encodage** : toujours éditer les fichiers via l'outil d'édition (UTF-8) ; ne jamais utiliser `Set-Content` PowerShell (casse les accents).
- **Process Windows** : un serveur `node` lancé via `Start-Process` meurt en fin de session shell → lancer les E2E dans **une seule commande atomique** (démarrage → checks → arrêt). Ne jamais tuer globalement `Get-Process node`.
- **Redirections** : `RedirectStandardOutput` et `RedirectStandardError` doivent être deux fichiers distincts.
- **`userId` en Mixed** : les schémas stockent `userId` en **string** (pas ObjectId) ; toute donnée seed/manuelle doit écrire `String(_id)`, sinon le service ne la voit pas.
- **Seed E2E temporaire** : élève Alice en `MANAGER` + solde 10, mode `reset` pour restaurer (`EMPLOYEE`, suppression demandes/transactions non-INIT/soldes). Recréé à chaque sprint car supprimé après usage.
