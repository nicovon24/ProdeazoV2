# PRODEAZO FIFA 2026 — Backend (AGENTS)

Guía para trabajar **solo** en este paquete: API Express, datos y jobs. El cliente web u otras apps consumen esta API; no van descritas acá.

## Dominio (contexto mínimo)

App de pronósticos (prode) para el Mundial 2026. Los usuarios cargan resultados antes de cada partido y suman puntos según precisión. Hay mini-ligas privadas (grupos) con códigos de invitación.

## Estructura de carpetas (`backend/`)

```
src/
├── controllers/   # Handlers HTTP (delgados; delegan en models/services)
├── models/        # Consultas Drizzle
├── services/      # Reglas de negocio, caché, APIs externas
├── providers/     # Abstracción de proveedor de datos (Bzzoiro / API-Football)
├── routes/        # Routers Express
├── middleware/    # requireAuth, errores, etc.
├── db/            # Cliente Drizzle + schema
├── config/        # Passport, Redis, sesión
├── jobs/          # Job recurrente de sincronización de puntajes
└── scripts/       # Seeds y utilidades CLI
drizzle/           # Migraciones generadas + meta
```

## Stack

- **Runtime**: Node.js, Express 5, TypeScript estricto (`tsx` en dev)
- **ORM**: Drizzle + `drizzle-kit` — schema en `src/db/schema.ts`
- **DB**: PostgreSQL (`pg`)
- **Caché / sesiones**: Redis (`ioredis`, `connect-redis`)
- **Auth**: Passport (Google OAuth 2.0 + local)
- **Validación**: Zod v4
- **Paquetes**: este directorio declara `packageManager` pnpm; los scripts también funcionan con `npm run` desde `backend/`

## Proveedores de datos

El fixture real viene de una capa de proveedor, no de lógica suelta en controllers:

- `src/providers/` — adaptador, HTTP, refresh de tokens
- `src/services/bzzoiro.service.ts` — integración Bzzoiro BSD (torneo de prueba)
- Conmutar proveedor solo vía `DATA_PROVIDER` y la capa de providers, **sin** condicionales dispersos en controllers o models
- API-Football es el respaldo documentado / fuente esperada para el WC

## Esquema (`src/db/schema.ts`)

Tablas principales: `teams`, `fixtures`, `predictions`, `users`, `mini_leagues`, `mini_league_members`

Invariants útiles:

- `(user_id, fixture_id)` único en `predictions` — un pronóstico por usuario y partido
- `(mini_league_id, user_id)` único en `mini_league_members`
- IDs con CUID2 (`@paralleldrive/cuid2`), salvo `teams.id` y `fixtures.id` que siguen IDs enteros del upstream

## Puntajes

- Lógica en `src/services/scoring.ts` — funciones puras, sin acceso a DB dentro del cálculo
- Job de sincronización: `src/jobs/score-sync.ts`

## Reglas de implementación (API)

- Cada ruta nueva: validación Zod, `requireAuth` donde corresponda, y `asyncHandler` en handlers async (Express 5 maneja rechazos distinto a v4)
- Invalidación de caché (fixtures, leaderboard) centralizada en `CacheService` — no llamar Redis directamente desde controllers
- Sin segundo servidor/API paralelo salvo decisión explícita de arquitectura
- URLs, tokens y secretos desde `src/env.ts`, no hardcodeados

## Comandos (desde `backend/`)

```bash
pnpm dev          # o: npm run dev
pnpm db:push      # aplicar schema a la DB
pnpm db:studio    # Drizzle Studio
pnpm seed         # datos de torneo de prueba
pnpm build && pnpm start   # producción local
```

## Convenciones de archivos

- **Controllers**: req/res, Zod, llaman model o service, responden JSON
- **Models**: solo Drizzle, sin reglas de negocio
- **Services**: negocio + HTTP externos; pueden usar models
- **Routes**: montan controllers y middleware, sin lógica
- **Utilidades**: `asyncHandler`, `apiError`, `paginate`, etc. según el código existente

## Evitar

- Importar Drizzle o `pg` en controllers — usar models
- Calcular puntos fuera de `scoring.ts`
- Commitear `.env` o secretos de sesión

## Referencias en el repo

- Roadmap / planificación: `.planning/ROADMAP.md`, `.planning/PROJECT.md`
- Schema: `src/db/schema.ts`
- Migraciones: `drizzle/`
