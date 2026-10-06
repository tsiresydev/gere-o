# Cahier des charges & Prompt OpenCode

## Application web de gestion du temps et des congés

**Version :** 1.0\
**Statut :** Spécification initiale / MVP évolutif

---

# 1. Présentation du projet

L'objectif est de développer une application web moderne permettant à
une entreprise de gérer :

- le temps de travail des collaborateurs ;
- les heures d'entrée et de sortie ;
- les pauses ;
- le calcul des heures travaillées ;
- le surplus ou déficit d'heures ;
- les congés et leur solde ;
- l'historique des congés ;
- un tableau de bord synthétique.

L'application doit être utilisable sur **ordinateur, tablette et
mobile**.

Le backend doit être développé avec **NestJS** et la base de données
avec **MongoDB**.

Pour le frontend, une architecture moderne basée sur **React +
TypeScript** est recommandée afin d'obtenir une interface responsive et
maintenable.

Le design doit être **flat, moderne, clair et professionnel**.

---

# 2. Objectifs fonctionnels

## 2.1 Gestion du temps

L'application doit permettre à un collaborateur d'enregistrer chaque
jour :

- heure d'entrée ;
- début de pause ;
- fin de pause ;
- heure de sortie ;
- durée réellement travaillée ;
- durée cible ;
- déficit d'heures ;
- surplus d'heures.

### Règle générale

La durée de travail cible est de :

**40 heures par semaine**

Soit, par défaut :

**8 heures par jour sur 5 jours.**

Les paramètres doivent cependant être configurables afin de permettre
une évolution future de l'application.

### Horaires par défaut

Heure d'entrée par défaut :

**08:45**

Pause par défaut :

**13:00 → 14:00**

> Remarque : la demande initiale indique « 13:00 à 13:00 ». Cette
> spécification considère qu'il s'agit probablement d'une pause de 13:00
> à 14:00. Le système doit rendre ces horaires configurables afin que
> cette valeur puisse être corrigée sans modification du code.

---

# 3. Fonctionnement quotidien du suivi du temps

Pour chaque journée travaillée, l'utilisateur doit pouvoir renseigner ou
enregistrer :

Donnée Exemple

---

Date 06/10/2026
Heure d'entrée 08:45
Début pause 13:00
Fin pause 14:00
Heure de sortie 17:45
Temps travaillé 8h00
Objectif journalier 8h00
Solde du jour 0h00

## Calcul du temps travaillé

Formule générale :

`Temps travaillé = (Heure de sortie - Heure d'entrée) - durée totale des pauses`

Exemple :

- Entrée : 08:45
- Pause : 13:00 → 14:00
- Sortie : 17:45

Temps total de présence :

`17:45 - 08:45 = 9h00`

Pause :

`1h00`

Temps travaillé :

`9h00 - 1h00 = 8h00`

Solde :

`8h00 - 8h00 = 0h00`

---

# 4. Solde d'heures

Pour chaque journée, afficher clairement :

- heures prévues ;
- heures réellement travaillées ;
- différence du jour.

Exemples :

### Journée normale

`Objectif : 8h00` `Réalisé : 8h00` `Solde : 0h00`

### Heures supplémentaires

`Objectif : 8h00` `Réalisé : 9h30` `Surplus : +1h30`

### Déficit

`Objectif : 8h00` `Réalisé : 7h15` `Déficit : -0h45`

## Vue hebdomadaire

Le système doit également calculer :

- total prévu de la semaine ;
- total réalisé ;
- surplus ;
- déficit ;
- solde hebdomadaire cumulé.

Exemple :

`Objectif semaine : 40h00` `Réalisé : 41h30` `Solde : +1h30`

---

# 5. Gestion des congés

## 5.1 Acquisition des congés

Le droit aux congés est de :

**2,08 jours par mois**

Le système doit permettre d'initialiser un solde de congés.

Exemple :

`Solde initial : 10 jours`

Puis le système doit calculer automatiquement les acquisitions
mensuelles.

Exemple :

`Solde initial : 10 jours` `Acquisition du mois : +2,08 jours`
`Congés consommés : -1 jour` `Nouveau solde : 11,08 jours`

Les règles d'acquisition doivent être centralisées dans la configuration
afin de pouvoir être modifiées ultérieurement.

---

# 6. Calcul des jours de congé

Lorsqu'un utilisateur crée une demande de congé avec :

- date de début ;
- date de fin ;

le système doit calculer automatiquement le nombre de jours ouvrés.

## Règle

Les jours suivants ne doivent pas être comptabilisés :

- samedi ;
- dimanche.

Exemple :

Congé du vendredi au lundi :

- vendredi : 1 jour
- samedi : 0
- dimanche : 0
- lundi : 1 jour

Total :

**2 jours**

---

# 7. Congé demi-journée

L'application doit permettre de prendre un congé d'une demi-journée.

Exemples :

- matin ;
- après-midi.

La durée consommée sera :

**0,5 jour**

Le formulaire doit permettre de sélectionner :

- journée complète ;
- demi-journée matin ;
- demi-journée après-midi.

---

# 8. Historique des congés

Chaque demande doit conserver au minimum :

- utilisateur ;
- type de congé ;
- raison / motif ;
- date de début ;
- date de fin ;
- type de durée ;
- nombre de jours consommés ;
- date de création ;
- statut ;
- commentaire éventuel.

## Statuts possibles

Prévoir au minimum :

- `PENDING` --- En attente
- `APPROVED` --- Approuvé
- `REJECTED` --- Refusé
- `CANCELLED` --- Annulé

Le système doit permettre d'ajouter ultérieurement un workflow de
validation par un responsable.

---

# 9. Tableau de bord

Créer un tableau de bord moderne présentant les informations
importantes.

## Indicateurs principaux

Afficher sous forme de cartes :

- heures travaillées aujourd'hui ;
- objectif du jour ;
- solde du jour ;
- heures travaillées cette semaine ;
- objectif hebdomadaire ;
- solde hebdomadaire ;
- solde de congés ;
- congés consommés ;
- congés en attente.

## Graphiques

Prévoir une visualisation simple permettant de consulter :

- heures travaillées par jour ;
- objectif vs réalisé ;
- évolution du solde d'heures ;
- évolution du solde de congés.

Les graphiques doivent rester lisibles sur mobile.

---

# 10. Calendrier

Prévoir une vue calendrier permettant de visualiser :

- jours travaillés ;
- absences ;
- congés ;
- week-ends ;
- jours fériés si cette fonctionnalité est activée ultérieurement.

Chaque journée peut afficher un résumé :

`08:45 → 17:45` `8h travaillées` `Solde : +0h00`

---

# 11. Architecture technique

## Backend

Technologie obligatoire :

**NestJS**

Recommandations :

- TypeScript ;
- architecture modulaire NestJS ;
- DTO ;
- validation avec `class-validator` / `class-transformer` ;
- services métier séparés des contrôleurs ;
- gestion centralisée des erreurs ;
- variables d'environnement ;
- API REST documentée.

## Base de données

Technologie obligatoire :

**MongoDB**

Utiliser une couche d'accès adaptée à NestJS, par exemple :

- Mongoose.

Les informations sensibles de connexion MongoDB doivent uniquement être
stockées dans des variables d'environnement.

**Ne jamais mettre une URI MongoDB contenant un mot de passe directement
dans le code source, le README ou le prompt.**

---

# 12. Modèle de données proposé

## User

```text
User
- _id
- firstName
- lastName
- email
- role
- isActive
- createdAt
- updatedAt
```

## WorkDay

```text
WorkDay
- _id
- userId
- date
- entryTime
- breakStart
- breakEnd
- exitTime
- expectedMinutes
- workedMinutes
- balanceMinutes
- status
- createdAt
- updatedAt
```

## LeaveBalance

```text
LeaveBalance
- _id
- userId
- initialBalance
- accruedDays
- consumedDays
- pendingDays
- currentBalance
- updatedAt
```

## LeaveRequest

```text
LeaveRequest
- _id
- userId
- leaveType
- reason
- startDate
- endDate
- durationType
- durationDays
- status
- comment
- createdAt
- updatedAt
```

## LeaveTransaction

Prévoir éventuellement un journal des mouvements :

```text
LeaveTransaction
- _id
- userId
- type
- amount
- reason
- referenceId
- date
- createdAt
```

Ce journal permettra de comprendre précisément pourquoi un solde de
congés a évolué.

---

# 13. Règles métier importantes

Toutes les durées doivent être calculées côté backend afin d'éviter les
incohérences entre frontend et backend.

Le frontend peut afficher des estimations en temps réel, mais le backend
doit rester la source de vérité.

## Exemple de représentation interne

Il est recommandé de stocker les durées en **minutes** plutôt qu'en
chaînes de caractères.

Exemple :

`8h00 = 480 minutes`

`1h30 = 90 minutes`

Cela simplifie les calculs et évite les erreurs.

---

# 14. Sécurité

Prévoir dès la conception :

- authentification ;
- autorisation par rôle ;
- protection des routes ;
- validation des entrées ;
- protection contre les données invalides ;
- secrets uniquement dans `.env` ;
- `.env` dans `.gitignore` ;
- aucune donnée sensible dans Git.

Rôles recommandés pour la première architecture :

- `EMPLOYEE`
- `MANAGER`
- `ADMIN`

Le système peut commencer avec un rôle simple puis évoluer.

---

# 15. UX/UI

Le design doit être :

- flat ;
- moderne ;
- professionnel ;
- épuré ;
- responsive ;
- mobile-first ;
- facile à comprendre.

## Principes

Utiliser :

- cartes pour les indicateurs ;
- tableaux pour les historiques ;
- calendrier pour les congés ;
- boutons d'action clairement identifiés ;
- couleurs sémantiques avec modération ;
- feedback après chaque opération ;
- états loading ;
- états empty ;
- messages d'erreur compréhensibles.

Sur mobile :

- navigation simplifiée ;
- cartes empilées ;
- tableaux transformables en cartes si nécessaire ;
- boutons facilement accessibles au doigt.

---

# 16. API REST proposée

Exemples d'endpoints :

## Temps

```text
GET    /api/work-days
GET    /api/work-days/:id
POST   /api/work-days
PATCH  /api/work-days/:id
DELETE /api/work-days/:id

GET    /api/work-days/summary/daily
GET    /api/work-days/summary/weekly
GET    /api/work-days/summary/monthly
```

## Congés

```text
GET    /api/leaves
GET    /api/leaves/:id
POST   /api/leaves
PATCH  /api/leaves/:id
DELETE /api/leaves/:id

GET    /api/leaves/balance
GET    /api/leaves/history
```

## Dashboard

```text
GET /api/dashboard
```

L'API exacte pourra être adaptée après analyse de l'architecture du
projet.

---

# 17. Découpage en sprints

## Sprint 0 --- Initialisation et analyse

Objectif :

Préparer le projet sans développer prématurément les fonctionnalités.

Travail :

- analyser l'environnement ;
- définir l'architecture ;
- configurer NestJS ;
- configurer MongoDB ;
- configurer les variables d'environnement ;
- configurer ESLint / Prettier ;
- préparer la structure frontend ;
- définir les modèles.

Livrable :

Projet démarrable avec une architecture propre.

---

## Sprint 1 --- Authentification et utilisateurs

Objectif :

Créer la base utilisateur.

Fonctionnalités :

- inscription ou création d'utilisateur ;
- connexion ;
- déconnexion ;
- authentification ;
- rôles ;
- profil utilisateur.

Livrable :

Un utilisateur peut se connecter et accéder à son espace.

---

## Sprint 2 --- Gestion du temps

Objectif :

Créer le cœur de la gestion du temps.

Fonctionnalités :

- création d'une journée ;
- entrée ;
- pause ;
- reprise ;
- sortie ;
- calcul des heures travaillées ;
- calcul du solde quotidien.

Livrable :

Un utilisateur peut suivre complètement sa journée.

---

## Sprint 3 --- Calcul hebdomadaire et historique

Objectif :

Permettre une vision plus complète du temps.

Fonctionnalités :

- total hebdomadaire ;
- objectif de 40h ;
- surplus ;
- déficit ;
- historique ;
- filtres par date ;
- vue mensuelle.

Livrable :

L'utilisateur peut comprendre son temps de travail sur plusieurs
périodes.

---

## Sprint 4 --- Gestion des congés

Objectif :

Créer le système de congés.

Fonctionnalités :

- solde initial ;
- acquisition mensuelle de 2,08 jours ;
- consommation ;
- calcul des jours ouvrés ;
- exclusion samedi/dimanche ;
- demi-journées ;
- historique.

Livrable :

Le solde de congés est calculé automatiquement.

---

## Sprint 5 --- Workflow de validation des congés

Objectif :

Préparer la gestion managériale.

Fonctionnalités :

- demande de congé ;
- statut en attente ;
- approbation ;
- refus ;
- annulation ;
- commentaire ;
- historique des décisions.

Livrable :

Un congé peut suivre un workflow complet.

---

## Sprint 6 --- Dashboard

Objectif :

Créer une vue synthétique.

Fonctionnalités :

- statistiques ;
- cartes KPI ;
- graphiques ;
- solde d'heures ;
- solde de congés ;
- tendances ;
- résumé de la semaine.

Livrable :

Tableau de bord opérationnel.

---

## Sprint 7 --- Calendrier

Objectif :

Ajouter une vue calendrier.

Fonctionnalités :

- jours travaillés ;
- congés ;
- absences ;
- week-ends ;
- détails par journée ;
- navigation mois/semaine.

Livrable :

Vision calendrier complète.

---

## Sprint 8 --- Responsive et UX

Objectif :

Optimiser l'expérience utilisateur.

Travail :

- mobile ;
- tablette ;
- desktop ;
- accessibilité ;
- feedback ;
- loading ;
- empty states ;
- erreurs ;
- optimisation des formulaires.

Livrable :

Application utilisable confortablement sur tous les écrans.

---

## Sprint 9 --- Tests et qualité

Objectif :

Stabiliser l'application.

Tests :

- tests unitaires backend ;
- tests des règles métier ;
- tests des calculs d'heures ;
- tests des congés ;
- tests API ;
- tests frontend ;
- tests des cas limites.

Cas importants :

- passage minuit ;
- pause longue ;
- journée incomplète ;
- absence de sortie ;
- congé sur week-end ;
- congé demi-journée ;
- solde insuffisant ;
- dates invalides.

Livrable :

Application stable et testée.

---

## Sprint 10 --- Préparation production

Objectif :

Préparer la mise en production.

Travail :

- variables d'environnement ;
- sécurité ;
- logs ;
- gestion des erreurs ;
- optimisation ;
- documentation ;
- sauvegarde MongoDB ;
- CI/CD si nécessaire ;
- déploiement.

Livrable :

Version MVP prête pour production.

---

# 18. MVP final

La première version de production doit au minimum permettre :

### Temps

- connexion utilisateur ;
- entrée ;
- pause ;
- reprise ;
- sortie ;
- calcul des heures ;
- objectif 8h/jour ;
- objectif 40h/semaine ;
- surplus ;
- déficit ;
- historique.

### Congés

- solde initial ;
- acquisition 2,08 jours/mois ;
- demande ;
- motif ;
- début ;
- fin ;
- jours ouvrés ;
- exclusion samedi/dimanche ;
- demi-journée ;
- historique ;
- statut.

### Dashboard

- heures du jour ;
- heures de la semaine ;
- solde d'heures ;
- solde congés ;
- demandes en attente ;
- résumé graphique.

---

# 19. Prompt à utiliser avec OpenCode

Copie le prompt suivant dans OpenCode après avoir placé le projet dans
son environnement de travail.

---

## PROMPT OPENCODE

Tu es un **architecte logiciel senior, développeur full-stack TypeScript
et expert UX/UI**.

Tu dois développer une application web de **gestion du temps de travail
et des congés pour une entreprise**.

Le projet doit être construit de manière professionnelle, maintenable,
sécurisée et évolutive.

### Stack obligatoire

Backend :

- NestJS
- TypeScript
- MongoDB
- Mongoose
- API REST

Frontend :

- React
- TypeScript
- interface responsive
- design flat et moderne

Tu peux proposer une bibliothèque UI adaptée si elle apporte une vraie
valeur, mais évite d'ajouter des dépendances inutiles.

---

# RÈGLE ABSOLUE : NE PAS CODER AVEUGLEMENT

Avant toute implémentation :

1.  Analyse le projet existant.
2.  Analyse sa structure.
3.  Identifie les technologies déjà présentes.
4.  Vérifie les conventions de code.
5.  Vérifie les variables d'environnement.
6.  Vérifie la configuration MongoDB.
7.  Vérifie les scripts disponibles.
8.  Identifie les éventuels composants ou modules déjà réutilisables.

Ne détruis jamais une fonctionnalité existante sans justification.

Si le projet est vide, construis l'architecture proposée ci-dessous.

Si le projet contient déjà une architecture fonctionnelle, adapte-toi à
celle-ci plutôt que de la remplacer.

---

# OBJECTIF

Construire une application permettant à un employé de :

- suivre ses heures ;
- enregistrer entrée/pause/reprise/sortie ;
- connaître son temps travaillé ;
- connaître son surplus ou déficit ;
- consulter son historique ;
- gérer ses demandes de congés ;
- connaître son solde de congés ;
- consulter un tableau de bord.

---

# RÈGLES MÉTIER

## Temps de travail

Objectif :

**40 heures par semaine**

Par défaut :

**8 heures par jour × 5 jours**

Horaire d'entrée par défaut :

**08:45**

Pause par défaut :

**13:00 → 14:00**

IMPORTANT :

L'ancienne spécification indiquait « 13:00 à 13:00 ». Considère 13:00 →
14:00 comme valeur initiale supposée, mais rends cette configuration
modifiable.

Ne hardcode pas définitivement ces valeurs dans la logique métier.

---

# CALCUL DES HEURES

Utilise des **minutes comme unité interne**.

Exemple :

480 minutes = 8h.

Calcul :

```text
workedMinutes =
(exitTime - entryTime)
- totalBreakMinutes
```

Puis :

```text
balanceMinutes =
workedMinutes - expectedMinutes
```

Exemples :

```text
8h travaillé / 8h attendu = 0
9h travaillé / 8h attendu = +1h
7h30 travaillé / 8h attendu = -30min
```

Le backend est la source de vérité pour les calculs.

---

# CONGÉS

Droit mensuel :

**2,08 jours**

Le système doit gérer :

- solde initial ;
- acquisition mensuelle ;
- consommation ;
- solde restant ;
- demandes en attente.

Les samedis et dimanches ne sont pas comptabilisés dans les congés.

Une demande doit supporter :

- journée complète ;
- demi-journée matin ;
- demi-journée après-midi.

Une demi-journée consomme :

**0,5 jour**

Le calcul doit être effectué côté backend.

---

# HISTORIQUE DES CONGÉS

Une demande doit contenir au minimum :

```text
userId
leaveType
reason
startDate
endDate
durationType
durationDays
status
comment
createdAt
updatedAt
```

Statuts :

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

---

# MODÈLES

Créer des modèles adaptés pour :

```text
User
WorkDay
LeaveBalance
LeaveRequest
LeaveTransaction
```

Le modèle `LeaveTransaction` est recommandé pour conserver un historique
fiable des mouvements du solde.

---

# ARCHITECTURE BACKEND

Utilise une architecture NestJS claire :

```text
src/
  auth/
  users/
  work-days/
  leaves/
  dashboard/
  common/
  config/
```

Sépare :

- controllers ;
- services ;
- schemas ;
- DTO ;
- logique métier ;
- validation.

Ne mets pas la logique métier complexe directement dans les controllers.

---

# API

Prévoir notamment :

```text
GET    /api/work-days
POST   /api/work-days
PATCH  /api/work-days/:id
GET    /api/work-days/summary/daily
GET    /api/work-days/summary/weekly

GET    /api/leaves
POST   /api/leaves
PATCH  /api/leaves/:id
GET    /api/leaves/balance
GET    /api/leaves/history

GET    /api/dashboard
```

Adapte les routes à l'architecture réelle du projet si nécessaire.

---

# DASHBOARD

Créer un dashboard moderne avec :

- heures travaillées aujourd'hui ;
- objectif du jour ;
- solde du jour ;
- heures travaillées cette semaine ;
- objectif de 40h ;
- surplus/déficit ;
- solde congés ;
- congés consommés ;
- congés en attente.

Ajouter des graphiques simples et lisibles.

---

# DESIGN

Le design doit être :

- flat ;
- moderne ;
- professionnel ;
- minimaliste ;
- responsive ;
- mobile-first.

L'application doit être agréable sur :

- mobile ;
- tablette ;
- desktop.

Prévoir :

- navigation responsive ;
- cartes KPI ;
- tableaux ;
- formulaires clairs ;
- calendrier ;
- feedback utilisateur ;
- loading states ;
- empty states ;
- error states.

---

# SÉCURITÉ

IMPORTANT :

Ne mets jamais de credentials MongoDB dans le code source.

Utilise :

```text
MONGODB_URI
```

dans `.env`.

Le fichier `.env` doit être dans `.gitignore`.

Ne jamais afficher, recopier ou commit une URI MongoDB contenant un mot
de passe.

---

# PLAN DE DÉVELOPPEMENT

Travaille par sprints.

## Sprint 0

Analyse et architecture.

## Sprint 1

Authentification et utilisateurs.

## Sprint 2

Gestion du temps.

## Sprint 3

Calcul hebdomadaire et historique.

## Sprint 4

Gestion des congés.

## Sprint 5

Validation des congés.

## Sprint 6

Dashboard.

## Sprint 7

Calendrier.

## Sprint 8

Responsive et UX.

## Sprint 9

Tests.

## Sprint 10

Production.

---

# RÈGLE POUR CHAQUE SPRINT

Avant de commencer un sprint :

1.  Explique ce que tu vas modifier.
2.  Identifie les fichiers concernés.
3.  Vérifie les dépendances.
4.  Implémente uniquement le périmètre du sprint.
5.  Lance les tests/lint/build disponibles.
6.  Corrige les erreurs.
7.  Résume les modifications.

Ne passe pas silencieusement au sprint suivant si le sprint actuel
contient des erreurs bloquantes.

---

# QUALITÉ DU CODE

Respecte :

- TypeScript strict ;
- code lisible ;
- composants réutilisables ;
- séparation des responsabilités ;
- validation des données ;
- gestion propre des erreurs ;
- noms explicites ;
- fonctions courtes ;
- commentaires uniquement lorsque nécessaires.

Évite :

- duplication ;
- `any` inutile ;
- logique métier dans les composants UI ;
- secrets dans le code ;
- dépendances inutiles ;
- refactorisation hors périmètre.

---

# TESTS

Teste obligatoirement les règles de calcul.

Exemples :

```text
08:45 → 17:45
pause 13:00 → 14:00
= 8h travaillées
= 0h de solde
```

Tester aussi :

```text
9h travaillées → +1h
7h30 travaillées → -30min
```

Pour les congés :

```text
Vendredi → lundi
= 2 jours ouvrés
```

Et :

```text
Demi-journée
= 0,5 jour
```

Tester également les cas limites.

---

# LIVRABLE FINAL

À la fin du développement, fournir :

1.  architecture du projet ;
2.  fonctionnalités implémentées ;
3.  modèles MongoDB ;
4.  endpoints API ;
5.  instructions d'installation ;
6.  variables d'environnement nécessaires ;
7.  commandes de lancement ;
8.  commandes de test ;
9.  état des tests ;
10. éventuelles améliorations futures.

---

# IMPORTANT

Ne prends aucune décision destructive sans raison.

Ne supprime pas une fonctionnalité existante simplement parce qu'une
autre architecture te paraît meilleure.

Priorité :

**fonctionnement existant \> stabilité \> sécurité \> simplicité \>
nouvelles fonctionnalités.**

Si une information est ambiguë, choisis une solution raisonnable et
documente ton hypothèse au lieu de bloquer inutilement le développement.
