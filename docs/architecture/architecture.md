# Architecture — Gere-o

## Vue d'ensemble

Application web de gestion du temps de travail et des congés. Stack :

- **Frontend** : React + TypeScript
- **Backend** : NestJS + TypeScript
- **Base de données** : MongoDB + Mongoose
- **API** : REST

Le design est flat, moderne, clair et responsive.

## Principes architecturaux

- Séparation stricte frontend / backend
- Logique métier côté backend uniquement
- Frontend orienté présentation et interaction
- Durées stockées en minutes (unité interne)
- Calculs côté backend : le backend est la source de vérité
- Validation systématique côté backend
- Gestion centralisée des erreurs

## Organisation du backend (NestJS)

```
backend/
  src/
    auth/           # Authentification JWT, stratégies, guards
    users/          # Entités User, rôles, profil
    work-days/      # CRUD journées, calculs heures, résumés
    leaves/         # Congés, solde, historique, workflow
    dashboard/      # Agrégation des indicateurs
    common/         # Décorateurs, filtres, exceptions, utilitaires partagés
    config/         # Configuration, variables d'environnement, constantes métier
```

Chaque module métier NestJS suit l'organisation standard :

```
work-days/
  dto/
    create-work-day.dto.ts
    update-work-day.dto.ts
  entities/
    work-day.schema.ts
  work-days.controller.ts
  work-days.service.ts
  work-days.module.ts
```

## Organisation du frontend (React + TypeScript)

```
frontend/
  src/
    components/     # Composants réutilisables
    pages/          # Pages / vues
    hooks/          # Hooks personnalisés
    services/       # Appels API
    types/          # Types TypeScript
    utils/          # Fonctions utilitaires
    styles/         # Styles globaux, tokens
```

## Stack technologique

| Couche | Technologie |
|--------|-------------|
| Backend | NestJS, TypeScript |
| Base de données | MongoDB, Mongoose |
| API | REST (controllers NestJS) |
| Validation | class-validator, class-transformer |
| Authentification | JWT (passport-jwt) |
| Frontend | React, TypeScript |
| Design | CSS moderne, responsive, mobile-first |

## Modules métier

### auth

Gestion de l'authentification et des tokens JWT.

- inscription / connexion / déconnexion
- validation du token sur chaque requête
- guards d'authentification et d'autorisation

### users

Gestion des utilisateurs et des rôles.

- création, lecture, mise à jour du profil
- rôles : `EMPLOYEE`, `MANAGER`, `ADMIN`
- filtrage par rôle dans les guards

### work-days

Cœur métier du suivi du temps.

- CRUD des journées
- calcul automatique de `workedMinutes` et `balanceMinutes`
- résumés : daily, weekly, monthly
- configuration des paramètres de temps (objectif, horaires, pause)

### leaves

Gestion complète des congés.

- solde initial et acquisition mensuelle (2,08 jours/mois)
- demande de congé (journée, matin, après-midi)
- calcul des jours ouvrés (samedi/dimanche exclus)
- workflow : PENDING → APPROVED / REJECTED / CANCELLED
- historique via transactions

### dashboard

 Agrégation des indicateurs pour le tableau de bord.

- heures du jour / de la semaine
- solde d'heures
- solde de congés
- congés en attente

## Gestion des erreurs

- Utilisation de filtres d'exception NestJS (`ExceptionFilter`)
- Erreurs métier typées
- Messages d'erreur compréhensibles pour le frontend
- Aucun détail sensible dans les réponses d'erreur

## Authentification et autorisation

- JWT signé, stocké côté client (httpOnly cookie recommandé)
- Guards sur les routes protégées
- Décorateurs de rôle (`@Roles`, `@Auth`) sur les controllers
- Validation systématique des DTO

## Sécurité

- Validation des entrées avec `class-validator`
- Pas de logique métier dans les controllers
- Variables d'environnement pour les secrets
- `.env` ignoré par Git
- Aucun secret dans la documentation

## Évolutivité

- Architecture modulaire NestJS permettant d'ajouter des modules
- Configuration externalisée pour les paramètres métier
- Base de données MongoDB adaptée aux évolutions de schéma
