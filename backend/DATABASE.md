# Prodeazo — Base de datos

Postgres gestionado con **Drizzle ORM**. Schema en `src/db/schema.ts`. Para aplicar cambios: `pnpm db:push`.

---

## Diagrama de relaciones

```
teams ──────────────────────────────────────────┐
  │                                              │
  └─< fixtures (home_team_id, away_team_id) >───┘
        │
        └─< predictions (fixture_id)
                │
users >─────────┘ (user_id)
  │
  └─< predictions (user_id)
  │
  └─< mini_league_members (user_id)
              │
mini_leagues >┘ (mini_league_id)  [cascade delete]
```

---

## Tablas

### `teams`

Equipos del torneo. Cargados vía script de seed desde Bzzoiro.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | integer | PK | ID del equipo en Bzzoiro API. |
| `name` | text | NOT NULL | Nombre completo. |
| `short_name` | text | | Nombre abreviado. |
| `logo_url` | text | | URL del escudo. |
| `group_label` | text | | Etiqueta de grupo (ej: `Group A`). |

---

### `fixtures`

Partidos del torneo. Cargados vía seed; el job `score-sync` actualiza `status`, `home_score` y `away_score` en tiempo real.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | integer | PK | ID del evento en Bzzoiro API. |
| `home_team_id` | integer | FK → `teams.id` | Equipo local. |
| `away_team_id` | integer | FK → `teams.id` | Equipo visitante. |
| `date` | timestamp | NOT NULL | Fecha y hora del partido (UTC). |
| `round` | text | | Etiqueta de fase/ronda. |
| `round_number` | integer | | Número de ronda (para ordering). |
| `group_label` | text | | Grupo (ej: `Group J`). |
| `league_id` | integer | | ID de competición en Bzzoiro. |
| `season_id` | integer | | ID de temporada en Bzzoiro. |
| `status` | text | DEFAULT `'NS'` | Estado: `NS`, `inprogress`, `FT`, `PST`, `CAN`. |
| `home_score` | integer | | Goles local (null hasta que empieza). |
| `away_score` | integer | | Goles visitante. |

**Estados de `status`:**

| Valor | Significado |
|-------|-------------|
| `NS` | No empezado (predicciones abiertas) |
| `inprogress` | En curso (predicciones bloqueadas) |
| `FT` | Finalizado (puntos calculados) |
| `PST` | Postergado |
| `CAN` | Cancelado |

---

### `users`

Usuarios registrados. Soporta autenticación con Google OAuth y con email+contraseña local.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | text (cuid2) | PK | ID interno generado con CUID2. |
| `google_id` | text | UNIQUE, nullable | ID de perfil de Google. Null para usuarios locales. |
| `email` | text | UNIQUE, NOT NULL | Email del usuario. |
| `name` | text | NOT NULL | Nombre para mostrar. |
| `avatar` | text | | URL de foto de perfil (Google). |
| `password_hash` | text | nullable | Hash bcrypt de la contraseña. Null para usuarios Google. |
| `auth_provider` | text | NOT NULL, DEFAULT `'google'` | Método de registro: `'google'` \| `'local'`. |
| `created_at` | timestamp | DEFAULT NOW() | Fecha de creación. |

---

### `predictions`

Predicciones de cada usuario para cada partido. Una predicción por par `(user_id, fixture_id)`.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | text (cuid2) | PK | ID interno. |
| `user_id` | text | NOT NULL, FK → `users.id` | Usuario que hizo la predicción. |
| `fixture_id` | integer | NOT NULL, FK → `fixtures.id` | Partido predicho. |
| `home_goals` | integer | NOT NULL | Goles predichos para el local. |
| `away_goals` | integer | NOT NULL | Goles predichos para el visitante. |
| `points` | integer | nullable | Puntos obtenidos. Null hasta que el partido termina (`FT`). |
| `created_at` | timestamp | DEFAULT NOW() | Fecha de creación. |

**Constraints:**
- `UNIQUE (user_id, fixture_id)` — un usuario solo puede tener una predicción por partido.

**Lógica de puntos** (calculada por `score-sync` al llegar a `FT`):

| Caso | Puntos |
|------|--------|
| Resultado exacto | 5 |
| Ganador/empate correcto | 3 (ganador) / 1 (empate) |
| Incorrecto | 0 |

---

### `mini_leagues`

Grupos privados de usuarios con leaderboard propio.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | text (cuid2) | PK | ID interno. |
| `name` | text | NOT NULL | Nombre de la liga (máx. 50 chars). |
| `invite_code` | text | UNIQUE, NOT NULL | Código de invitación de 8 caracteres (ej: `AB12CD34`). Auto-generado. |
| `creator_id` | text | NOT NULL | ID del usuario creador. |
| `created_at` | timestamp | DEFAULT NOW() | Fecha de creación. |

---

### `mini_league_members`

Relación N:M entre usuarios y mini ligas.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | text (cuid2) | PK | ID interno. |
| `mini_league_id` | text | NOT NULL, FK → `mini_leagues.id` ON DELETE CASCADE | Liga. |
| `user_id` | text | NOT NULL | Usuario miembro. |
| `role` | text | NOT NULL, DEFAULT `'member'` | Rol: `'owner'` \| `'member'`. |
| `joined_at` | timestamp | DEFAULT NOW() | Fecha en que se unió. |

**Constraints:**
- `UNIQUE (mini_league_id, user_id)` — un usuario no puede estar dos veces en la misma liga.
- `ON DELETE CASCADE` — si se elimina la liga, se eliminan todos los miembros.

---

## Comandos útiles

```bash
# Aplicar schema a la DB
pnpm db:push

# Abrir Drizzle Studio (explorador visual de la BD)
pnpm db:studio
```
