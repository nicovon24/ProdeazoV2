# Prodeazo (2026 World Cup pool)

This app is intended to be a predictions and football statistics platform,
starting with the 2026 World Cup and scaling later to other tournaments.

## What will the project cover?
The platform will let users:
- View fixtures and live results.
- Submit match predictions.
- Earn points for correct picks.
- Compare users in global and league-specific rankings.
- Look up team, player, and match statistics.

## Planned features and modules

### 1) Core module (MVP)
- **Fixtures**: match list with states (pending, live, finished).
- **Predictions**: enter results before kick-off.
- **Global ranking**: leaderboard by points.
- **Head-to-head**: user vs user, match by match.
- **Tournament picks**: champion, top scorer, and other specials.
- **Profile**: personal summary (hits, points, history).

### 2) Mini leagues and admin (phase 2)
- **Private/public mini leagues** with invite codes.
- **Mini league leaderboard**.
- **Admin panel** for manual adjustments (results, scoring, users).

### 3) Statistics module & multi-tournament expansion (phase 3)
- **Groups and brackets** for the active tournament.
- **Top scorers, assists, and deeper metrics**.
- **Match view** with events and enriched data.
- **Team and player profiles**.
- **Reusable base for adding tournaments** (cups and international leagues).

## Stack (initial choice)
Built with:
- **Next.js + TypeScript** for the frontend and main structure.
- **Supabase + PostgreSQL** for auth, database, and backend services.
- **Tailwind + NextUI** for the UI layer.
- **Bzzoiro BSD** as the primary fixtures/results source.

## Local development

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). You do not need Node or PostgreSQL installed locally.

```bash
# Copy .env and set SESSION_SECRET at minimum
cp backend/.env.example backend/.env

# Build, migrations, and start
docker compose up --build
```

Migrations run automatically. The backend is available at `http://localhost:3000`.

## High-level roadmap
- **Phase 1 (MVP):** predictions + ranking.
- **Phase 2:** mini leagues and admin.
- **Phase 3:** full statistics module and multi-tournament growth.

> Goal: ship the first version before the 2026 World Cup kicks off,
> then evolve it as a reusable product for other tournaments.
