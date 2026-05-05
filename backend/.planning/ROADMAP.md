# Roadmap — ProdeazoApp Backend

**5 phases** | **13 requirements mapped** | All v1 requirements covered ✓

## Overview

| # | Phase | Goal | Requirements | Plans |
|---|-------|------|--------------|-------|
| 1 | Security & Error Handling | El backend no crashea y no expone internals | SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06 | 2 |
| 2 | Schema & Startup Integrity | DB constraints correctos, startup seguro, provider sin bugs | DB-01, DB-02, HTTP-01 | 1 |
| 3 | Score Sync Worker | Scores de fixtures se actualizan en la DB desde Bzzoiro | SYNC-01 | 1 |
| 4 | Auto-Scoring | Las predicciones reciben puntos automáticamente cuando termina un partido | SYNC-02, SYNC-03 | 1 |
| 5 | Leaderboard API | Los usuarios pueden ver el ranking global | API-01 | 1 |

---

## Phase 1: Security & Error Handling

**Goal:** El backend no crashea ante errores de DB/provider, no expone datos internos, y valida inputs en el boundary del usuario.

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06

**UI hint:** no

### Plan 1.1 — Async Safety & Global Error Handler

**Goal:** Ningún error async crashea el proceso; todos los errores devuelven JSON estructurado.

**Tasks:**
1. Crear `backend/src/utils/asyncHandler.ts` — wrapper `(fn) => (req, res, next) => Promise.resolve(fn(...)).catch(next)`
2. Wrappear todos los handlers en `fixtures.routes.ts`, `teams.routes.ts`, `auth.routes.ts`, `predictions.routes.ts` con `asyncHandler`
3. Agregar global error handler en `backend/src/index.ts` — `app.use((err, req, res, next) => res.status(500).json({error: err.message}))` con chequeo `NODE_ENV` para no exponer stack en prod
4. Agregar cookie options `sameSite: 'lax'` e `httpOnly: true` en la config de session en `index.ts`

**Verification:**
- Forzar un error en un handler (throwear deliberado) → debe devolver `{error: "..."}` con 500, no crashear el proceso
- Verificar en las devtools del browser que la cookie tiene SameSite=Lax y HttpOnly

### Plan 1.2 — Input Validation & Auth Scrubbing

**Goal:** Inputs del usuario validados en el boundary; auth no expone datos internos.

**Tasks:**
1. Agregar dependencia `zod` en `backend/package.json`
2. Crear schema Zod en `predictions.routes.ts`: `{ fixtureId: z.number().int().positive(), homeGoals: z.number().int().min(0).max(20), awayGoals: z.number().int().min(0).max(20) }` — devolver 400 si falla
3. En `auth.routes.ts` GET /me: destructurar el user de la DB y devolver solo `{id, email, name, avatar}`
4. En `auth.routes.ts` POST /logout: agregar `req.session.destroy()` después de `req.logout()`, manejar el callback con next(err)

**Verification:**
- POST /api/predictions con body `{}` → debe devolver 400 con mensaje de validación
- POST /api/predictions con homeGoals: -1 → debe devolver 400
- GET /api/auth/me → respuesta no debe tener campo `googleId`
- POST /api/auth/logout → cookie de sesión debe eliminarse (verificar en Redis que la clave desapareció)

**Success Criteria:**
1. Un handler que throwea no mata el proceso — el servidor sigue respondiendo
2. POST /api/predictions sin body devuelve 400 con descripción del error
3. GET /api/auth/me no expone googleId
4. La cookie de sesión tiene SameSite=Lax e HttpOnly

---

## Phase 2: Schema & Startup Integrity

**Goal:** El schema de DB refleja las constraints reales, la app falla rápido si le faltan env vars, y el provider no hace requests redundantes.

**Requirements:** DB-01, DB-02, HTTP-01

**UI hint:** no

### Plan 2.1 — DB Constraints, Env Validation & HTTP Fix

**Tasks:**
1. En `backend/src/db/schema.ts`: agregar `.notNull()` a `userId` y `fixtureId` en la tabla `predictions`
2. Correr la migración de Drizzle para aplicar los constraints (`pnpm drizzle-kit generate` + `pnpm drizzle-kit migrate`)
3. En `backend/src/env.ts` (o crearlo): validar las variables requeridas al startup con un array de checks, `process.exit(1)` si falta alguna
4. Importar `env.ts` al inicio de `backend/src/index.ts` (antes de cualquier otra importación)
5. En `backend/src/providers/http.ts`, función `getAllPages`: revisar la condición de corte del loop — cuando `data.length < pageSize` (no `<=`) es cuando se debe cortar; validar con el caso borde N*pageSize exacto

**Verification:**
- Intentar insertar una prediction sin userId via Drizzle → debe fallar con constraint error
- Iniciar la app con `DATABASE_URL` undefined → debe loguear el error y salir con código 1
- Testear `getAllPages` con un mock que devuelve exactamente `pageSize` items en la primera página y 0 en la segunda → no debe hacer el tercer request

**Success Criteria:**
1. La tabla predictions tiene NOT NULL en userId y fixtureId (verificar con `\d predictions` en psql)
2. La app hace `process.exit(1)` con mensaje claro si falta una env var crítica
3. `getAllPages` no hace requests extra cuando el total es múltiplo del page size

---

## Phase 3: Score Sync Worker

**Goal:** Los scores de los fixtures en la DB se mantienen actualizados automáticamente desde Bzzoiro.

**Requirements:** SYNC-01

**UI hint:** no

### Plan 3.1 — Score Sync Job

**Tasks:**
1. Crear `backend/src/jobs/score-sync.ts` — función `runScoreSync()` que:
   a. Obtiene de la DB todos los fixtures con status `NS` o `inprogress` y fecha = hoy
   b. Llama al provider de Bzzoiro para obtener scores actualizados
   c. Para cada fixture con cambios en homeScore, awayScore o status: hace `UPDATE` en la DB
   d. Loguea los fixtures actualizados con `console.log`
2. Agregar error handling: si Bzzoiro falla, loguear el error pero no tirar el proceso
3. Arrancar el job en `backend/src/index.ts` con `setInterval(runScoreSync, 60_000)` después de que el servidor esté levantado
4. Correr `runScoreSync()` una vez al arrancar (no esperar el primer intervalo)

**Verification:**
- Cambiar manualmente el score de un fixture en la DB a algo incorrecto → esperar ≤60s → verificar que se corrigió
- Simular error de Bzzoiro (apagar el mock/staging) → el servidor sigue corriendo, el job loguea el error

**Success Criteria:**
1. Los scores en la DB se actualizan sin intervención manual
2. Un error del provider no mata el proceso — el servidor sigue respondiendo requests
3. Al reiniciar el servidor, el primer sync corre inmediatamente (no espera 60s)

---

## Phase 4: Auto-Scoring

**Goal:** Las predicciones de los usuarios reciben puntos automáticamente cuando un partido termina.

**Requirements:** SYNC-02, SYNC-03

**UI hint:** no

### Plan 4.1 — Scoring Integration

**Tasks:**
1. En `score-sync.ts`, después de detectar que un fixture cambió a status `FT`:
   a. Obtener todas las predicciones para ese fixture de la DB
   b. Para cada predicción, llamar `calculatePredictionPoints(prediction, fixture)` de `scoring.ts`
   c. `UPDATE predictions SET points = [resultado]` en la DB
2. Asegurarse de que el scoring solo corra UNA vez por fixture (no re-calcular si ya fue calculado) — chequear que `predictions.points IS NULL` antes de calcular, o que el fixture estaba `inprogress` en el ciclo anterior
3. Loguear el scoring: `console.log("Fixture FT: ${fixture.id} — ${n} predictions scored")`

**Verification:**
- Insertar un fixture con status `inprogress` en la DB, insertar predicciones para ese fixture
- Cambiar el status a `FT` manualmente y esperar al próximo ciclo del job (o triggerear manualmente)
- Verificar en la DB que `predictions.points` tiene el valor correcto según la lógica de `scoring.ts`
- Cambiar el fixture a `FT` de nuevo → las predicciones NO deben re-calcular (idempotente)

**Success Criteria:**
1. Cuando un fixture pasa a FT, todas sus predicciones tienen `points` seteado en la DB
2. El cálculo es idempotente — correr el sync dos veces no duplica los puntos
3. El valor de points coincide con la lógica de `calculatePredictionPoints` para ese resultado

---

## Phase 5: Leaderboard API

**Goal:** El frontend puede obtener el ranking de usuarios por puntos totales.

**Requirements:** API-01

**UI hint:** no

### Plan 5.1 — Leaderboard Endpoint

**Tasks:**
1. Crear `backend/src/routes/leaderboard.routes.ts` con GET `/`:
   ```sql
   SELECT users.id, users.name, users.avatar, SUM(predictions.points) as totalPoints
   FROM predictions
   JOIN users ON predictions.userId = users.id
   WHERE predictions.points IS NOT NULL
   GROUP BY users.id, users.name, users.avatar
   ORDER BY totalPoints DESC
   ```
2. Wrappear el handler con `asyncHandler`
3. Registrar la route en `index.ts` como `app.use('/api/leaderboard', leaderboardRoutes)`
4. Si no hay predicciones con puntos aún, devolver array vacío `[]` (no 404)

**Verification:**
- Insertar predicciones con points en la DB para 2-3 usuarios → GET /api/leaderboard → debe devolver array ordenado por totalPoints DESC
- GET /api/leaderboard sin datos → debe devolver `[]` con status 200

**Success Criteria:**
1. GET /api/leaderboard devuelve JSON array ordenado por puntos totales
2. Usuarios sin predicciones puntuadas no aparecen en el ranking
3. El endpoint devuelve 200 con `[]` si no hay datos aún

---

## Dependency Order

```
Phase 1 (Hardening)
    ↓
Phase 2 (Schema + Startup)
    ↓
Phase 3 (Sync Worker)
    ↓
Phase 4 (Auto-Scoring) ← depende del sync worker
    ↓
Phase 5 (Leaderboard) ← depende de que haya puntos en la DB
```

Phases 1 y 2 pueden hacerse en cualquier orden o en paralelo — son independientes entre sí. Las demás siguen la cadena.
