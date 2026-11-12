# Base de données — Gere-o

## Vue d'ensemble

Le projet utilise **MongoDB** avec **Mongoose** comme ODM. Toutes les durées sont stockées en **minutes** (entiers).

## Modèles

### User

```text
User
- _id : ObjectId
- email : string (unique)
- passwordHash : string
- firstName : string
- lastName : string
- role : string (EMPLOYEE | MANAGER | ADMIN)
- isActive : boolean
- createdAt : Date
- updatedAt : Date
```

### WorkDay

```text
WorkDay
- _id : ObjectId
- userId : ObjectId (référence User)
- date : string (YYYY-MM-DD)
- entryTime : string (HH:mm)
- breakStart : string (HH:mm)
- breakEnd : string (HH:mm)
- exitTime : string (HH:mm)
- expectedMinutes : number
- workedMinutes : number
- balanceMinutes : number
- status : string
- createdAt : Date
- updatedAt : Date
```

Champs calculés par le backend :
- `workedMinutes = (exitTime - entryTime) - totalBreakMinutes`
- `balanceMinutes = workedMinutes - expectedMinutes`

### LeaveBalance

```text
LeaveBalance
- _id : ObjectId
- userId : ObjectId (référence User)
- initialBalance : number
- accruedDays : number
- consumedDays : number
- pendingDays : number
- currentBalance : number
- updatedAt : Date
```

Champs calculés :
- `currentBalance = initialBalance + accruedDays - consumedDays - pendingDays`

### LeaveRequest

```text
LeaveRequest
- _id : ObjectId
- userId : ObjectId (référence User)
- leaveType : string
- reason : string
- startDate : string (YYYY-MM-DD)
- endDate : string (YYYY-MM-DD)
- durationType : string (FULL_DAY | MORNING | AFTERNOON)
- durationDays : number
- status : string (PENDING | APPROVED | REJECTED | CANCELLED)
- comment : string
- createdAt : Date
- updatedAt : Date
```

### LeaveTransaction

```text
LeaveTransaction
- _id : ObjectId
- userId : ObjectId (référence User)
- type : string (ACCRUAL | CONSUMPTION | ADJUSTMENT | INITIAL)
- amount : number
- reason : string
- referenceId : ObjectId (référence LeaveRequest, optionnel)
- date : Date
- createdAt : Date
```

Rôle : historique immuable de tous les mouvements du solde de congés. Chaque modification du `LeaveBalance` génère une transaction.

### SentReport

```text
SentReport
- _id : ObjectId
- userId : ObjectId (référence User, indexé)
- year : number
- month : number (1-12)
- monthLabel : string
- from : string
- to : string
- cc : string (optionnel)
- bcc : string (optionnel)
- subject : string
- message : string (corps envoyé, snapshot)
- workedDays : number
- totalLeaveDays : number
- senderName : string
- messageId : string (optionnel)
- createdAt : Date
- updatedAt : Date
```

Rôle : archive des récapitulatifs mensuels réellement envoyés. Le contenu est figé au moment de l'envoi ; aucune mise à jour n'est effectuée après création. Index `{ userId: 1, createdAt: -1 }` pour l'historique personnel.

## Règles de cohérence

- Les calculs sont effectués côté backend uniquement
- Les durées sont stockées en minutes dans `WorkDay`
- Les jours de congé sont stockés en jours dans `LeaveBalance` et `LeaveRequest`
- L'historique des congés est immuable (pas de suppression de transaction)
