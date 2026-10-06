# AI Context — Gere-o

## Objectif du projet

Application web de **gestion du temps de travail et des congés** pour une entreprise. Les collaborateurs enregistrent leurs heures quotidiennes, consultent leur solde d'heures (surplus/déficit) et gèrent leurs demandes de congés.

## Domaine fonctionnel

- Suivi quotidien du temps de travail (entrée, pause, sortie)
- Calcul automatique des heures travaillées
- Calcul du déficit/surplus quotidien et hebdomadaire
- Gestion des congés (solde, acquisition, demandes, historique)
- Dashboard synthétique et calendrier

## Utilisateurs et rôles

- `EMPLOYEE` : consulter son temps, ses congés, son dashboard
- `MANAGER` : valider les demandes de congés (workflow)
- `ADMIN` : gérer les utilisateurs et la configuration

## Stack technique

- **Backend** : NestJS + TypeScript
- **Frontend** : React + TypeScript
- **Base de données** : MongoDB + Mongoose
- **API** : REST
- **Design** : flat, moderne, responsive, mobile-first

## Architecture générale

Séparation stricte frontend/backend.

Backend NestJS modulaire :
- `auth` : authentification JWT
- `users` : gestion des utilisateurs et rôles
- `work-days` : suivi du temps, calculs
- `leaves` : gestion des congés, solde, historique
- `dashboard` : agrégation des indicateurs

## Modules principaux

### work-days

Enregistrement quotidien :
- `entryTime`, `breakStart`, `breakEnd`, `exitTime`
- Calcul automatique de `workedMinutes`, `balanceMinutes`
- Statuts du jour (ex. : `COMPLETED`, `INCOMPLETE`)

Résumés :
- `GET /api/work-days/summary/daily`
- `GET /api/work-days/summary/weekly`
- `GET /api/work-days/summary/monthly`

### leaves

Gestion complète des congés :
- solde initial, acquisition mensuelle (2,08 jours/mois)
- demande de congé (journée complète, matin, après-midi)
- calcul des jours ouvrés (samedi/dimanche exclus)
- workflow : PENDING → APPROVED / REJECTED / CANCELLED
- historique via `LeaveTransaction`

Endpoints :
- `GET /api/leaves/balance`
- `GET /api/leaves/history`

### dashboard

Agrégation en une seule requête :
- heures du jour / de la semaine
- solde d'heures
- solde de congés
- congés en attente

## Règles métier importantes

### Calcul du temps (côté backend uniquement)

Unité interne : **minutes**.

```
workedMinutes = (exitTime - entryTime) - totalBreakMinutes
balanceMinutes = workedMinutes - expectedMinutes
```

Valeurs par défaut (configurables) :
- Objectif journalier : 8h (480 min)
- Objectif hebdomadaire : 40h
- Heure d'entrée : 08:45
- Pause : 13:00 → 14:00

### Congés (côté backend uniquement)

- Acquisition mensuelle : **2,08 jours/mois**
- Jours ouvrés : lundi à vendredi (samedi/dimanche exclus)
- Demi-journée : 0,5 jour (matin ou après-midi)
- Statuts : `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

### Sécurité

- Authentification JWT
- Autorisation par rôle (`EMPLOYEE`, `MANAGER`, `ADMIN`)
- Validation systématique des DTO (`class-validator`)
- Aucun secret dans le code ou la documentation

## Organisation du projet

```
backend/
  src/
    auth/
    users/
    work-days/
    leaves/
    dashboard/
    common/
    config/

frontend/
  src/
    components/
    pages/
    hooks/
    services/
    types/
    utils/
```

## Contraintes techniques

- TypeScript strict sur tout le projet
- Logique métier complexe côté backend uniquement
- Frontend orienté présentation et interaction
- Durées stockées en minutes (pas de chaînes de caractères pour les heures)
- Validation systématique côté backend
- Gestion centralisée des erreurs

## Contraintes UX/UI

- Design flat, moderne, épuré et professionnel
- Responsive : mobile, tablette, desktop
- Mobile-first
- Cartes KPI pour les indicateurs
- États loading, empty et error
- Calendrier pour la vue temps/congés
- Feedback utilisateur après chaque opération
