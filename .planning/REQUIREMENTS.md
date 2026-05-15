# Requirements

## REQ-01 — tournaments table
Add a `tournaments` table to the DB schema with: id (CUID PK), name, shortName, leagueId (int), seasonIds (text CSV), isDefault (bool), active (bool), createdAt.

## REQ-02 — fixtures.tournamentId FK
Add `tournament_id` text FK column to the `fixtures` table referencing `tournaments.id`.

## REQ-03 — mini_leagues.tournamentId FK
Add `tournament_id` text FK column to the `mini_leagues` table referencing `tournaments.id`.

## REQ-04 — Drizzle migration
Generate and apply a Drizzle migration for the schema changes (REQ-01, REQ-02, REQ-03).

## REQ-05 — Seed script: multi-tournament support
Update `seed-tournament.ts` to: (a) accept tournament config via env vars, (b) create/upsert the tournament record in the DB, (c) stamp each seeded fixture with the correct `tournament_id`.

## REQ-06 — GET /api/tournaments endpoint
New endpoint that returns all active tournaments. Response: `{ tournaments: [{ id, name, shortName, isDefault }] }`.

## REQ-07 — fixtures API: tournamentId filter
`GET /api/fixtures?tournamentId=xxx` filters fixtures by tournament. If `tournamentId` is omitted, use the tournament where `isDefault = true`.

## REQ-08 — standings API: tournamentId param
`GET /api/fixtures/standings?tournamentId=xxx` uses the tournament's `leagueId` and `seasonIds`. Falls back to default tournament if omitted.

## REQ-09 — predictions API: tournament-scoped list
`GET /api/predictions?tournamentId=xxx` returns only predictions for fixtures belonging to that tournament. Falls back to default tournament if omitted.

## REQ-10 — Cache keys include tournamentId
All Redis cache keys that currently use `TOURNAMENT_ID` or `BZZOIRO_LEAGUE_ID` env vars must be updated to use the resolved tournament's id/leagueId.

## REQ-11 — Frontend: tournament store
New Zustand store `useTournamentStore` that fetches tournaments from `GET /api/tournaments` on app load and tracks the active tournament (default = `isDefault: true`).

## REQ-12 — Frontend: tournament selector UI
Add a tournament selector (dropdown or tabs) in the Header/Sidebar. Switching tournament updates the store and re-fetches all tournament-scoped data.

## REQ-13 — Frontend: wire fixture and predictions pages
Connect the fixture and predictions pages to the API (remove mock data) using the active `tournamentId` from the store.

## REQ-14 — Default tournament seeded
The seed script for the Mundial sets `IS_DEFAULT=true`. Documentation updated in `.env.example`.
