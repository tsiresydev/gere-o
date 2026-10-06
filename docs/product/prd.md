# PRD — Gere-o : Gestion du temps et des congés

**Version** : 1.0
**Date** : 2026-10-06
**Statut** : Aligné sur le cahier des charges v1.0 — Prêt pour développement
**Référence** : `docs/product/cahier-des-charges.md`

---

## Résumé du produit

Application web moderne de **gestion du temps de travail et des congés** pour une entreprise. Les collaborateurs enregistrent leurs heures quotidiennes, consultent leur solde d'heures (surplus/déficit) et gèrent leurs demandes de congés. L'application est accessible sur ordinateur, tablette et mobile.

## Utilisateurs cibles

Collaborateurs d'une entreprise souhaitant suivre leur temps de travail et gérer leurs congés, ainsi que leurs managers pour la validation des demandes.

## Problème

La gestion manuelle du temps de travail et des congés entraîne des erreurs de calcul, un manque de visibilité sur les surplus/déficits et un processus de demande de congés lent et peu transparent.

## Solution

Application web full-stack avec backend NestJS et frontend React + TypeScript, base de données MongoDB, design flat et responsive.

## Fonctionnalités clés (MVP)

### Temps de travail

1. **Enregistrement quotidien** : heure d'entrée, début/fin de pause, heure de sortie
2. **Calcul automatique** : heures travaillées, solde du jour
3. **Objectifs** : 8h/jour (configurable), 40h/semaine (configurable)
4. **Horaires par défaut** : entrée 08:45, pause 13:00 → 14:00 (configurables)
5. **Résumés** : quotidien, hebdomadaire, mensuel
6. **Historique** : consultation des journées passées

### Congés

1. **Solde initial** : paramétrable
2. **Acquisition mensuelle** : 2,08 jours/mois (automatique)
3. **Demande de congé** : journée complète, matin, après-midi
4. **Calcul des jours ouvrés** : samedi et dimanche exclus
5. **Demi-journée** : 0,5 jour
6. **Workflow** : PENDING → APPROVED / REJECTED / CANCELLED
7. **Historique** : toutes les transactions sont tracées

### Dashboard

1. Heures travaillées aujourd'hui / cette semaine
2. Objectif du jour / de la semaine
3. Solde d'heures (surplus/déficit)
4. Solde de congés
5. Congés en attente
6. Graphiques simples

### Calendrier

1. Vue calendrier des journées travaillées et des congés
2. Indicateurs visuels par jour

## Règles métier

### Calcul du temps

Toutes les durées sont calculées côté backend. Unité interne : **minutes**.

```
workedMinutes = (exitTime - entryTime) - totalBreakMinutes
balanceMinutes = workedMinutes - expectedMinutes
```

Valeurs par défaut (configurables) :
- Objectif journalier : 8h (480 min)
- Objectif hebdomadaire : 40h
- Heure d'entrée : 08:45
- Pause : 13:00 → 14:00

### Congés

- Acquisition mensuelle : **2,08 jours/mois**
- Jours ouvrés : lundi à vendredi (samedi/dimanche exclus)
- Demi-journée : 0,5 jour (matin ou après-midi)
- Types de congé : `FULL_DAY`, `MORNING`, `AFTERNOON`
- Statuts : `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

## Parcours utilisateur

### Employé

1. Se connecte
2. Enregistre ses heures quotidiennes
3. Consulte son solde d'heures
4. Consulte son historique
5. Crée une demande de congé
6. Consulte le dashboard et le calendrier

### Manager

1. Se connecte
2. Reçoit les demandes de congé
3. Approuve ou rejette avec commentaire

### Admin

1. Gère les utilisateurs
2. Configure les paramètres globaux

## Priorités

| Priorité | Fonctionnalités |
|----------|----------------|
| **P0 (MVP)** | Authentification, enregistrement du temps, calculs, dashboard, congés (solde, acquisition, demande, validation), calendrier |
| **P1** | Notifications, export des données, configuration avancée |
| **P2** | Rapports, intégrations tierces, mobile native |

## MVP

La première version de production doit au minimum permettre :

- connexion utilisateur ;
- enregistrement quotidien du temps (entrée, pause, sortie) ;
- calcul automatique des heures travaillées et du solde ;
- vue quotidienne, hebdomadaire et mensuelle ;
- dashboard avec indicateurs clés ;
- gestion des congés (solde, acquisition 2,08 jours/mois, demande, validation) ;
- calendrier ;
- responsive mobile/tablette/desktop.

## Hors périmètre initial

- Authentification externe (OAuth, SSO)
- Notifications push
- Export PDF/Excel
- API publique
- Application mobile native

## Métriques clés

- Adoption : utilisateurs actifs
- Taux de complétion des journées
- Délai moyen de validation des congés
- Taux d'erreur de calcul (doit être 0)

## Stack technique

- **Backend** : NestJS + TypeScript
- **Frontend** : React + TypeScript
- **Base de données** : MongoDB + Mongoose
- **API** : REST
- **Design** : flat, moderne, responsive, mobile-first

## Contraintes

- Tous les calculs côté backend
- Durées stockées en minutes
- Aucun secret dans le code ou la documentation
- TypeScript strict
- Tests obligatoires sur les règles de calcul
