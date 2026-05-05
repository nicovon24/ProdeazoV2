# ProdeazoApp — Backend

## What This Is

Backend Node.js/TypeScript para un prode del Mundial 2026. Los usuarios se logean con Google, hacen predicciones de resultados de partidos, y ganan puntos según la precisión. El backend consume la API de Bzzoiro para obtener fixtures, scores en vivo y standings.

## Context

El backend tiene la infraestructura de datos funcionando (auth, DB schema, cache Redis, integración Bzzoiro), pero le faltan tres cosas clave para ser deployable:
1. **Hardening** — handlers async sin try/catch, inputs sin validar, leaks de datos internos
2. **Sync loop** — los scores se actualizan en Bzzoiro pero nunca se escriben en la DB
3. **Scoring** — `calculatePredictionPoints()` existe pero nunca se llama; las predicciones no tienen puntos

El frontend lo trabaja otro dev en paralelo — este plan es 100% backend.

## Stack

- **Runtime:** Node.js + TypeScript + Express
- **DB:** PostgreSQL via Drizzle ORM
- **Cache:** Redis (ioredis)
- **Auth:** Google OAuth via Passport.js + express-session
- **Provider:** Bzzoiro API (fixtures, live scores, standings, rosters)
- **Test:** ninguno todavía

## Core Value

Los usuarios pueden hacer predicciones y ver cuántos puntos ganaron al terminar cada partido.

## Requirements

### Validated (already in codebase)

- ✓ Auth Google OAuth con sessions Redis
- ✓ DB schema: users, teams, players, fixtures, predictions
- ✓ Routes: auth, teams, fixtures (/live, /standings), predictions CRUD
- ✓ Bzzoiro integration con cache Redis (TTLs)
- ✓ Seed script para fixtures/teams/players
- ✓ Scoring logic escrita (scoring.ts)

### Active

- [ ] **SEC-01** — Todos los route handlers async wrapped con try/catch o asyncHandler
- [ ] **SEC-02** — Global error handler en Express (no exponer stack traces)
- [ ] **SEC-03** — Zod validation en predictions POST/PUT
- [ ] **SEC-04** — Auth /me solo devuelve {id, email, name, avatar} (no googleId)
- [ ] **SEC-05** — Logout destruye la sesión (session.destroy, no solo req.logout)
- [ ] **SEC-06** — Cookie con sameSite: 'lax' y httpOnly: true
- [ ] **DB-01** — notNull en userId y fixtureId de la tabla predictions
- [ ] **DB-02** — Validar DATABASE_URL y variables críticas al startup
- [ ] **HTTP-01** — Fix off-by-one en getAllPages (http.ts) para fetches de N páginas exactas
- [ ] **SYNC-01** — Job que actualiza homeScore/awayScore/status en fixtures cada ~60s desde Bzzoiro
- [ ] **SYNC-02** — Cuando un fixture pasa a FT, correr calculatePredictionPoints para todas sus predicciones
- [ ] **SYNC-03** — UPDATE predictions.points en DB con el resultado del scoring
- [ ] **API-01** — GET /api/leaderboard — ranking de usuarios por puntos totales

### Out of Scope

- Frontend — lo trabaja el compañero
- WebSockets / SSE — el frontend pollea; el backend no necesita push
- Tests automatizados en esta milestone — el foco es estabilidad funcional
- CI/CD — fuera de scope por ahora

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| setInterval en index.ts para el sync job | Más simple, no requiere dependencias extra. El WC 2026 tiene tráfico predecible y baja concurrencia | Pending |
| Zod solo en boundaries (predictions) | Inputs de auth los maneja Passport; fixtures/teams son read-only del provider | Pending |
| asyncHandler wrapper en lugar de try/catch por handler | DRY, un lugar para cambiar el error handling | Pending |

## Evolution

Este documento evoluciona en cada transición de fase y milestone.

**Después de cada fase:**
1. ¿Algún requirement invalidado? → Mover a Out of Scope con razón
2. ¿Requirements validados? → Mover a Validated con referencia de fase
3. ¿Emergieron nuevos requirements? → Agregar a Active
4. ¿Decisiones para loguear? → Agregar a Key Decisions

---
*Last updated: 2026-05-04 — inicialización del proyecto*
