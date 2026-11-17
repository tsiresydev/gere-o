# Module Cotisations — spécifications produit

## Périmètre

Nouvelle caisse commune, sans reprise d’anciennes données. Le suivi des cotisations démarre en **janvier 2026**. Le solde initial est **0 Ar**. La devise est l’Ariary (Ar), les montants sont des entiers.

- Cotisation mensuelle : **5 000 Ar par membre actif et par mois**.
- 10 membres initiaux (voir liste ci-dessous), identifiés de façon stable par leur adresse email.
- Aucun nouveau compte Gere-o n’est créé automatiquement. Un membre peut exister sans `userId` : il ne peut alors pas se connecter, mais un validateur peut déclarer une cotisation pour lui.

## Décisions validées

| Sujet | Décision |
|---|---|
| Périodes attendues | Générées depuis janvier 2026. Un mois passé sans déclaration validée est `EN RETARD`. |
| Mahefa | Membre sans compte, avec droit de validation réservé. Le droit devient actif dès la création de son compte. |
| Déclarations tierces | Tsiresy et Mahefa peuvent déclarer pour n’importe quel membre. Un employé connecté ne peut déclarer que pour son propre membre. |
| Justificatif de dépense | Supprimé du périmètre : aucun champ, aucun upload, aucune dépendance associée. |
| Validation | Réservée à Tsiresy et Mahefa via un droit propre au module Cotisations, sans changer leur rôle Gere-o global. |
| Notifications | Envoyées dès l’enregistrement de la déclaration ou de la dépense. Aucun second email automatique à la validation. |

## Membres initiaux

| Nom | Email | Compte Gere-o existant |
|---|---|---|
| Mahefa | mahefa.madasoftware@gmail.com | Non (droit de validation réservé) |
| Sambany | sambany.madasoftware@gmail.com | Non |
| Tsiresy | tsiresy.madasoftware@gmail.com | Oui — validateur |
| Charlot | charlot.madasoftware@gmail.com | Non |
| Nico | alfrednico@gmail.com | Non |
| Mamy | mamy.madasoftware@gmail.com | Non |
| Samuel | samuel.madasoftware@gmail.com | Non |
| Stephanie | stephannie.madasoftware@gmail.com | Non |
| Tiavina | tiavina.madasoftware@gmail.com | Non |
| Johary | johary.madasoftware@gmail.com | Non |

## Statuts

- `NON_PAYE` : mois à venir ou mois courant sans déclaration.
- `EN_RETARD` : mois passé sans déclaration validée.
- `EN_ATTENTE_DE_VALIDATION` : déclaration enregistrée, en attente d’un validateur.
- `VALIDE` : déclaration validée, montant comptabilisé dans la caisse.
- `REFUSE` : déclaration refusée ; le membre peut déclarer à nouveau le mois concerné.

## Règles financières

- Une déclaration peut porter sur plusieurs mois : un enregistrement par mois, liés par un `declarationGroupId`.
- Le montant attendu est toujours calculé par le backend : `nombre de mois × 5 000`.
- Un même mois ne peut pas être déclaré deux fois tant qu’une déclaration est en attente ou validée.
- Seules les cotisations `VALIDE` entrent dans la caisse. Une validation est irréversible ; une correction ultérieure crée une opération distincte tracée.
- Une dépense est refusée si son montant dépasse le solde disponible.
- `Solde = total des entrées validées − total des sorties enregistrées`.
- Aucun montant, solde ou statut n’est calculé côté frontend.

## Permissions du module

| Action | Employé | Validateur (Tsiresy / Mahefa) |
|---|---|---|
| Consulter les cotisations | Oui | Oui |
| Déclarer pour soi | Oui | Oui |
| Déclarer pour un autre membre | Non | Oui |
| Valider / refuser | Non | Oui |
| Enregistrer une dépense | Non | Oui |
| Gérer les catégories | Non | Oui |
| Effectuer une correction | Non | Oui |
| Consulter le journal / les statistiques | Oui (lecture) | Oui |

Ces droits sont vérifiés côté backend et n’existent que dans le module Cotisations.

## Notifications

- **Déclaration** : TO = membre déclarateur ; CC = autres membres actifs ; objet `Déclaration de cotisation – [Mois / Année]`.
- **Dépense** : TO = Mahefa ; CC = autres membres actifs ; objet `Notification de dépense – [Motif / Date]`.
- Destinataires dédupliqués, adresses issues du module.
- Journal `NotificationLog` avec outbox : l’enregistrement financier reste valide si SMTP échoue ; nouvelle tentative manuelle ou automatique sans doublon.
