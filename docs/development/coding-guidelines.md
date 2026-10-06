# Coding Guidelines

## Stack

- Backend : NestJS + TypeScript
- Frontend : React + TypeScript
- Base de données : MongoDB + Mongoose
- Validation backend : class-validator / class-transformer

## TypeScript

- TypeScript strict sur tout le projet
- Éviter `any` inutile
- Privilégier les types explicites
- Interfaces et types nommés clairement

## Backend (NestJS)

- Logique métier dans les services, pas dans les controllers
- DTO pour toutes les entrées/sorties
- Validation systématique avec `class-validator`
- Schemas Mongoose pour la modélisation
- Gestion centralisée des erreurs (filtres d'exception)
- Variables d'environnement pour la configuration
- Pas de logique métier dans les controllers

## Frontend (React)

- Composants réutilisables et responsabilités uniques
- Séparation entre présentation et logique métier (la logique métier reste côté backend)
- Hooks personnalisés pour la logique réutilisable
- Types explicites pour les props et les états
- Appels API via services dédiés

## Nommage

| Élément | Convention |
|---------|------------|
| Fichiers backend | kebab-case |
| Fichiers frontend | kebab-case |
| Classes / Composants | PascalCase |
| Fonctions / Variables | camelCase |
| Constantes | UPPER_SNAKE_CASE |
| DTO | PascalCase + suffixe `.dto.ts` |
| Schemas Mongoose | PascalCase + suffixe `.schema.ts` |
| Enums | PascalCase |

## Formatage

- Indentation : 2 espaces
- Guillemets : single quotes
- Semicolons : présents
- Import ordonnés

## Base de données

- Mongoose pour l'accès à MongoDB
- Schémas explicites avec validation
- Durées stockées en minutes (entiers)
- Pas de duplication de logique de calcul entre backend et frontend

## Gestion des erreurs

- Erreurs métier typées
- Messages compréhensibles pour le frontend
- Aucun détail sensible dans les réponses d'erreur
- Logs côté backend sans données personnelles

## Sécurité

- Validation systématique des DTO
- Authentification JWT
- Autorisation par rôle
- Secrets uniquement dans `.env`
- `.env` dans `.gitignore`

## Tests

- Tests unitaires backend (Jest)
- Tests d'intégration API
- Tests frontend (React Testing Library)
- Couverture des règles de calcul métier
