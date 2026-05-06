---
phase: backend-review
reviewed: 2026-05-06T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - backend/src/config/passport.ts
  - backend/src/controllers/auth.controller.ts
  - backend/src/controllers/fixtures.controller.ts
  - backend/src/controllers/leaderboard.controller.ts
  - backend/src/controllers/mini-leagues.controller.ts
  - backend/src/controllers/predictions.controller.ts
  - backend/src/controllers/teams.controller.ts
  - backend/src/routes/auth.routes.ts
  - backend/src/routes/fixtures.routes.ts
  - backend/src/routes/leaderboard.routes.ts
  - backend/src/routes/mini-leagues.routes.ts
  - backend/src/routes/predictions.routes.ts
  - backend/src/routes/teams.routes.ts
  - backend/src/models/mini-league.model.ts
  - backend/src/models/prediction.model.ts
  - backend/src/models/fixture.model.ts
  - backend/src/models/leaderboard.model.ts
  - backend/src/models/team.model.ts
  - backend/src/jobs/score-sync.ts
  - backend/src/services/scoring.ts
  - backend/src/db/schema.ts
  - backend/src/middleware/requireAuth.ts
  - backend/src/utils/paginate.ts
  - backend/src/utils/apiError.ts
  - backend/src/index.ts
findings:
  critical: 6
  warning: 8
  info: 5
  total: 19
status: issues_found
---

# Backend Code Review Report

**Reviewed:** 2026-05-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the full backend layer of ProdeazoV2: auth, fixtures, predictions, mini-leagues,
leaderboard, scoring job, schema, middleware, and utilities. The code is well-structured
overall (consistent error shapes, Zod validation on mutation endpoints, session hygiene),
but contains several critical issues that must be fixed before shipping: async errors not
propagated to Express's error handler on the auth routes, rate limiting intentionally
disabled, fixtures and teams endpoints fully unauthenticated, a race condition in the
scoring job, and an invalid empty-string email stored from Google OAuth. There are also
meaningful logic bugs around leaderboard ordering/completeness and paginator URL building.

---

## Critical Issues

### CR-01: Auth routes not wrapped in asyncHandler — unhandled DB errors bypass error middleware

**File:** `backend/src/routes/auth.routes.ts:31-35`
**Issue:** `register` and `localLogin` are async functions mounted without `asyncHandler`.
In Express 4, unhandled promise rejections from async route handlers do not reach the
global error middleware; the request hangs or the process emits an unhandled rejection.
Every other route file uses `asyncHandler` (fixtures, predictions, leaderboard, etc.) but
`auth.routes.ts` does not import or apply it. A DB outage during registration will hang
the client indefinitely.
**Fix:**
```typescript
import { asyncHandler } from '../utils/asyncHandler'

router.post('/register', asyncHandler(authController.register))
router.post('/login', asyncHandler(authController.localLogin))
router.get('/me', asyncHandler(authController.me))
router.post('/logout', asyncHandler(authController.logout))
```

---

### CR-02: Rate limiting is commented out — brute-force on login and register

**File:** `backend/src/index.ts:10,23-24,83`
**Issue:** `express-rate-limit` is imported and wired up in comments only. The
`/api/auth/login` endpoint has no throttle, allowing unlimited credential-stuffing
attempts. The `/api/auth/register` endpoint has no throttle, allowing automated account
creation at full speed. This is a security blocker for any internet-facing deployment.
**Fix:**
```typescript
import rateLimit from 'express-rate-limit'
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth', authLimiter, authRoutes)
```
Uncomment and enable the limiter before shipping to production.

---

### CR-03: Fixtures and teams endpoints are fully public — no auth required

**File:** `backend/src/routes/fixtures.routes.ts:1-11`, `backend/src/routes/teams.routes.ts:1-8`
**Issue:** `/api/fixtures` and `/api/teams` require no authentication. More critically,
`/api/fixtures/live` and `/api/fixtures/standings` proxy requests to an external third-party
API on behalf of any unauthenticated caller, with results cached under a fixed key. Any
anonymous user can trigger external API calls, pollute the cache, and enumerate all fixture
and team data. If the application is meant to require login, these routes should be protected.
**Fix:**
```typescript
// fixtures.routes.ts
import { requireAuth } from '../middleware/requireAuth'
router.use(requireAuth)
```

---

### CR-04: Invite code is predictable and join endpoint has no rate limit

**File:** `backend/src/db/schema.ts:16`, `backend/src/routes/mini-leagues.routes.ts:14`
**Issue:** `inviteCode` is the first 8 characters of a CUID2 uppercased. The alphabet is
`[0-9A-Z]` (36 characters), giving 36^8 ≈ 2.8 trillion combinations. Without any rate
limit on `POST /api/mini-leagues/join` or `POST /api/mini-leagues/:id/join`, an attacker
can enumerate codes. Additionally, CUID2 is not designed as a secret; its structure is
partially time-based, reducing the effective search space.
**Fix:** Generate invite codes using cryptographically secure randomness:
```typescript
inviteCode: text('invite_code').unique().notNull()
  .$defaultFn(() => randomBytes(5).toString('hex').toUpperCase()),
```
And add rate limiting on the join endpoints.

---

### CR-05: scorePredictions has a race condition — predictions can be scored twice

**File:** `backend/src/jobs/score-sync.ts:112-136`
**Issue:** `scorePredictions` reads all predictions for a fixture in one query, filters
`p.points === null` in application code, then issues individual `UPDATE` statements.
Because `runScoreSync` fires every 60 seconds and can overlap (the job is not lock-guarded),
two concurrent executions can both read `points = null` for the same predictions and both
issue the update, resulting in double-scoring. There is no DB-level guard (e.g., `WHERE
points IS NULL`) on the update.
**Fix:** Add `isNull(predictions.points)` to the UPDATE's WHERE clause so only the first
concurrent write succeeds:
```typescript
await db
  .update(predictions)
  .set({ points })
  .where(
    and(
      eq(predictions.id, prediction.id),
      isNull(predictions.points)  // atomic guard
    )
  )
```

---

### CR-06: Google OAuth stores empty string as email when profile has no emails

**File:** `backend/src/config/passport.ts:45`
**Issue:** `email: profile.emails?.[0]?.value ?? ''` falls back to an empty string. The
`users.email` column is `notNull()` and `unique()`, so storing `''` bypasses the not-null
intent. A subsequent Google OAuth login by a different email-less account would hit a
unique constraint violation. Any logic that treats email as a valid address (e.g., future
password reset) would silently operate on an empty string.
**Fix:**
```typescript
const email = profile.emails?.[0]?.value
if (!email) return done(new Error('Google account has no verified email address'))
```

---

## Warnings

### WR-01: Leaderboard excludes users with zero points — ranking is incomplete

**File:** `backend/src/models/leaderboard.model.ts:5-17`
**Issue:** `findLeaderboardAggregates` uses `INNER JOIN` between `predictions` and `users`
filtered to `WHERE predictions.points IS NOT NULL`. Users who have submitted predictions
that haven't been scored yet, or users with no predictions, are invisible on the leaderboard.
This makes the standings appear to have fewer participants than actually registered.
**Fix:** Switch to a `LEFT JOIN` from `users` to `predictions`, and drop the `isNotNull`
filter (or move it to only exclude unscored predictions from the sum, not from the result
set):
```typescript
db.select({ ..., totalPoints: sum(predictions.points).mapWith(Number) })
  .from(users)
  .leftJoin(predictions, and(eq(predictions.userId, users.id), isNotNull(predictions.points)))
  .groupBy(users.id, users.name, users.avatar)
```

---

### WR-02: Leaderboard SQL `orderBy` sorts ascending — highest scorer appears last

**File:** `backend/src/models/leaderboard.model.ts:17`
**Issue:** `.orderBy(sum(predictions.points))` orders ascending by default in SQL. The
controller compensates with an in-memory `.sort((a, b) => b.totalPoints - a.totalPoints)`,
but the model's SQL order is backwards. If the model is ever used directly (e.g., in the
mini-league leaderboard), or if pagination is added at the DB level later, results will
be in the wrong order from SQL.
**Fix:**
```typescript
import { desc } from 'drizzle-orm'
.orderBy(desc(sum(predictions.points)))
```

---

### WR-03: Paginator builds next/previous URLs without existing query parameters

**File:** `backend/src/utils/paginate.ts:25`
**Issue:** `buildUrl = (p: number) => \`${req.path}?page=${p}&limit=${limit}\`` discards
all query parameters other than `page` and `limit`. If a client passes filters or sort
parameters (e.g., `?status=NS`), following `next` or `previous` links drops those filters.
**Fix:**
```typescript
const buildUrl = (p: number) => {
  const q = new URLSearchParams({ ...(req.query as Record<string, string>), page: String(p), limit: String(limit) })
  return `${req.path}?${q.toString()}`
}
```

---

### WR-04: `miniLeagues.creatorId` has no foreign key to `users`

**File:** `backend/src/db/schema.ts:17`
**Issue:** `creatorId: text('creator_id').notNull()` has no `.references(() => users.id)`.
If a user account is deleted, their mini-leagues remain with a dangling `creatorId` that
no longer maps to a real user. This will cause silent data inconsistencies in any query
that joins `miniLeagues` on `creatorId`.
**Fix:**
```typescript
creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
```

---

### WR-05: `score-sync` fetches ALL fixtures from the DB on every 60-second tick

**File:** `backend/src/jobs/score-sync.ts:35-38`
**Issue:** `db.select().from(fixtures)` with no WHERE clause fetches every fixture in the
database before filtering in application code. Once a tournament ends, all fixtures are
`FT` and this query returns the full table wastefully on every tick.
**Fix:**
```typescript
import { inArray } from 'drizzle-orm'
const dbFixtures = await db
  .select()
  .from(fixtures)
  .where(inArray(fixtures.status, ['NS', 'inprogress']))
```

---

### WR-06: `score-sync` swallows all errors silently

**File:** `backend/src/jobs/score-sync.ts:107-109`
**Issue:** The top-level catch logs to stderr only. A DB connection failure will cause
the job to silently no-op for every subsequent tick. There is no alerting, no retry
backoff, and no signal to the operator that scoring has stopped. Similarly,
`fixtures.controller.ts:65` catches label-overlay errors with an empty `catch {}` block.
**Fix:** Re-throw non-transient errors (or track a failure counter and alert after N
consecutive failures). For the controller, at minimum log the error:
```typescript
} catch (e) {
  console.error('[fixtures] label overlay failed:', e)
  out = rows
}
```

---

### WR-07: `predictions.createOrUpdate` returns 201 on both create and update

**File:** `backend/src/controllers/predictions.controller.ts:39`
**Issue:** The endpoint uses an upsert (`onConflictDoUpdate`) but always responds with
`res.status(201)`. HTTP 201 Created is semantically incorrect for an update operation.
Clients cannot distinguish between a newly created prediction and an updated one.
**Fix:** Return 200 on update and 201 on insert. Since the upsert doesn't directly expose
this, check if a row was returned with a new `createdAt` equal to `updatedAt`, or use
separate insert/update paths, or return 200 unconditionally for simplicity.

---

### WR-08: `requireAuth` does not call `next()` after sending 401 — response leaks

**File:** `backend/src/middleware/requireAuth.ts:5`
**Issue:** After `res.status(401).json(...)`, the function returns implicitly. This is
fine — Express will not call `next` — but the `return` keyword is absent, making the
flow less explicit and risking a future developer adding code after the json call that
would execute. This is a minor robustness concern.
**Fix:**
```typescript
if (!req.isAuthenticated()) {
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })
}
next()
```

---

## Info

### IN-01: `console.log` used throughout score-sync — not structured logging

**File:** `backend/src/jobs/score-sync.ts:92,104,135`
**Issue:** Multiple `console.log` calls in a background job that runs every 60 seconds.
These bypass any structured logging setup (pino, winston) and lack correlation IDs or
severity levels.
**Fix:** Replace with a logger instance that supports structured output and log levels.

---

### IN-02: `(req.user as any).id` repeated across all authenticated controllers

**File:** `backend/src/controllers/mini-leagues.controller.ts:19,27,33,46,62,77,96`, `predictions.controller.ts:15,26`, `auth.controller.ts:32`
**Issue:** Every controller casts `req.user` to `any` to access `.id`. This defeats
TypeScript type safety and would silently compile even if the user shape changes.
**Fix:** Add an Express namespace augmentation in a `src/types/express.d.ts` file:
```typescript
declare global {
  namespace Express {
    interface User {
      id: string
      email: string
      name: string
      avatar?: string | null
      authProvider: string
    }
  }
}
```

---

### IN-03: Commented-out rate limiter code clutters `index.ts`

**File:** `backend/src/index.ts:10,23-24,52,83`
**Issue:** Rate limiting code is commented out across 5 separate lines. The security
posture of the app is unclear from reading the entry point.
**Fix:** Remove the commented lines (they are in git history) and add a task to enable
rate limiting before production deploy. See CR-02.

---

### IN-04: `p()` helper in mini-leagues controller has a non-descriptive name

**File:** `backend/src/controllers/mini-leagues.controller.ts:7`
**Issue:** `const p = (v: string | string[]): string => ...` is used for extracting
`req.params` values but the name `p` gives no hint of its purpose.
**Fix:** Rename to `firstParam` or `extractParam`.

---

### IN-05: `inviteCode` lookup does `.toUpperCase()` in application code — inconsistent if DB collation differs

**File:** `backend/src/models/mini-league.model.ts:13`
**Issue:** `code.toUpperCase()` is applied before the DB query. The invite code is stored
uppercased at creation time (schema line 16), so this is correct. However, if a code
were accidentally stored in a mixed-case format (e.g., from a migration or manual insert),
the lookup would silently fail. A DB-level `UPPER()` or a `ILIKE` query would be more
robust.
**Fix:** Low severity — document the invariant that invite codes are always uppercase, or
enforce it with a DB check constraint.

---

_Reviewed: 2026-05-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
