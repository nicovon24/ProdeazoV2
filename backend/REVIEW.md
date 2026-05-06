---
phase: backend-api
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - backend/src/config/passport.ts
  - backend/src/config/redis.ts
  - backend/src/db/client.ts
  - backend/src/index.ts
  - backend/src/providers/bzzoiro-token.ts
  - backend/src/providers/bzzoiro.ts
  - backend/src/providers/normalize.ts
  - backend/src/providers/participant-names.ts
  - backend/src/providers/types.ts
  - backend/src/routes/leaderboard.routes.ts
  - backend/src/scripts/seed-tournament.ts
  - backend/src/services/cache.service.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Backend API: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The backend is generally well-structured with good defensive patterns (lazy Redis connection, session secret validation, provider normalization layers). However there are two critical issues: a user can be inserted with a blank email on first OAuth login, and the leaderboard route has no authentication guard. Five warnings cover a silent Redis reconnection failure after 10 retries, silent cache error swallowing, a wasted SQL ORDER BY, an Invalid Date that can reach the database, and a missing startup validation for `DATABASE_URL`.

---

## Critical Issues

### CR-01: User inserted with empty email on first Google OAuth login

**File:** `backend/src/config/passport.ts:43`

**Issue:** When a new user authenticates via Google and no email is present in the profile (e.g. the user withheld it), the code falls back to an empty string `''` via the nullish coalescing operator. This inserts a row with `email = ''` into the database. Subsequent lookups or email-based operations (password reset, notifications) will silently operate on a blank email. If the `email` column has a unique constraint this will also cause a crash for a second user without an email.

```typescript
// current — inserts blank email
email: profile.emails?.[0]?.value ?? '',
```

**Fix:** Require a valid email or reject the authentication attempt if none is provided.

```typescript
const email = profile.emails?.[0]?.value?.trim()
if (!email) return done(null, false)   // rejects login gracefully

const [newUser] = await db
  .insert(users)
  .values({
    googleId: profile.id,
    email,
    name: profile.displayName,
    avatar: profile.photos?.[0]?.value,
  })
  .returning()
```

---

### CR-02: Leaderboard route is unauthenticated and exposes all user display names and avatars

**File:** `backend/src/routes/leaderboard.routes.ts:9`

**Issue:** `GET /api/leaderboard` has no authentication or authorization middleware. Any unauthenticated HTTP client can retrieve the full list of all users (name, avatar URL) along with their scores. If the application is meant to be private (e.g. a closed group prode), this is an authorization bypass. Even if a public leaderboard is intended, the absence of any guard means there is no way to restrict it later without a code change, and there is no rate-limiting surface to add.

**Fix:** Add an `isAuthenticated` middleware (or at minimum a documented decision comment) before the handler.

```typescript
import { isAuthenticated } from '../middleware/auth'

router.get('/', isAuthenticated, asyncHandler(async (_req, res) => {
  // ...
}))
```

If the leaderboard is intentionally public, add a comment and consider pagination to limit data exposure.

---

## Warnings

### WR-01: Redis retryStrategy returns null permanently — client will not reconnect after 10 failures

**File:** `backend/src/config/redis.ts:8-11`

**Issue:** Returning `null` from `retryStrategy` tells ioredis to stop all reconnection attempts permanently. If Redis is temporarily unavailable (restart, network blip) and 10 retries are exhausted, the client enters a terminal state for the lifetime of the process. All subsequent cache reads and session reads will fail silently (because `cache.service.ts` swallows errors) but sessions backed by Redis (`RedisStore`) will start returning errors to `express-session`, which can cause 500 errors for logged-in users.

```typescript
// current — permanently disables reconnection after ~45 s of retries
retryStrategy(times) {
  if (times > 10) return null
  return Math.min(times * 500, 8000)
},
```

**Fix:** Either remove the cap so ioredis retries indefinitely with a ceiling delay, or use a large cap and log a critical alert.

```typescript
retryStrategy(times) {
  // Retry forever with a max interval of 30 s
  return Math.min(times * 500, 30_000)
},
```

---

### WR-02: Cache service silently swallows all errors including JSON parse failures

**File:** `backend/src/services/cache.service.ts:3-10`

**Issue:** Both `getCache` and `setCache` catch all errors and return `null` / do nothing. A corrupt value in Redis (e.g. truncated JSON) will silently return `null`, making the caller believe there is a cache miss and re-fetching from the provider on every request until the key expires. This also hides connection errors from observability tooling. The silent catch in `setCache` is similarly invisible.

```typescript
// current — all errors disappear
} catch {
  return null
}
```

**Fix:** Log the error at least at `warn` level so it appears in monitoring. Use a narrow catch if specific errors (e.g. connection refused) should be silently degraded.

```typescript
} catch (err) {
  console.warn('[cache] getCache error for key %s: %s', key, (err as Error).message)
  return null
}
```

---

### WR-03: `new Date(fx.kickoffAt)` does not validate the date — Invalid Date can reach the database

**File:** `backend/src/scripts/seed-tournament.ts:244`

**Issue:** `fx.kickoffAt` is typed as `string` but its actual format depends entirely on the provider API response. Passing an unparseable string to `new Date()` returns an `Invalid Date` object (`isNaN(date.getTime()) === true`). Drizzle ORM will pass this through to `pg` which may insert `NULL` or throw a runtime error, leading to fixtures with a null or wrong date.

```typescript
date: new Date(fx.kickoffAt),
```

**Fix:** Validate before insertion.

```typescript
const fixtureDate = new Date(fx.kickoffAt)
if (isNaN(fixtureDate.getTime())) {
  console.warn(`  Skip fixture ${fx.id} — unparseable kickoffAt: ${fx.kickoffAt}`)
  continue
}
// then use fixtureDate
date: fixtureDate,
```

---

### WR-04: `DATABASE_URL` is not validated at startup — failure surfaces as a cryptic pg error

**File:** `backend/src/db/client.ts:6-8`

**Issue:** `new Pool({ connectionString: process.env.DATABASE_URL })` with `DATABASE_URL` undefined silently creates a Pool configured to connect to a default local socket. The first query that runs will fail with a pg connection error rather than an obvious "missing environment variable" message. In a Docker/CI environment this can produce confusing errors far from the root cause.

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // undefined if not set
})
```

**Fix:** Fail fast at module load time.

```typescript
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}
export const pool = new Pool({ connectionString })
```

---

### WR-05: SQL `orderBy(sum(predictions.points))` orders ascending — redundant and misleading

**File:** `backend/src/routes/leaderboard.routes.ts:21`

**Issue:** The Drizzle query orders rows ascending by `sum(points)` in SQL, then the JavaScript `.sort()` on line 25 immediately re-sorts descending. The SQL sort is wasted I/O and is semantically backwards (ascending = lowest scorer first). The comment acknowledges this ("drizzle's `sum().desc()` requires sql helper; sort in JS") but the ascending SQL sort should be removed rather than kept as a no-op.

**Fix:** Either drop the `orderBy` clause and rely solely on the JS sort, or use the `sql` helper for a proper descending SQL sort.

```typescript
import { sql } from 'drizzle-orm'

.orderBy(sql`sum(${predictions.points}) DESC`)
// then the JS sort can also be removed
```

---

## Info

### IR-01: `serializeUser` uses `any` type — bypasses TypeScript safety

**File:** `backend/src/config/passport.ts:58`

**Issue:** `passport.serializeUser((user: any, done) => ...)` casts the user to `any`, silently suppressing type errors. If the User type changes (e.g. `id` becomes a UUID or is renamed), this will fail silently at runtime.

**Fix:** Type the parameter using the application's user type or the `Express.User` interface.

```typescript
passport.serializeUser((user, done) => done(null, (user as { id: string }).id))
```

Or declare `Express.User` in a global type augmentation file and use it directly.

---

### IR-02: API key character count logged to console in seed script

**File:** `backend/src/scripts/seed-tournament.ts:75`

**Issue:** `console.log(\`Bzzoiro: API token loaded (${config.apiKey.length} chars).\`)` logs the key's length. While this alone is not a secret leak, it confirms the key is present and its length in any CI/CD log output. For short keys, length narrows the brute-force space.

**Fix:** Either remove the log or replace it with a generic confirmation.

```typescript
console.log('Bzzoiro: API token loaded.')
```

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
