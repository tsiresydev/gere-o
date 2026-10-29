# Audit UI/UX — Refonte Projet Gere-o

## 1. État actuel du projet
- Frontend : React 19 + Vite + React Router 7 + TypeScript.
- Styles : CSS global unique (`src/styles/global.css`, ~1700 lignes), variables CSS `:root`, classes utilitaires maison.
- Pas de lib UI externe (pas de Tailwind/shadcn). Réutilisation de classes CSS.
- Pages : WorkDay, Dashboard, Calendar, Leaves, Profile, Login, Register.
- Navigation : header sticky avec liens inline + user info, pas de menu mobile compact.
- Responsive : media queries à 640px/680px/900px, breakpoints ad-hoc.

## 2. Problèmes UI/UX identifiés
- Navigation desktop uniquement : liens horizontaux se compressent sur mobile, pas de menu hamburger.
- Typographie : Inter par défaut, pas de chargement explicite de police (dépend du système).
- Design tokens incomplets : pas de tokens d'espacement, ombres, rayons secondaires, couleurs success/warning/info distinctes.
- Contraste : textes secondaires parfois faibles (#64748b sur #f5f7fa ≈ 4.6:1 OK mais limite).
- Boutons : `.button` devient pleine largeur sur mobile (peut être trop agressif), cible tactile OK mais pas de feedback pressé.
- Modales : max-width 420px, padding 24px — OK mais pas d'adaptation fine.
- Tableaux/listes : flex-wrap, min-width fixed → risque de débordement horizontal.
- Animations : pas de respect `prefers-reduced-motion` pour la plupart.
- Header : wrap, pas de menu compact.

## 3. Fonctionnalités à préserver
- Routes, API, auth context, services, types, logique métier (work days, leaves, dashboard, calendar, profile).
- Composants existants réutilisés (classes CSS).

## 4. Améliorations recommandées
- Mobile-first : nav compacte (hamburger) + menu drawer.
- Design system : tokens complets (spacing, radius, shadow, colors success/warning/info).
- Typographie : Plus Jakarta Sans (Google Fonts) avec fallback.
- Focus visible, reduced-motion.
- Cibles tactiles ≥44px.
- Harmoniser espacements.

## 5. Direction visuelle proposée
- Style : Minimalism & Swiss (clean, spacious, grid-based).
- Palette : bleu primaire #2563EB, fond #EFF6FF, accent orange #EA580C pour CTA.
- Typo : Plus Jakarta Sans (friendly, SaaS).
- Anti-patterns : éviter gradients AI purple/pink.

## 6. Risques
- CSS global monolithique → refonte par tokens pour limiter régressions.
- Pas de tests automatisés frontend → vérification manuelle + build/lint.

## 7. Plan par sprints
- Sprint 1 : Tokens + typo + accessibilité de base (ce sprint).
- Sprint 2 : Navigation mobile + layout responsive.
- Sprint 3 : Pages principales (WorkDay, Dashboard).
- Sprint 4 : Pages secondaires (Calendar, Leaves, Profile).
- Sprint 5 : Tests, a11y, performance.
