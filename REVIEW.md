---
phase: code-review
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/src/config/passport.ts
  - backend/src/config/redis.ts
  - backend/src/db/client.ts
  - backend/src/db/schema.ts
  - backend/src/index.ts
  - backend/src/providers/bzzoiro.ts
  - backend/src/providers/bzzoiro-token.ts
  - backend/src/providers/http.ts
  - backend/src/providers/normalize.ts
  - backend/src/providers/participant-names.ts
  - backend/src/providers/types.ts
  - backend/src/routes/auth.routes.ts
  - backend/src/routes/fixtures.routes.ts
  - backend/src/routes/teams.routes.ts
  - backend/src/scripts/seed-tournament.ts
  - backend/src/services/bzzoiro.service.ts
  - backend/src/services/cache.service.ts
  - backend/src/env.ts
findings:
  critical: 5
  warning: 7
  info: 3
  total: 15
status: issues_found
---

# Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This is a Node.js/TypeScript backend for a football prediction app. The codebase is generally well-structured with good provider abstractions and defensive normalization helpers. However, several critical issues exist: the predictions route handler accepts completely unvalidated user-supplied integers that are passed directly into database writes, the user object is exposed in full to the client (including internal fields), unhandled async exceptions in several route handlers will crash the process, and error messages from the external provider API are leaked verbatim to clients. There are also meaningful auth-session security gaps and missing input validation throughout.

---

## Critical Issues

### CR-01: No input validation on predictions — arbitrary data written to DB

**File:** `backend/src/routes/predictions.routes.ts:22-44`

**Issue:** `fixtureId`, `homeGoals`, and `awayGoals` are taken directly from `req.body` with no type checking, range validation, or sanitization. A client can submit non-integer values, negative numbers, extremely large numbers, or `null`/`undefined`. These values are passed straight to `db.insert` and `db.update`. `homeGoals` and `awayGoals` are declared `notNull()` in the schema but there is no server-side enforcement — if the client omits them, Drizzle will pass `undefined` and the DB may throw an unhandled error that crashes the request. `fixtureId` is also never verified to reference an actual fixture row (no foreign-key existence check at the app layer before the upsert path).

**Fix:**
```typescript
import { z } from 'zod'

const predictionSchema = z.object({
  fixtureId: z.number().int().positive(),
  homeGoals: z.number().int().min(0).max(30),
  awayGoals: z.number().int().min(0).max(30),
})

router.post('/', async (req, res) => {
  const parsed = predictionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { fixtureId, homeGoals, awayGoals } = parsed.data
  // ... rest of handler
})
```

---

### CR-02: Full user object sent to client — internal fields exposed

**File:** `backend/src/routes/auth.routes.ts:40`

**Issue:** `res.json({ user: req.user })` serializes the entire user record from the database, including `googleId`, `createdAt`, and any other columns added in future migrations. The `googleId` field in particular is a Google-internal identifier that should not be sent to the frontend.

**Fix:**
```typescript
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ user: null })
  const { id, email, name, avatar } = req.user as any
  res.json({ user: { id, email, name, avatar } })
})
```

---

### CR-03: Unhandled async exceptions crash route handlers

**File:** `backend/src/routes/fixtures.routes.ts:26,101,111`
**File:** `backend/src/routes/teams.routes.ts:11`
**File:** `backend/src/routes/predictions.routes.ts:12,20`

**Issue:** The `GET /` fixtures handler (line 26), `GET /live` (line 101), `GET /standings` (line 111), `GET /teams/` (line 11), `GET /predictions/` (line 12), and `POST /predictions/` (line 20) are all `async` functions with no try/catch. Any database or provider error will produce an unhandled promise rejection that crashes the Node process (in Node 15+ this terminates the process; in older versions it silently swallows the error and hangs the request). Only `GET /teams/:id/players` has a try/catch.

**Fix:** Wrap all async route handlers in try/catch, or use a wrapper utility:
```typescript
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.get('/', asyncHandler(async (_req, res) => {
  const rows = await db.select()...
  res.json(rows)
}))
```
And add a global error handler in `index.ts`:
```typescript
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})
```

---

### CR-04: Provider error messages leaked to API clients

**File:** `backend/src/routes/teams.routes.ts:32`

**Issue:** `res.status(502).json({ error: message })` sends the raw error message from `ProviderHttpError` to the client. The `ProviderHttpError` message in `http.ts` lines 33-36 contains internal infrastructure details: the full API URL, provider name, auth scheme hints, and instructions referencing internal env vars. This leaks backend configuration and provider details to any unauthenticated caller.

**Fix:**
```typescript
} catch (err) {
  const isProviderError = err instanceof ProviderHttpError
  const status = isProviderError ? 502 : 500
  // Log full details server-side; send generic message to client
  console.error('[teams] fetchPlayersForTeam failed:', err)
  res.status(status).json({ error: 'Failed to fetch players' })
}
```

---

### CR-05: `getAllPages` off-by-one — last valid page treated as overflow

**File:** `backend/src/providers/http.ts:77,95`

**Issue:** The loop condition is `while (nextPath && page <= maxPages)`. After the loop, line 95 throws `if (page > maxPages)`. But `page` is incremented unconditionally at the end of each successful iteration (line 92: `page += 1`). This means after processing page `maxPages`, `page` becomes `maxPages + 1`, the loop exits because `page <= maxPages` is false, and then line 95 throws — even when the response had no `next` link (i.e., pagination completed normally on exactly `maxPages` pages). Legitimate full-dataset fetches that happen to require exactly `maxPages` pages will throw a spurious error.

**Fix:**
```typescript
// Check for overflow only when there are still more pages to fetch
if (nextPath && page > maxPages) {
  throw new Error(`Provider pagination exceeded ${maxPages} pages for ${path}`)
}
```
Or restructure the post-loop check to distinguish "stopped because limit" vs "stopped because no more pages":
```typescript
const hitLimit = nextPath !== null  // still had a next link when loop exited
if (hitLimit) {
  throw new Error(`Provider pagination exceeded ${maxPages} pages for ${path}`)
}
```

---

## Warnings

### WR-01: Session cookie not `sameSite` — CSRF exposure

**File:** `backend/src/index.ts:48`

**Issue:** The session cookie is configured with `httpOnly: true` and `secure` in production, but `sameSite` is not set. The default browser behavior for cookies without `sameSite` is `Lax` in modern browsers, but Express `express-session` does not set any `sameSite` attribute by default, leaving the cookie behavior up to the browser. For a session-based auth app with state-mutating POST endpoints, `sameSite: 'strict'` (or at minimum `'lax'`) should be explicit.

**Fix:**
```typescript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
},
```

---

### WR-02: `DATABASE_URL` silently undefined — pool connects to nothing

**File:** `backend/src/db/client.ts:6-8`

**Issue:** `process.env.DATABASE_URL` is read without any guard. If the env var is missing, `new Pool({ connectionString: undefined })` defaults to local socket-based connection and will silently succeed or fail only at query time with an opaque pg error. There is no startup-time validation.

**Fix:**
```typescript
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')
export const pool = new Pool({ connectionString })
```

---

### WR-03: `predictions` schema allows `NULL` user/fixture IDs — referential integrity not enforced

**File:** `backend/src/db/schema.ts:49-50`

**Issue:** `userId` and `fixtureId` in the `predictions` table are defined with `.references(...)` but without `.notNull()`. This means Drizzle will not include `NOT NULL` in the generated DDL, allowing orphan predictions with null user or fixture IDs. In combination with CR-01 (no input validation), a `null` fixtureId from the request body will be persisted without any DB-level rejection.

**Fix:**
```typescript
userId: text('user_id').notNull().references(() => users.id),
fixtureId: integer('fixture_id').notNull().references(() => fixtures.id),
```

---

### WR-04: `logout` clears session but does not destroy it

**File:** `backend/src/routes/auth.routes.ts:32-35`

**Issue:** `req.logout()` removes the user from the session but does not destroy the session record in Redis. The session ID (and its cookie) remains valid after logout. This means the session could be replayed or inspected. The correct pattern is to call `req.session.destroy()` after logout.

**Fix:**
```typescript
router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy((err) => {
      if (err) console.error('[logout] session destroy failed:', err)
      res.clearCookie('connect.sid')
      res.json({ ok: true })
    })
  })
})
```

---

### WR-05: `serializeUser` uses `any` cast — type safety bypassed

**File:** `backend/src/config/passport.ts:58`

**Issue:** `passport.serializeUser((user: any, done) => done(null, user.id))` uses `any`, which means if the user object ever lacks an `id` field (e.g., due to a schema change or a partial user object), the serialization silently stores `undefined` in the session, causing all subsequent requests for that session to fail at deserialization with confusing errors.

**Fix:**
```typescript
passport.serializeUser((user, done) => {
  const u = user as { id: string }
  if (!u.id) return done(new Error('User has no id'))
  done(null, u.id)
})
```

---

### WR-06: `seed-tournament.ts` API key printed to stdout

**File:** `backend/src/scripts/seed-tournament.ts:75`

**Issue:** `console.log(`Bzzoiro: API token loaded (${config.apiKey.length} chars).`)` — while it only logs the length, the `apiKey` is in scope and a future change may accidentally log the value. More importantly, this establishes a pattern of logging around the secret. The real issue is there is no masking/redaction — if someone adds `config.apiKey` to a debug log, CI output or server logs will contain the credential.

**Fix:** Remove the log line, or make it explicit that only length is logged and add a lint rule or comment:
```typescript
// Only log token length — never log the value
console.log(`[seed] BZZOIRO_API_KEY loaded (${config.apiKey.length} chars).`)
```

---

### WR-07: `bzzoiroAuthorizationValue` reads `process.env` at call time — not at startup

**File:** `backend/src/providers/bzzoiro-token.ts:19-22`

**Issue:** `process.env.BZZOIRO_AUTH_SCHEME` is read inside `bzzoiroAuthorizationValue()`, which is called at request time (every time `createClient()` is called in the service). This means the auth scheme can change between requests if env vars are mutated at runtime. Additionally, `createClient()` in `bzzoiro.service.ts` is called on every request to the service, constructing a new `ProviderHttpClient` instance each time. This is wasteful and means there is no single point to validate or log the client configuration at startup.

**Fix:** Create the client once at module load time, or at minimum validate the auth scheme at startup rather than per-request. For `bzzoiroAuthorizationValue`, reading env at call time is acceptable for a utility but should be documented.

---

## Info

### IN-01: `predictions.routes.ts` is not in the reviewed file list but is mounted in `index.ts`

**File:** `backend/src/routes/predictions.routes.ts` (observed during review)

**Issue:** This file was not included in the review scope config, but it is imported and mounted in `index.ts` at `/api/predictions` and contains critical issues (CR-01, CR-03). It should be included in any follow-up review pass.

---

### IN-02: Magic number TTLs and cache keys built from raw env values

**File:** `backend/src/routes/fixtures.routes.ts:21,68-70`

**Issue:** Cache TTL defaults (`300`, `60`, `900` seconds) are scattered across route files as magic numbers. Cache keys embed raw env values (`fixture_team_labels:league:${leagueNum}`) — if `BZZOIRO_LEAGUE_ID` changes between deploys, stale cache keys accumulate in Redis without expiry control. Consider centralizing TTL constants and prefixing cache keys with an app version or environment tag.

---

### IN-03: `BZZOIRO_AUTH_SCHEME` accepts arbitrary string without validation

**File:** `backend/src/providers/bzzoiro-token.ts:20`

**Issue:** The auth scheme is taken directly from env without validation: `const scheme = (process.env.BZZOIRO_AUTH_SCHEME ?? 'Token').trim() || 'Token'`. Any value set in env (including values with spaces or special characters) will be used in the `Authorization` header. This does not cause a security vulnerability in itself since the value comes from the server's own environment, but it could produce malformed headers silently.

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
