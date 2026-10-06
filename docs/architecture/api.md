# API — Gestion du temps et des congés

## Vue d'ensemble

L'API est une **API REST** exposée par le backend NestJS. Tous les endpoints sont préfixés par `/api`.

Toutes les requêtes nécessitent une **authentification JWT** via le header :

```
Authorization: Bearer <token>
```

L'autorisation est gérée par rôle (`EMPLOYEE`, `MANAGER`, `ADMIN`). Les endpoints de modification des congés nécessitent le rôle `MANAGER` ou `ADMIN`.

## Work Days — Gestion du temps

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

Liste les journées de travail de l'utilisateur connecté.

**Paramètres de query** (optionnels) :
- `startDate` (date ISO)
- `endDate` (date ISO)
- `page` (nombre)
- `limit` (nombre)

**Réponse** :

```json
[
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
]
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

Récupère le résumé hebdomadaire.

**Paramètres de query** :
- `weekStart` (date ISO du lundi)

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

Récupère le résumé mensuel.

**Paramètres de query** :
- `year` (nombre)
- `month` (nombre, 1-12)

**Réponse** :

```json
{
  "year": 2026,
  "month": 10,
  "expectedMinutes": 9600,
  "workedMinutes": 9600,
  "balanceMinutes": 0
}
```

## Leaves — Gestion des congés

### Routes

```
GET    /api/leaves
POST   /api/leaves
GET    /api/leaves/:id
PATCH  /api/leaves/:id
DELETE /api/leaves/:id

GET    /api/leaves/balance
GET    /api/leaves/history
```

### Détails

#### `GET /api/leaves`

Liste les demandes de congé de l'utilisateur connecté.

**Paramètres de query** (optionnels) :
- `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
- `startDate`
- `endDate`
- `page`
- `limit`

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
    "status": "PENDING",
    "comment": null,
    "createdAt": "2026-10-06T10:00:00.000Z",
    "updatedAt": "2026-10-06T10:00:00.000Z"
  }
]
```

#### `POST /api/leaves`

Crée une demande de congé.

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

`durationType` accepte : `FULL_DAY`, `MORNING`, `AFTERNOON`.

**Réponse** : objet `LeaveRequest` créé avec statut `PENDING`.

#### `GET /api/leaves/:id`

Récupère une demande de congé par son identifiant.

**Réponse** : objet `LeaveRequest`.

#### `PATCH /api/leaves/:id`

Met à jour une demande de congé.

**Body** (tous les champs optionnels) :

```json
{
  "status": "APPROVED",
  "comment": "Congé approuvé"
}
```

**Autorisation** : `MANAGER` ou `ADMIN` uniquement.

**Réponse** : objet `LeaveRequest` mis à jour.

#### `DELETE /api/leaves/:id`

Supprime une demande de congé.

**Réponse** : `204 No Content`.

#### `GET /api/leaves/balance`

Récupère le solde de congés de l'utilisateur connecté.

**Réponse** :

```json
{
  "userId": "uuid",
  "initialBalance": 10.0,
  "accruedDays": 2.08,
  "consumedDays": 1.0,
  "pendingDays": 0.5,
  "currentBalance": 10.58
}
```

#### `GET /api/leaves/history`

Récupère l'historique des transactions de congés.

**Réponse** :

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "type": "ACCRUAL",
    "amount": 2.08,
    "reason": "Acquisition mensuelle octobre 2026",
    "referenceId": null,
    "date": "2026-10-01",
    "createdAt": "2026-10-01T00:00:00.000Z"
  }
]
```

## Dashboard

### Route

```
GET /api/dashboard
```

Récupère les indicateurs synthétiques pour l'utilisateur connecté.

**Réponse** :

```json
{
  "today": {
    "workedMinutes": 480,
    "expectedMinutes": 480,
    "balanceMinutes": 0
  },
  "week": {
    "workedMinutes": 2460,
    "expectedMinutes": 2400,
    "balanceMinutes": 60
  },
  "leaves": {
    "currentBalance": 10.58,
    "consumedDays": 1.0,
    "pendingDays": 0.5
  }
}
```

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
