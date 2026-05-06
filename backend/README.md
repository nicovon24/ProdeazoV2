# Prodeazo — API backend

API HTTP del proyecto (Express + Drizzle + Postgres). Las rutas están bajo el prefijo **`/api`**. Puerto por defecto: **`4000`** (`PORT` en `.env`).

## Convenciones generales

| Tema | Detalle |
|------|---------|
| Formato | JSON (`Content-Type: application/json` donde aplica). |
| CORS | Origen permitido: `FRONTEND_URL` (default `http://localhost:5173`). Credenciales habilitadas (`credentials: true`). |
| Sesión | Cookie `connect.sid` tras login. El cliente debe enviar `credentials: 'include'` en cada request. |
| Seguridad | `helmet` activo en todos los endpoints. Headers: `X-Content-Type-Options`, `X-Frame-Options`, etc. |
| Trazabilidad | Cada response incluye `X-Request-Id` (UUID). |

Variables de entorno: copiá **`backend/.env.example`** a **`backend/.env`** o **`backend/.env.local`** y completá valores.

---

## Formato de respuestas

### Listas (GET de colecciones)

Todos los endpoints GET que devuelven listas usan el formato paginado:

```json
{
  "count": 64,
  "next": null,
  "previous": null,
  "results": [ ... ]
}
```

**Sin parámetros** → devuelve todos los resultados, `next` y `previous` son `null`.

**Con paginación** (`?page=N&limit=M`, default limit: 20):

```
GET /api/fixtures?page=2&limit=10
```

```json
{
  "count": 64,
  "next": "/api/fixtures?page=3&limit=10",
  "previous": "/api/fixtures?page=1&limit=10",
  "results": [ ... ]
}
```

### Errores

Todos los errores tienen el formato:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Fixture not found"
  }
}
```

| Código | HTTP | Descripción |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Body inválido o parámetros incorrectos |
| `UNAUTHORIZED` | 401 | No autenticado |
| `FORBIDDEN` | 403 | Autenticado pero sin permisos |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `CONFLICT` | 409 | Conflicto (email duplicado, ya miembro, etc.) |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |

---

## Endpoints

### Salud

#### `GET /api/health`

```json
{ "ok": true }
```

---

### Autenticación (`/api/auth`)

La API soporta dos métodos de autenticación. Ambos usan el mismo sistema de sesión (cookie `connect.sid`).

#### Google OAuth

Requiere `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y callback configurado en Google Console.

#### `GET /api/auth/google`

Inicia el flujo OAuth (redirect al proveedor).

- **503** si OAuth no está configurado.

#### `GET /api/auth/callback`

Callback de Google (Passport redirige automáticamente).

---

#### Autenticación local (email + contraseña)

#### `POST /api/auth/register`

Crea una cuenta nueva con email y contraseña.

**Body JSON**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "minimo8chars",
  "name": "Nombre Apellido"
}
```

**Respuesta**

- **201** — Usuario creado y sesión iniciada:
  ```json
  { "user": { "id": "...", "email": "...", "name": "...", "avatar": null, "authProvider": "local" } }
  ```
- **400** — `VALIDATION_ERROR` (email inválido, password < 8 chars, nombre vacío).
- **409** — `CONFLICT` — el email ya está en uso.

#### `POST /api/auth/login`

Inicia sesión con email y contraseña.

**Body JSON**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "minimo8chars"
}
```

**Respuesta**

- **200** — Sesión iniciada:
  ```json
  { "user": { "id": "...", "email": "...", "name": "...", "avatar": null, "authProvider": "local" } }
  ```
- **401** — `UNAUTHORIZED` — credenciales incorrectas.

---

#### `GET /api/auth/me`

Usuario de la sesión actual.

- **200** — `{ "user": { "id", "email", "name", "avatar", "authProvider" } }`
- **401** — `{ "user": null }` si no hay sesión.

#### `POST /api/auth/logout`

Cierra sesión y destruye la cookie.

- **200** — `{ "ok": true }`

---

### Equipos (`/api/teams`) — sin autenticación

#### `GET /api/teams`

Lista todos los equipos. Respuesta paginada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del equipo. |
| `name` | string | Nombre completo. |
| `shortName` | string \| null | Nombre corto. |
| `logoUrl` | string \| null | URL del escudo. |
| `groupLabel` | string \| null | Etiqueta de grupo. |

---

### Partidos / fixtures (`/api/fixtures`) — sin autenticación

#### `GET /api/fixtures`

Lista partidos persistidos en Postgres. Respuesta paginada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del evento. |
| `homeTeamId` | number \| null | FK a `teams`. |
| `awayTeamId` | number \| null | FK a `teams`. |
| `homeTeamName` | string \| null | Nombre del equipo local. |
| `awayTeamName` | string \| null | Nombre del equipo visitante. |
| `date` | string (ISO) | Horario del partido. |
| `round` | string \| null | Etiqueta de fase. |
| `status` | string | `NS`, `inprogress`, `FT`, etc. |
| `homeScore` | number \| null | Goles local. |
| `awayScore` | number \| null | Goles visitante. |

#### `GET /api/fixtures/live`

Partidos en juego desde Bzzoiro v2. Respuesta paginada. **Caché Redis 60 s.**

#### `GET /api/fixtures/standings`

Tabla de posiciones desde Bzzoiro v2. Respuesta paginada. **Caché Redis 900 s.**

---

### Predicciones (`/api/predictions`) — requiere sesión

#### `GET /api/predictions`

Lista las predicciones del usuario autenticado. Respuesta paginada.

| Campo | Tipo |
|-------|------|
| `id` | string (cuid) |
| `fixtureId` | number |
| `homeGoals` | number |
| `awayGoals` | number |
| `points` | number \| null |
| `createdAt` | string (ISO) \| null |

#### `POST /api/predictions`

Crea o actualiza la predicción del usuario para un `fixtureId`. Implementado como upsert atómico (`ON CONFLICT DO UPDATE`) para evitar duplicados por concurrencia.

> **Las predicciones se bloquean cuando el partido arranca** (`status !== 'NS'`).

**Body JSON**

```json
{ "fixtureId": 204851, "homeGoals": 2, "awayGoals": 1 }
```

- **201** — Predicción guardada.
- **400** — `VALIDATION_ERROR`.
- **404** — `NOT_FOUND` — fixture no encontrado.
- **409** — `CONFLICT` — partido ya iniciado.

---

### Leaderboard global (`/api/leaderboard`) — requiere sesión

#### `GET /api/leaderboard`

Ranking global de todos los usuarios ordenado por puntos totales. Respuesta paginada.

```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    { "id": "...", "name": "Nico", "avatar": "...", "totalPoints": 42 },
    ...
  ]
}
```

---

### Mini Ligas (`/api/mini-leagues`) — requiere sesión

Grupos privados de usuarios con leaderboard propio. Cada liga tiene un código de invitación único de 8 caracteres.

#### `POST /api/mini-leagues`

Crea una liga. El creador queda como `owner`.

**Body JSON**

```json
{ "name": "Los Cracks" }
```

- **201** — Liga creada con `id` y `inviteCode`.

#### `GET /api/mini-leagues/mine`

Lista las ligas en las que participa el usuario (como owner o member). Respuesta paginada.

#### `GET /api/mini-leagues/:id`

Detalle de una liga con la lista de miembros.

- **403** si no sos miembro.
- **404** si no existe.

```json
{
  "id": "...",
  "name": "Los Cracks",
  "inviteCode": "AB12CD34",
  "creatorId": "...",
  "members": [
    { "id": "...", "name": "Nico", "avatar": "...", "role": "owner" }
  ]
}
```

#### `POST /api/mini-leagues/join` o `POST /api/mini-leagues/:id/join`

Unirse a una liga con el código de invitación.

**Body JSON**

```json
{ "code": "AB12CD34" }
```

- **201** — Unido exitosamente.
- **404** — Código inválido.
- **409** — Ya sos miembro.

#### `DELETE /api/mini-leagues/:id/leave`

Salir de una liga. El owner no puede salir (debe eliminar la liga).

#### `DELETE /api/mini-leagues/:id/members/:userId`

Expulsar a un miembro (solo el owner puede hacerlo).

#### `GET /api/mini-leagues/:id/leaderboard`

Ranking de los miembros de la liga. Solo accesible para miembros. Respuesta paginada con campo `rank`.

```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    { "id": "...", "name": "Nico", "avatar": "...", "totalPoints": 42, "rank": 1 },
    ...
  ]
}
```

---

## Sistema de puntuación

Los puntos se calculan automáticamente cuando un partido llega a `FT`. El job `score-sync` corre cada 60 s y detecta la transición.

| Caso | Puntos |
|------|--------|
| Resultado exacto (predijo 2-1, salió 2-1) | **5** |
| Ganador correcto (predijo 2-0, salió 3-1) | **3** |
| Empate correcto (predijo 1-1, salió 0-0) | **1** |
| Cualquier otro | **0** |

El scoring es **idempotente**: solo se puntúan predicciones con `points IS NULL`. El job cubre fixtures de días anteriores para manejar demoras en la API externa.

---

## Integración Bzzoiro (referencia rápida)

| Uso | Endpoint BSD v2 |
|-----|-----------------|
| Partidos en vivo | `GET /v2/events/?status=inprogress&limit=200` |
| Tabla | `GET /v2/leagues/{leagueId}/standings/` |

---

## Scripts útiles

- **`pnpm seed`** — Seed de fixtures desde Bzzoiro. Prioridad: `BZZOIRO_EVENTS_*` (rango de fechas) → `BZZOIRO_FIXTURE_SEASON_IDS` → `BZZOIRO_LEAGUE_ID` solo → `TOURNAMENT_ID`. Ver `.env.example`.
- **`pnpm db:push`** — Aplica el schema Drizzle a la base de datos.

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

Configurar `.env`, aplicar schema (`pnpm db:push`). Redis es opcional (caché de live/standings; sessions en memoria en desarrollo).
