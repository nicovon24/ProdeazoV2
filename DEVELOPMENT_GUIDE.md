# 🚀 Guía de Desarrollo - Prodeazo

Esta guía detalla los pasos necesarios para configurar y ejecutar el proyecto Prodeazo en tu entorno local.

## 📌 Requisitos Previos
*   **Node.js** (v20 o superior recomendado).
*   **Docker Desktop** (Esencial para la base de datos, Redis y el Backend).
*   **Git**.

---

## 1. Preparación Inicial
Asegúrate de estar en la rama correcta de desarrollo de frontend:
```bash
git checkout feat/frontend
```

Instala las dependencias generales en la raíz (usamos un espacio de trabajo de npm/pnpm si es necesario, o simplemente instala en cada carpeta):
```bash
# En la carpeta frontend
cd frontend
npm install

# En la carpeta backend
cd ../backend
npm install
```

---

## 2. Configuración de Variables de Entorno (.env)

Debes crear dos archivos de configuración. Puedes usar los `.env.example` como base.

### Backend (`/backend/.env`)
Crea el archivo con estos valores clave:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prodeazo
REDIS_URL=redis://localhost:6379
SESSION_SECRET="tu_secreto_aqui"
SESSION_STORE=memory  # Usar 'memory' en local para evitar conflictos de versiones con Redis

BZZOIRO_API_KEY="tu_api_key_real"
BZZOIRO_BASE_URL="https://sports.bzzoiro.com/api"
TOURNAMENT_ID=188 # ID del Mundial 2026 en BSD
BZZOIRO_LEAGUE_ID=27

FRONTEND_URL=http://localhost:3000
PORT=4000
```

Para Google OAuth en local, el cliente de Google Cloud debe estar configurado contra el backend Express, no contra Next/Vercel/Supabase:

```env
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/callback
```

En Google Cloud Console, agregar como URI de redireccionamiento autorizada:

```text
http://localhost:4000/api/auth/callback
```

Y como orígenes JavaScript autorizados, según los puertos usados en local:

```text
http://localhost:3000
http://localhost:3001
http://localhost:4000
```

### Frontend (`/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 3. Infraestructura con Docker
El backend y la base de datos corren dentro de Docker para asegurar que todos usemos el mismo entorno.

Desde la **raíz del proyecto**, ejecuta:
```bash
docker compose up -d
```
Esto levantará:
*   **Postgres (db):** En el puerto 5432.
*   **Redis:** En el puerto 6379.
*   **Backend:** En el puerto 4000.
*   **Migrate:** Tarea única para crear las tablas en la DB.

---

## 4. Carga de Datos (Seeding)
Para que la aplicación tenga equipos y partidos reales del Mundial, debes popular la base de datos. Ejecuta este comando desde la raíz:

```bash
docker compose run --rm migrate pnpm run seed
```
*Si esto falla por falta de API Key, puedes usar una carga de prueba:*
```bash
docker compose run --rm migrate pnpm run seed:mock
```

---

## 5. Ejecutar el Frontend
Una vez que Docker está corriendo y la base de datos tiene datos, inicia el servidor de desarrollo del frontend:

```bash
cd frontend
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🛠 Solución de Problemas Comunes

### 1. Choque de Puertos (Puerto 3000 ocupado)
Si el frontend intenta abrirse en el 3001, asegúrate de que el `docker-compose.yml` mapee el backend al puerto 4000 y no al 3000.
*   **Check:** `docker compose ps` para ver los puertos activos.

### 2. Error 404 en /login o /register
Si Next.js no encuentra las rutas después de un movimiento de archivos o cambio de rama:
```bash
cd frontend
Remove-Item -Recurse -Force .next  # En PowerShell
npm run dev
```

### 3. Errores de CORS (Origin blocked)
Si el backend rechaza la conexión, verifica que en `backend/src/index.ts` el arreglo de `origins` incluya tanto el puerto 3000 como el 3001. Luego reconstruye el backend:
```bash
docker compose up -d --build backend
```

### 4. Error 500 al Iniciar Sesión (Redis Error)
Si ves errores de Redis en los logs de Docker, asegúrate de que `SESSION_STORE=memory` esté configurado en tu `.env` del backend para desarrollo local.

---

## 📝 Comandos Útiles de Docker
*   **Ver logs:** `docker compose logs -f backend`
*   **Reiniciar todo:** `docker compose restart`
*   **Apagar todo:** `docker compose down` (borra contenedores, mantiene datos).
*   **Limpieza total:** `docker compose down -v` (**BORRA** la base de datos).
