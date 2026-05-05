# Prodeazo — API backend

API HTTP del proyecto (Express + Drizzle + Postgres). Las rutas están bajo el prefijo **`/api`**. Puerto por defecto: **`4000`** (`PORT` en `.env`; `.env.example` puede mostrar otro valor de ejemplo).

## Convenciones generales

| Tema | Detalle |
|------|---------|
| Formato | JSON (`Content-Type: application/json` donde aplica). |
| CORS | Origen permitido: `FRONTEND_URL` (default `http://localhost:5173`). Credenciales habilitadas (`credentials: true`). |
| Sesión | Cookie de sesión tras login con Google; el cliente debe enviar cookies (`fetch(..., { credentials: 'include' })`). |
| Datos externos | Partidos “live”, tabla y plantillas pueden proxificarse a **Bzzoiro Sports Data API v2** (ver más abajo). |

Variables de entorno: copiá **`backend/.env.example`** a **`backend/.env`** o **`backend/.env.local`** y completá valores.

---

## Endpoints

### Salud

#### `GET /api/health`

Comprobación simple del servidor.

**Respuesta 200**

```json
{ "ok": true }
```

---

### Autenticación (`/api/auth`)

Sesión basada en **Passport + Google OAuth**. Requiere `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y callback correcto en la consola de Google (normalmente URL del backend + `/api/auth/callback`).

#### `GET /api/auth/google`

Inicia el flujo OAuth (redirect al proveedor).

**Errores**

- **503** si OAuth no está configurado (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

#### `GET /api/auth/callback`

Callback de Google (no suele llamarse a mano; Passport redirige al finalizar).

#### `GET /api/auth/me`

Usuario de la sesión actual.

**Respuesta**

- **200** — `{ "user": { ... } }` (forma definida por Passport/`deserializeUser`).
- **401** — `{ "user": null }` si no hay sesión.

#### `POST /api/auth/logout`

Cierra sesión.

**Respuesta 200**

```json
{ "ok": true }
```

---

### Equipos (sin autenticación)

Datos de equipos cargados en **Postgres** (p. ej. vía script de seed). Las plantillas se obtienen en vivo desde Bzzoiro.

#### `GET /api/teams`

Lista todos los equipos persistidos.

**Respuesta 200** — Array de objetos acorde al esquema `teams`:

| Campo (JSON típico) | Tipo | Descripción |
|---------------------|------|-------------|
| `id` | number | ID del equipo (pk BSD numérica). |
| `name` | string | Nombre para mostrar. |
| `shortName` | string \| null | Nombre corto. |
| `logoUrl` | string \| null | URL del escudo (si se guardó). |
| `groupLabel` | string \| null | Etiqueta de grupo (opcional). |

#### `GET /api/teams/:id/players`

Plantilla del equipo **desde Bzzoiro** (`GET /api/v2/teams/{id}/squad/`). No lee la tabla local `players`. Respuesta cacheada en Redis si está disponible.

**Parámetros de ruta**

- `id` — ID numérico del equipo (&gt; 0).

**Respuesta 200** — Array de objetos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del jugador en BSD. |
| `name` | string | Nombre. |
| `position` | string \| null | Posición abreviada (p. ej. `M`). |
| `number` | number \| null | Dorsal. |
| `photoUrl` | string \| null | URL de foto BSD. |

**Errores**

- **400** — `id` inválido.
- **502** — Fallo al llamar al proveedor (mensaje en `error`).

**TTL de caché** — `BZZOIRO_PLAYERS_CACHE_TTL_SEC` (default **120** s).

---

### Partidos / fixtures (`/api/fixtures`)

#### `GET /api/fixtures`

Lista partidos persistidos en Postgres (snapshot tras seed u otro proceso).

**Respuesta 200** — Array según tabla `fixtures`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del evento BSD. |
| `homeTeamId` | number \| null | FK a `teams`. |
| `awayTeamId` | number \| null | FK a `teams`. |
| `date` | string (ISO) | Horario del partido. |
| `round` | string \| null | Etiqueta de fase (`round_name`, `group_name` o número en BSD). |
| `roundNumber` | number \| null | `round_number` de BSD v2. |
| `groupLabel` | string \| null | P. ej. `Group J` desde `group_name`. |
| `leagueId` | number \| null | `league_id` BSD (p. ej. 27 Mundial). |
| `seasonId` | number \| null | `season_id` BSD del evento (grupo vs knockout puede diferir). |
| `status` | string | P. ej. `NS`, `LIVE`, `FT`, `PST`, `CAN`. |
| `homeScore` | number \| null | Goles local (si hay resultado). |
| `awayScore` | number \| null | Goles visitante. |

Cuando los nombres en BD siguen siendo placeholders de bracket (`W101`, `1A`, …), la API puede **superponer** `home_team` / `away_team` desde BSD v2: primero con **`BZZOIRO_LEAGUE_ID`** (`GET /v2/events/?league_id=…`, todas las temporadas del torneo); si no está definido, con **`TOURNAMENT_ID`** como `season_id`. Requiere `BZZOIRO_API_KEY`; Redis opcional para TTL.

#### `GET /api/fixtures/live`

Partidos **en juego** desde Bzzoiro v2 (`GET /api/v2/events/?status=inprogress`). Forma habitual de la respuesta:

```json
{ "results": [ /* eventos en formato v2 */ ] }
```

**Caché Redis** — **60** s; clave incluye `TOURNAMENT_ID` (puede estar vacío).

#### `GET /api/fixtures/standings`

Tabla de posiciones desde Bzzoiro v2: `GET /api/v2/leagues/{BZZOIRO_LEAGUE_ID}/standings/` con query opcional `season_id` si definís `TOURNAMENT_ID`.

**Caché Redis** — **900** s.

Si falta `BZZOIRO_LEAGUE_ID`, la respuesta puede ser un objeto indicativo con lista vacía (ver implementación en `bzzoiro.service.ts`).

---

### Predicciones (`/api/predictions`)

**Requiere sesión autenticada** (`401` si no hay usuario).

#### `GET /api/predictions`

Lista las predicciones del usuario actual.

**Respuesta 200** — Array de filas `predictions`:

| Campo | Tipo |
|-------|------|
| `id` | string (cuid) |
| `userId` | string |
| `fixtureId` | number |
| `homeGoals` | number |
| `awayGoals` | number |
| `points` | number \| null |
| `createdAt` | string (ISO) \| null |

#### `POST /api/predictions`

Crea o **actualiza** la predicción del usuario para un mismo `fixtureId`.

**Body JSON**

```json
{
  "fixtureId": 204851,
  "homeGoals": 2,
  "awayGoals": 1
}
```

**Respuesta**

- **201** — Predicción creada (cuerpo = fila insertada).
- **200** — Predicción actualizada si ya existía para ese usuario y fixture.

---

## Integración Bzzoiro (referencia rápida)

| Uso en esta API | Endpoint BSD v2 (relativo a `BZZOIRO_BASE_URL`) |
|-----------------|--------------------------------------------------|
| Plantilla por equipo | `GET /v2/teams/{id}/squad/` |
| Partidos en vivo | `GET /v2/events/?status=inprogress&limit=200` |
| Tabla | `GET /v2/leagues/{leagueId}/standings/` (+ `season_id` opcional) |

Documentación oficial: [BSD API v2](https://sports.bzzoiro.com/docs/v2/).

---

## Scripts útiles

- **Seed de torneo** (`seed-tournament.ts`): prioridad de fixtures — rango `BZZOIRO_EVENTS_*` si definís `BZZOIRO_LEAGUE_ID` + ambas fechas; si no, `BZZOIRO_FIXTURE_SEASON_IDS` (varias temporadas BSD en un torneo, ej. grupo + knockout); si no, **`BZZOIRO_LEAGUE_ID` solo** → pagina todo `/v2/events/?league_id=` (grupos + eliminatorias; puede incluir ediciones viejas); último recurso **`TOURNAMENT_ID`** (una temporada). Detalle en `.env.example`.

---

## Arranque local

Desde **`backend/`**:

```bash
pnpm install
pnpm dev
```

Desde la **raíz del monorepo**:

```bash
pnpm dev:backend
```

Seed del torneo:

```bash
pnpm seed
```

(o `pnpm --filter backend seed`).

Antes: configurá `.env`, aplicá esquema a Postgres (`pnpm db:push` si usás Drizzle push). Redis opcional para caché de `/fixtures/live`, `/fixtures/standings` y `/teams/:id/players`.
