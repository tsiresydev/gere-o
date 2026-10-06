# Security

## Secrets

Ne jamais placer dans le code ou la documentation :

- mot de passe MongoDB ;
- URI MongoDB avec mot de passe ;
- API keys ;
- JWT secrets ;
- credentials ;
- tokens privés.

Utiliser :

```
.env
```

et :

```
.env.example
```

Le fichier `.env` réel doit être ignoré par Git.

## Backend

Documenter les pratiques nécessaires :

- validation des DTO ;
- authentification ;
- autorisation ;
- contrôle des rôles ;
- protection des endpoints ;
- gestion sécurisée des erreurs ;
- validation/sanitation des données ;
- limitation des informations sensibles retournées par l'API.
