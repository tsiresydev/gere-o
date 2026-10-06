# AI Rules — Gere-o

## Avant toute modification du code

L'agent doit :

1. analyser le code existant ;
2. rechercher les composants et services existants ;
3. réutiliser l'existant lorsque cela est pertinent ;
4. vérifier la documentation du projet ;
5. respecter l'architecture ;
6. respecter les règles métier ;
7. éviter les modifications hors périmètre.

## Pendant le développement

L'agent doit :

- respecter TypeScript strict ;
- respecter les conventions existantes ;
- séparer frontend et backend ;
- conserver la logique métier complexe côté backend ;
- valider les données côté backend ;
- gérer correctement les erreurs ;
- respecter les règles MongoDB ;
- ne jamais exposer de secrets.

## Après modification

L'agent doit, lorsque les outils du projet le permettent :

- lancer les tests ;
- lancer le lint ;
- lancer le build ;
- corriger les erreurs ;
- vérifier les régressions ;
- mettre à jour la documentation concernée.
