# Roadmap

## Phase 1: DB Schema + Migration
**Goal:** Add `tournaments` table and `tournament_id` FK to `fixtures` and `mini_leagues`. Generate and apply Drizzle migration.

**Requirements:** REQ-01, REQ-02, REQ-03, REQ-04

**Deliverables:**
- `backend/src/db/schema.ts` updated with `tournaments` table and new FK columns
- `backend/drizzle/` new migration files generated
- Migration applied to DB

---

## Phase 2: Backend — Seed + API
**Goal:** Update seed script to support multi-tournament seeding. Add `GET /api/tournaments`. Update fixtures, standings, and predictions controllers to accept and use `tournamentId` param. Update Redis cache keys.

**Requirements:** REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10, REQ-14

**Depends on:** Phase 1

**Deliverables:**
- `backend/src/scripts/seed-tournament.ts` updated
- `backend/src/routes/tournaments.routes.ts` new file
- `backend/src/controllers/tournaments.controller.ts` new file
- `backend/src/models/tournament.model.ts` new file
- `backend/src/controllers/fixtures.controller.ts` updated
- `backend/src/controllers/predictions.controller.ts` updated
- `backend/src/models/fixture.model.ts` updated
- `backend/src/models/prediction.model.ts` updated
- `backend/.env.example` updated

---

## Phase 3: Frontend — Tournament Store + Selector + Wiring
**Goal:** Add tournament store, selector UI in header, and connect fixture/predictions pages to real API with tournament filtering.

**Requirements:** REQ-11, REQ-12, REQ-13

**Depends on:** Phase 2

**Deliverables:**
- `frontend/src/store/useTournamentStore.ts` new file
- `frontend/src/api/tournaments.ts` new file
- Tournament selector component in Header
- `frontend/src/app/(main)/fixture/page.tsx` wired to API
- `frontend/src/app/(main)/predictions/page.tsx` wired to API
