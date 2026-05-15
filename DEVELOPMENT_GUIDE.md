# Guía de Desarrollo — Prodeazo

## Requisitos Previos

- **Node.js** v20+
- **Docker Desktop** (DB, Redis, Backend corren en Docker)
- **pnpm** (`npm i -g pnpm`)
- **Git**

---

## 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd ProdeazoAppNuevo
pnpm install
```

---

## 2. Variables de entorno

### Backend — `backend/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prodeazo"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="prodeazo"

REDIS_URL="redis://localhost:6379"
SESSION_SECRET="un_secreto_largo_aleatorio"

BZZOIRO_API_KEY="tu_api_key"
BZZOIRO_BASE_URL="https://sports.bzzoiro.com/api"

GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/callback"

FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
PORT=4000
```

> `TOURNAMENT_ID` y `BZZOIRO_LEAGUE_ID` ya no son necesarios — los torneos se gestionan desde la DB.

### Frontend — `frontend/.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Google Cloud Console

Orígenes JS autorizados:
```
http://localhost:3000
http://localhost:4000
```

URIs de redireccionamiento:
```
http://localhost:4000/api/auth/callback
```

---

## 3. Levantar la infraestructura

```bash
docker compose up -d
```

Levanta: **Postgres** (5432), **Redis** (6379), **Backend** (4000), **migrate** (tarea única).

Verificar que todo esté healthy:
```bash
docker compose ps
```

---

## 4. Cargar torneos (Seed)

Los torneos están definidos en `backend/src/scripts/tournaments.config.ts`. Para agregar o modificar torneos, editá ese archivo.

Correr el seed desde la carpeta `backend/`:

```bash
cd backend
pnpm seed
```

Esto crea/actualiza los registros de torneos en la DB y carga los fixtures y equipos correspondientes.

Para datos de prueba sin API key:
```bash
pnpm seed:mock
```

---

## 5. Ejecutar el frontend

```bash
cd frontend
pnpm dev
```

Disponible en [http://localhost:3000](http://localhost:3000).

---

## API Reference

Base URL: `http://localhost:4000`

### Auth

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/auth/google` | Iniciar OAuth con Google | No |
| `GET` | `/api/auth/callback` | Callback OAuth de Google | No |
| `POST` | `/api/auth/register` | Registrar usuario local | No |
| `POST` | `/api/auth/login` | Login local | No |
| `POST` | `/api/auth/logout` | Cerrar sesión | Sí |
| `GET` | `/api/auth/me` | Usuario autenticado actual | Sí |

### Tournaments

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/tournaments` | Lista de torneos activos | No |
| `GET` | `/api/tournaments/:id` | Detalle de un torneo | No |

**GET /api/tournaments**
```json
{
  "tournaments": [
    {
      "id": "cuid",
      "name": "FIFA World Cup 2026",
      "shortName": "WC2026",
      "leagueId": 27,
      "seasonIds": "188",
      "isDefault": true
    }
  ]
}
```

**GET /api/tournaments/:id**
```json
{
  "id": "cuid",
  "name": "FIFA World Cup 2026",
  "shortName": "WC2026",
  "leagueId": 27,
  "seasonIds": "188",
  "isDefault": true,
  "active": true,
  "createdAt": "2026-05-14T..."
}
```

### Fixtures

Todos los endpoints aceptan `?tournamentId=<id>`. Si se omite, usa el torneo con `isDefault = true`.

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/fixtures` | Lista de fixtures con equipos | Sí |
| `GET` | `/api/fixtures/live` | Partidos en vivo | Sí |
| `GET` | `/api/fixtures/standings` | Tabla de posiciones | Sí |

**Estados de fixture:** `not_started` · `in_progress` · `finished` · `postponed` · `cancelled`

**GET /api/fixtures** — responde paginado:
```json
{
  "count": 104,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 8390,
      "date": "2026-07-19T20:00:00.000Z",
      "round": "Final",
      "groupLabel": null,
      "status": "not_started",
      "homeScore": null,
      "awayScore": null,
      "homeTeam": { "id": 1, "name": "Argentina", "shortName": null, "logoUrl": "..." },
      "awayTeam": { "id": 2, "name": "Brasil", "shortName": null, "logoUrl": "..." }
    }
  ]
}
```

### Predictions

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/predictions` | Predicciones del usuario autenticado | Sí |
| `POST` | `/api/predictions` | Crear o actualizar predicción | Sí |

`GET /api/predictions` acepta `?tournamentId=<id>`.

**POST /api/predictions**
```json
{ "fixtureId": 8390, "homeGoals": 2, "awayGoals": 1 }
```

### Teams

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/teams` | Lista de equipos | Sí |

### Mini-Leagues

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/mini-leagues` | Ligas del usuario | Sí |
| `POST` | `/api/mini-leagues` | Crear liga | Sí |
| `POST` | `/api/mini-leagues/join` | Unirse a liga por código | Sí |

### Leaderboard

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/leaderboard` | Ranking global | Sí |

---

## Torneos — Agregar uno nuevo

Editá `backend/src/scripts/tournaments.config.ts`:

```typescript
export const TOURNAMENTS: TournamentSeedConfig[] = [
  {
    name: 'FIFA World Cup 2026',
    shortName: 'WC2026',
    leagueId: '27',
    seasonId: '188',
    isDefault: true,       // ← solo uno puede ser default
  },
  {
    name: 'Premier League 2025/26',
    shortName: 'PL2526',
    leagueId: '1',
    seasonId: '337',
    isDefault: false,
  },
  // Agregar más acá...
]
```

Para encontrar el `leagueId` y `seasonId` de Bzzoiro:
```bash
# Buscar ligas por país
curl "https://sports.bzzoiro.com/api/v2/leagues/?country=England" \
  -H "Authorization: Token <BZZOIRO_API_KEY>"

# Ver temporadas de una liga
curl "https://sports.bzzoiro.com/api/v2/leagues/<leagueId>/seasons/" \
  -H "Authorization: Token <BZZOIRO_API_KEY>"
```

---

## Comandos útiles

```bash
# Ver logs del backend
docker compose logs -f backend

# Reconstruir backend tras cambios
docker compose up --build -d backend

# Reiniciar todo
docker compose restart

# Apagar (mantiene datos)
docker compose down

# Apagar y borrar DB
docker compose down -v

# Chequear puertos activos
docker compose ps
```

---

## Solución de problemas

**Puerto 3000 ocupado** — el frontend arranca en 3001. Verificar con `docker compose ps`.

**Error 404 en rutas de Next.js**
```bash
cd frontend && Remove-Item -Recurse -Force .next && pnpm dev
```

**Error CORS** — verificar que `backend/src/index.ts` incluya el origen del frontend en la lista de `origins`.

**Error de autenticación en la DB** — verificar que `DATABASE_URL` en `backend/.env` apunte al puerto correcto (5432 para Docker).

**Fixtures sin equipos (muestran `?`)** — los equipos del Mundial 2026 son placeholders hasta que se realice el sorteo. Correr `pnpm seed` de nuevo cuando Bzzoiro tenga los datos reales.
