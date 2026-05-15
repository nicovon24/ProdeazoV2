# ProdeazoApp

## What We're Building

A football predictions app (prode) supporting multiple tournaments. Users predict match scores, earn points, and compete in mini-leagues. The app currently supports a single tournament (FIFA World Cup 2026) but needs to be extended to support multiple concurrent tournaments (e.g., Premier League).

## Tech Stack

- **Backend:** Node.js + Express + TypeScript, Drizzle ORM, PostgreSQL, Redis, Passport.js (Google OAuth + local)
- **Frontend:** Next.js 15 + TypeScript, CSS Modules
- **Infrastructure:** Docker Compose (backend, db, redis), Vercel (frontend)
- **Data provider:** Bzzoiro sports API

## Current State

- Auth (Google OAuth + local) is working
- Backend API is functional: fixtures, predictions, mini-leagues, leaderboard, teams
- Frontend has 6 pages implemented but mostly with mock data
- Single tournament hardcoded via env vars (TOURNAMENT_ID, BZZOIRO_LEAGUE_ID)
- No multi-tournament support

## Project Goals

1. Add multi-tournament support (DB schema + API + frontend selector)
2. The Mundial (World Cup) must be the default tournament
3. API endpoints accept `?tournamentId=` param; if omitted, use the default tournament
4. Seed script must support seeding multiple tournaments independently

## Key Constraints

- Backward compatibility: existing endpoints must work without `tournamentId` param (use default)
- Teams are global (shared across tournaments)
- Predictions are scoped to fixtures, which are scoped to tournaments (no direct FK needed on predictions)
