# API — Gestion du temps et des congés

## Vue d'ensemble

L'API est une **API REST** exposée par le backend NestJS. Tous les endpoints sont préfixés par `/api`.

Toutes les requêtes nécessitent une **authentification JWT** via le header :

```
Authorization: Bearer <token>
```

L'autorisation est gérée par rôle (`EMPLOYEE`, `MANAGER`, `ADMIN`). Les endpoints de modification des congés nécessitent le rôle `MANAGER` ou `ADMIN`.

## Work Days — Gestion du temps

> **État Sprint 2** : CRUD + calculs + résumé quotidien implémentés.
> Les résumés hebdomadaire/mensuel et les filtres de liste sont prévus au **Sprint 3**.

### Routes

```
GET    /api/work-days
POST   /api/work-days
GET    /api/work-days/:id
PATCH  /api/work-days/:id
DELETE /api/work-days/:id

GET    /api/work-days/summary/daily
GET    /api/work-days/summary/weekly
GET    /api/work-days/summary/monthly
```

### Détails

#### `GET /api/work-days`

Liste les journées de travail de l'utilisateur connecté, de la plus récente à la plus ancienne. Réponse **paginée**.

**Paramètres de query** (optionnels) :
- `startDate` (date ISO, borne inférieure)
- `endDate` (date ISO, borne supérieure)
- `page` (nombre, défaut : 1)
- `limit` (nombre, défaut : 20, max : 100)

**Réponse** :

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "date": "2026-10-06",
      "entryTime": "08:45",
      "breakStart": "13:00",
      "breakEnd": "14:00",
      "exitTime": "17:45",
      "expectedMinutes": 480,
      "workedMinutes": 480,
      "balanceMinutes": 0,
      "status": "COMPLETED",
      "createdAt": "2026-10-06T08:45:00.000Z",
      "updatedAt": "2026-10-06T17:45:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### `POST /api/work-days`

Crée une nouvelle journée de travail.

**Body** :

```json
{
  "date": "2026-10-06",
  "entryTime": "08:45",
  "breakStart": "13:00",
  "breakEnd": "14:00",
  "exitTime": "17:45"
}
```

**Réponse** : objet `WorkDay` créé.

#### `GET /api/work-days/:id`

Récupère une journée par son identifiant.

**Réponse** : objet `WorkDay`.

#### `PATCH /api/work-days/:id`

Met à jour une journée existante.

**Body** (tous les champs optionnels) :

```json
{
  "entryTime": "09:00",
  "breakStart": "13:00",
  "breakEnd": "14:00",
  "exitTime": "18:00"
}
```

**Réponse** : objet `WorkDay` mis à jour.

#### `DELETE /api/work-days/:id`

Supprime une journée.

**Réponse** : `204 No Content`.

#### `GET /api/work-days/summary/daily`

Récupère le résumé quotidien.

**Paramètres de query** :
- `date` (date ISO, défaut : date du jour)

**Réponse** :

```json
{
  "date": "2026-10-06",
  "workedMinutes": 480,
  "expectedMinutes": 480,
  "balanceMinutes": 0
}
```

#### `GET /api/work-days/summary/weekly`

Récupère le résumé hebdomadaire. Totalise les journées **terminées** (`COMPLETED`) du lundi au dimanche de la semaine contenant `weekStart`.

**Paramètres de query** :
- `weekStart` (date ISO, défaut : semaine courante) — une date quelconque de la semaine, normalisée vers le **lundi** de celle-ci

**Réponse** :

```json
{
  "weekStart": "2026-10-05",
  "expectedMinutes": 2400,
  "workedMinutes": 2460,
  "balanceMinutes": 60
}
```

#### `GET /api/work-days/summary/monthly`

Récupère le résumé mensuel. Totalise les journées **terminées** (`COMPLETED`) du mois. L'objectif correspond aux **jours ouvrés** du mois (lundi → vendredi) × 480 min ; les jours fériés ne sont pas déduits.

**Paramètres de query** :
- `year` (nombre, défaut : année courante)
- `month` (nombre 1-12, défaut : mois courant)

**Réponse** (octobre 2026 = 22 jours ouvrés) :

```json
{
  "year": 2026,
  "month": 10,
  "expectedMinutes": 10560,
  "workedMinutes": 9600,
  "balanceMinutes": -960
}
```

## Leaves — Gestion des congés

### Routes

```
GET    /api/leaves
POST   /api/leaves
GET    /api/leaves/:id
PATCH  /api/leaves/:id             (MANAGER / ADMIN)
DELETE /api/leaves/:id

GET    /api/leaves/pending         (MANAGER / ADMIN)
GET    /api/leaves/balance
POST   /api/leaves/balance/init    (MANAGER / ADMIN)
GET    /api/leaves/history
```

### Détails

#### `GET /api/leaves`

Liste les demandes de congé de l'utilisateur connecté, de la plus récente à la plus ancienne.

**Réponse** :

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "leaveType": "PAID",
    "reason": "Congés annuels",
    "startDate": "2026-10-12",
    "endDate": "2026-10-16",
    "durationType": "FULL_DAY",
    "durationDays": 5.0,
    "status": "APPROVED",
    "comment": "Congés validés",
    "decidedBy": "uuid",
    "decidedAt": "2026-10-07T14:00:00.000Z"
  }
]
```

`decidedBy`, `decidedAt` et `comment` ne sont renseignés qu'après une décision.

#### `POST /api/leaves`

Crée une demande de congé. La durée en jours est **calculée côté backend** :

- `FULL_DAY` : nombre de **jours ouvrés** (lun → ven) entre `startDate` et `endDate` inclus ;
- `HALF_DAY_MORNING` / `HALF_DAY_AFTERNOON` : `0,5` jour (`startDate` doit être égal à `endDate`).

Le montant est réservé sur le solde (`pendingDays`) et la demande reçoit le statut `PENDING`. Une demande est refusée si le solde disponible est insuffisant (400).

**Body** :

```json
{
  "leaveType": "PAID",
  "reason": "Congés annuels",
  "startDate": "2026-10-12",
  "endDate": "2026-10-16",
  "durationType": "FULL_DAY"
}
```

`durationType` accepte : `FULL_DAY`, `HALF_DAY_MORNING`, `HALF_DAY_AFTERNOON`.

**Réponse** : objet `LeaveRequest` créé avec statut `PENDING`.

#### `GET /api/leaves/:id`

Récupère une demande de congé par son identifiant (404 si elle appartient à un autre utilisateur).

**Réponse** : objet `LeaveRequest`.

#### `DELETE /api/leaves/:id`

**Annule** une demande encore `PENDING` (204) et restitue le montant sur le solde. La demande passe au statut `CANCELLED` (conservée dans l'historique). Refus 409 si la demande a déjà été traitée, 404 si elle appartient à un autre utilisateur.

#### `GET /api/leaves/pending`

Liste **toutes** les demandes encore `PENDING`, tous utilisateurs confondus (vue de validation côté manager). **Réservé aux `MANAGER` / `ADMIN`** (403 sinon).

Chaque demande est enrichie de `applicantName` (prénom + nom du demandeur).

**Réponse** : tableau d'objets `LeaveRequest`.

#### `PATCH /api/leaves/:id`

**Décision** sur une demande de congé. **Réservé aux `MANAGER` / `ADMIN`** (403 sinon).

**Body** :

```json
{
  "status": "APPROVED",
  "comment": "Congés validés"
}
```

- `status` accepte uniquement `APPROVED` ou `REJECTED` (400 sinon) ;
- `comment` est optionnel (500 caractères max), conservé comme historique de la décision.

**Règles de workflow** :

- seule une demande `PENDING` peut être traitée — sinon **409** (« Seules les demandes en attente peuvent être traitées ») ;
- demande inexistante ou identifiant invalide → **404** ;
- **APPROVED** : le montant réservé passe de `pendingDays` à `consumedDays` (le solde disponible ne bouge pas) ;
- **REJECTED** : le montant réservé est libéré (`pendingDays` diminue, le solde disponible remonte).

Dans les deux cas, la demande est tracée : `decidedBy` (identifiant du décideur), `decidedAt`, `comment`.

**Réponse** : objet `LeaveRequest` mis à jour.

#### `GET /api/leaves/balance`

Récupère le solde de congés de l'utilisateur connecté. Le solde est créé à zéro s'il n'existe pas, puis les **acquisitions mensuelles de 2,08 jours** sont appliquées automatiquement à chaque lecture (une acquisition est créditée le 1ᵉʳ de chaque mois suivant l'initialisation).

**Réponse** :

```json
{
  "userId": "uuid",
  "initialBalance": 10.0,
  "accruedDays": 4.16,
  "consumedDays": 1.0,
  "pendingDays": 0.5,
  "availableDays": 12.66,
  "lastAccrualMonth": "2026-10",
  "updatedAt": "2026-10-06T14:00:00.000Z"
}
```

`availableDays = initialBalance + accruedDays − consumedDays − pendingDays`.

#### `POST /api/leaves/balance/init`

Initialise le solde initial de congés d'un employé. **Réservé aux `MANAGER` / `ADMIN`.**

**Body** :

```json
{
  "initialDays": 10.0,
  "userId": "uuid"
}
```

`userId` est optionnel (défaut : l'utilisateur connecté). Refus 409 si un solde existe déjà.

**Réponse** : objet `LeaveBalance`.

#### `GET /api/leaves/history`

Historique des demandes de congé (alias de `GET /api/leaves`).

> Le journal détaillé des mouvements (`LeaveTransaction` : `INIT`, `ACCRUAL`, `LEAVE_TAKEN`, `LEAVE_RELEASED`, `DECISION`) est conservé en base mais n'est pas exposé par l'API à ce stade.

## Calendrier

### Route

```
GET /api/calendar
```

Retourne une vue calendrier (mois ou plage) pour l'utilisateur connecté.

**Query params** (mutuellement exclusifs : soit `month`, soit `start+end`)

| Paramètre | Format | Requis | Description |
|---|---|---|---|
| `month` | `YYYY-MM` | non | Mois complet (défaut = mois courant) |
| `start` | `YYYY-MM-DD` | avec `end` | Début de plage |
| `end` | `YYYY-MM-DD` | avec `start` | Fin de plage |

**Règles** : si `start` ou `end` présent seul → 400 ; `end < start` → 400 ; plage max **92 jours** → 400.

**Réponse** :

```json
{
  "start": "2026-10-01",
  "end": "2026-10-31",
  "days": [
    {
      "date": "2026-10-01",
      "isWeekend": true,
      "kind": "WEEKEND",
      "workDay": null,
      "leaves": []
    },
    {
      "date": "2026-10-07",
      "isWeekend": false,
      "kind": "WORKED",
      "workDay": {
        "entryTime": "08:45",
        "breakStart": "13:00",
        "breakEnd": "14:00",
        "exitTime": "17:45",
        "workedMinutes": 480,
        "balanceMinutes": 0,
        "status": "COMPLETED"
      },
      "leaves": []
    },
    {
      "date": "2026-10-09",
      "isWeekend": false,
      "kind": "LEAVE",
      "workDay": null,
      "leaves": [
        { "id": "x", "leaveType": "PAID", "durationType": "FULL_DAY", "status": "APPROVED" }
      ]
    },
    {
      "date": "2026-10-14",
      "isWeekend": false,
      "kind": "ABSENCE",
      "workDay": null,
      "leaves": []
    }
  ]
}
```

**Kinds** : `WORKED`, `LEAVE` (présence de congé `APPROVED` sur le jour), `ABSENCE` (jour passé non pointé, sans congé approuvé), `FUTURE`, `WEEKEND`. Les congés `PENDING` sont visibles dans le calendrier via `leaves[]` (plafonné à la plage), mais n'affectent pas `kind` à `LEAVE`.

## Authentification et autorisation

| En-tête | Valeur |
|---------|--------|
| `Authorization` | `Bearer <JWT token>` |

Les rôles pris en charge :

- `EMPLOYEE` : lecture seule sur ses propres données
- `MANAGER` : lecture + validation des demandes de congé
- `ADMIN` : gestion complète des utilisateurs et configuration

### Routes d'authentification

```
POST   /api/auth/register   (public)
POST   /api/auth/login      (public)
GET    /api/auth/me         (Bearer)
```

#### `POST /api/auth/register`

Crée un compte utilisateur. Accessible sans token : le rôle est toujours
imposé à `EMPLOYEE` (les autres rôles sont attribués par un `ADMIN`).

**Body** :

```json
{
  "email": "prenom.nom@entreprise.fr",
  "password": "motdepasse123",
  "firstName": "Prénom",
  "lastName": "Nom"
}
```

Contraintes : email valide (normalisé en minuscules), mot de passe de 8 à
128 caractères, prénom et nom obligatoires (100 caractères max).

**Réponse** : `201 Created` avec l'utilisateur créé (sans le mot de passe).

#### `POST /api/auth/login`

Authentifie un utilisateur.

**Body** :

```json
{
  "email": "prenom.nom@entreprise.fr",
  "password": "motdepasse123"
}
```

**Réponse** : `200 OK`

```json
{
  "accessToken": "<JWT>",
  "user": {
    "id": "665f1c2e8b3f2a0012345678",
    "firstName": "Prénom",
    "lastName": "Nom",
    "email": "prenom.nom@entreprise.fr",
    "role": "EMPLOYEE",
    "isActive": true,
    "createdAt": "2026-10-06T10:00:00.000Z",
    "updatedAt": "2026-10-06T10:00:00.000Z"
  }
}
```

`401 Unauthorized` si l'email ou le mot de passe est incorrect.

#### `GET /api/auth/me`

Renvoie le profil de l'utilisateur connecté.

**Réponse** : objet utilisateur (voir ci-dessus), sans jamais inclure le
champ `passwordHash`.

### Utilisateurs

#### `GET /api/users`

Liste tous les utilisateurs. **Autorisation** : `ADMIN` uniquement
(`403 Forbidden` sinon).

**Réponse** : tableau d'objets utilisateur.

## Erreurs courantes

| Code | Signification |
|------|---------------|
| `400` | Données invalides (DTO) |
| `401` | Token manquant ou invalide |
| `403` | Rôle insuffisant |
| `404` | Ressource introuvable |
| `409` | Conflit (ex. : journée déjà existante) |
| `500` | Erreur serveur |
