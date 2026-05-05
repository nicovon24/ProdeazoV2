# Requirements — ProdeazoApp Backend

## v1 Requirements

### Security & Error Handling

- [ ] **SEC-01** — Todos los route handlers async están wrapped con asyncHandler (no crasha el proceso ante errores de DB)
- [ ] **SEC-02** — Existe un global error handler en Express que devuelve JSON `{error: message}` y no expone stack traces en producción
- [ ] **SEC-03** — El endpoint POST /api/predictions valida el body con Zod (fixtureId: number, homeGoals: number 0-20, awayGoals: number 0-20) y devuelve 400 con mensaje claro si inválido
- [ ] **SEC-04** — GET /api/auth/me solo devuelve `{id, email, name, avatar}` — nunca expone googleId ni campos internos
- [ ] **SEC-05** — POST /api/auth/logout llama `req.session.destroy()` además de `req.logout()` para invalidar la sesión en Redis
- [ ] **SEC-06** — La cookie de sesión tiene `sameSite: 'lax'` e `httpOnly: true`

### DB & Startup Integrity

- [ ] **DB-01** — Las columnas `userId` y `fixtureId` de la tabla `predictions` tienen constraint `NOT NULL` en el schema de Drizzle
- [ ] **DB-02** — Al startup, la app valida que `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` estén definidas — si falta alguna, loguea el error y hace `process.exit(1)`

### HTTP Provider Fix

- [ ] **HTTP-01** — `getAllPages` en `http.ts` no hace un request extra cuando el total de resultados es múltiplo exacto del page size (fix off-by-one en la condición de corte)

### Score Sync

- [ ] **SYNC-01** — Un job (setInterval o node-cron) corre cada 60 segundos y llama al provider de Bzzoiro para obtener scores en vivo, actualizando `homeScore`, `awayScore` y `status` en la tabla `fixtures` de la DB para los fixtures con status `inprogress` o `NS` del día actual
- [ ] **SYNC-02** — Cuando un fixture cambia su status a `FT` (full time), el job corre `calculatePredictionPoints()` de `scoring.ts` para cada predicción asociada a ese fixture
- [ ] **SYNC-03** — Los puntos calculados se escriben en `predictions.points` via UPDATE en la DB

### Leaderboard API

- [ ] **API-01** — Existe el endpoint GET /api/leaderboard que devuelve un array de `{userId, name, avatar, totalPoints}` ordenado por `totalPoints` DESC, calculado como SUM de `predictions.points` agrupado por userId con JOIN a users

## v2 Requirements (deferred)

- Notificaciones cuando un partido empieza o termina
- Endpoint de historial de predicciones por usuario
- Cache de leaderboard en Redis (actualmente es query directa)
- Rate limiting en endpoints de predicciones
- Tests automatizados (unit + integration)

## Out of Scope

- Frontend — trabaja otro dev
- WebSockets / SSE — el frontend pollea, no necesita push del backend
- CI/CD pipeline
- Múltiples torneos (solo WC 2026 por ahora)

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| SEC-01, SEC-02, SEC-06 | Phase 1: Security & Error Handling | Plan 1.1 |
| SEC-03, SEC-04, SEC-05 | Phase 1: Security & Error Handling | Plan 1.2 |
| DB-01, DB-02, HTTP-01 | Phase 2: Schema & Startup Integrity | Plan 2.1 |
| SYNC-01 | Phase 3: Score Sync Worker | Plan 3.1 |
| SYNC-02, SYNC-03 | Phase 4: Auto-Scoring | Plan 4.1 |
| API-01 | Phase 5: Leaderboard API | Plan 5.1 |
