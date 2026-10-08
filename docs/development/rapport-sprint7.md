# Rapport Sprint 7 — Calendrier

## Objectifs
- Implémenter l’API GET /api/calendar (mois ou plage) avec classification WORKED/LEAVE/ABSENCE/FUTURE/WEEKEND
- Exposer workDay (si pointage COMPLETED) et leaves[] (APPROVED/PENDING dans plage)
- Frontend : page /calendrier (navigation Mois/Semaine, grille, panneau détails)
- Validation : auth 401, règles start/end, plage ≤ 92 jours, week-ends
- Tests backend 10/10 calendrier + 129/129 globaux verts

## Réalisations
- Backend : calendar/ (DTOs, Service, Controller, Module) enregistré dans AppModule et tests
- Service : classification (WORKED prioritaire), overlap filtré, visibility PENDING
- Frontend : calendar-page.tsx, types, service, route /calendrier, lien nav
- Docs : pi.md section Calendrier mise à jour
- E2E : validations côté backend (Atlas OK)

## Tests
- Backend : calendar.spec.ts 10/10, tous tests 129/129, lint/build OK
- Frontend : lint/build OK

## Statut
- Sprint 7 terminé et validé.
