# Rappels de cotisations

Le premier jour ouvrable du mois à partir de 8 h à Madagascar (`Indian/Antananarivo`, UTC+3), chaque membre actif ayant des cotisations non payées depuis janvier 2026 jusqu'à la fin du mois précédent reçoit un rappel individuel sans copie. Un paiement anticipé est pris en compte ; le mois courant n'est jamais inclus. Aucun rappel n'est créé pour un membre à jour ou désactivé.

Les jours fériés nationaux proviennent des données Madagascar du paquet `date-holidays`. Les fêtes mobiles sont calculées par cette bibliothèque. Pour les jours chômés exceptionnels ou rectifications officielles, configurer `REMINDER_EXTRA_HOLIDAYS` sur Render : liste de dates `AAAA-MM-JJ` séparées par des virgules. Cette liste ajoute des dates ; elle ne retire pas celles du calendrier. Vérifier régulièrement les annonces officielles et mettre à jour la dépendance si nécessaire.

## Activation

1. Générer un secret aléatoire d'au moins 32 caractères, par exemple `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Ne pas le committer ni le communiquer par messagerie.
2. Configurer `REMINDER_TRIGGER_SECRET` avec cette valeur dans les variables secrètes du service backend Render.
3. Configurer le même secret dans GitHub : dépôt → Settings → Secrets and variables → Actions → secret `REMINDER_TRIGGER_SECRET`.
4. Déployer le backend et activer GitHub Actions. Le workflow `.github/workflows/contribution-reminders.yml` appelle l'endpoint sécurisé à 05:00, 05:20 et 05:45 UTC les dix premiers jours du mois. Le backend vérifie lui-même le premier jour ouvrable et l'heure locale. Les appels ultérieurs du même jour servent aux nouvelles tentatives.
5. Vérifier les exécutions du workflow et le journal des notifications. Un envoi réel requiert que la configuration SMTP existante soit opérationnelle depuis Render ; la configuration des rapports est réutilisée, sans copie automatique.

Un déclenchement manuel du workflow reste soumis aux mêmes restrictions de date et d'heure. Les erreurs d'envoi font échouer le workflow ; les rappels sont réessayés uniquement par le déclencheur après recalcul des mois impayés, au maximum cinq tentatives. Si toutes les tentatives échouent ou si les trois déclenchements sont manqués, une intervention est nécessaire ; aucun rattrapage automatique les jours suivants n'est prévu. Les horaires GitHub Actions et la mise en route de Render peuvent ajouter un délai après 8 h.

Chaque rappel possède une clé unique par membre et mois de référence. Une prise en charge atomique évite les envois simultanés. Comme avec tout SMTP sans accusé transactionnel, un arrêt après acceptation du message mais avant l'enregistrement de son succès peut néanmoins conduire à un doublon lors d'une reprise.
