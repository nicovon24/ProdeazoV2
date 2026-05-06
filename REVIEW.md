---
phase: backend-api
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - backend/src/controllers/predictions.controller.ts
  - backend/src/controllers/mini-leagues.controller.ts
  - backend/src/models/mini-league.model.ts
  - backend/src/models/prediction.model.ts
  - backend/src/models/fixture.model.ts
  - backend/src/routes/predictions.routes.ts
  - backend/src/routes/mini-leagues.routes.ts
  - backend/src/jobs/score-sync.ts
  - backend/src/services/scoring.ts
  - backend/src/routes/leaderboard.routes.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Backend API: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The backend covers predictions CRUD, mini-leagues listing, a score-sync job, a scoring service, and a leaderboard. The core scoring logic is clean and correct. The main concerns are: an unauthenticated leaderboard/mini-leagues endpoint, a race condition in predict-or-update that can cause duplicate prediction rows, missing `await` on all model calls (unhandled promise rejections / silent crashes), and the score-sync job fetching only today's scores while its fixture filter intentionally spans past days — meaning past-delayed fixtures will never actually receive score updates.

---

## Critical Issues

### CR-01: Race condition — duplicate prediction rows possible

**File:** `backend/src/controllers/predictions.controller.ts:36-44`
**Issue:** The check-then-insert pattern (`findPredictionByUserAndFixture` → `insertPrediction`) is not atomic. Two concurrent POST requests from the same user for the same fixture can both read `existing.length === 0` and both execute `insertPrediction`, producing two rows for the same (userId, fixtureId) pair. Downstream scoring reads all predictions for a fixture without deduplication, so the user would receive double points.
**Fix:** Add a unique constraint on `(userId, fixtureId)` in the DB schema (which should already be there as a safety net), and handle the unique-violation error in the controller by retrying as an update:
```typescript
try {
  const [created] = await predictionModel.insertPrediction(userId, fixtureId, homeGoals, awayGoals)
  return res.status(201).json(created)
} catch (err: any) {
  // unique violation (Postgres code 23505)
  if (err?.code === '23505') {
    const [updated] = await predictionModel.updatePredictionGoals(userId, fixtureId, homeGoals, awayGoals)
    return res.json(updated)
  }
  throw err
}
```
Alternatively, use a DB-level `INSERT ... ON CONFLICT DO UPDATE` (upsert) to make the operation inherently atomic.

---

### CR-02: Missing `await` on all model/DB calls — unhandled rejections crash silently

**File:** `backend/src/controllers/predictions.controller.ts:14,27,36,39,43`  
**File:** `backend/src/controllers/mini-leagues.controller.ts:5`
**Issue:** Every call to a model function returns a Promise. The controller functions are `async` and wrapped in `asyncHandler`, so rejections are forwarded to Express's error handler — but only if the `await` is present. Currently none of the model calls are awaited. A DB connection failure, network error, or query error will result in the response never being sent (hanging request) rather than a proper 500, because the Promise rejection occurs in a floating promise that `asyncHandler`'s `.catch(next)` does not capture.

Example in `predictions.controller.ts`:
```typescript
// BUG — result is a Promise, not the resolved value
const userPredictions = await predictionModel.findPredictionsByUserId(userId)
```
Wait — on re-reading, the `await` keywords ARE present in the controller. However the model functions themselves return raw Drizzle query builder objects that are thenable but do not execute until awaited. The `asyncHandler` wrapper does catch the outer async function's rejection, so this is fine for the happy path.

Upon closer re-reading the code is correctly using `await` in the controller. Retracting this as a blocker — see WR-01 instead for the related concern in `score-sync.ts`.

---

### CR-02 (revised): score-sync fetches only today's scores but filters fixtures up to 2 days in the past — past fixtures will never be updated

**File:** `backend/src/jobs/score-sync.ts:32,52`
**Issue:** The job filters active fixtures whose `fixtureDate <= today` (line 44), which intentionally includes fixtures from past days to handle "API delays". However, it then fetches scores by calling `fetchScoresForDate(today)` (line 52), which retrieves only today's matches from the Bzzoiro API. Any fixture from yesterday or the day before that is still in `NS` or `inprogress` status will be included in `activeIds` but will never appear in `rows`, so it will never transition to `FT` and its predictions will never be scored. The fix-up logic silently does nothing for those fixtures.
**Fix:** Either fetch scores for each distinct date represented in `active`, or change the filter to only include fixtures with `fixtureDate === today`:
```typescript
// Option A: only sync today's fixtures (simpler, correct)
const active = dbFixtures.filter((f) => {
  if (!f.status || !['NS', 'inprogress'].includes(f.status)) return false
  if (!f.date) return false
  return f.date.toISOString().slice(0, 10) === today
})

// Option B: fetch scores for all relevant dates
const activeDates = [...new Set(active.map((f) => f.date!.toISOString().slice(0, 10)))]
const rowsArrays = await Promise.all(activeDates.map(fetchScoresForDate))
const rows = rowsArrays.flat()
```

---

### CR-03: Mini-leagues and leaderboard endpoints have no authentication

**File:** `backend/src/routes/mini-leagues.routes.ts:1-9`
**File:** `backend/src/routes/leaderboard.routes.ts:1-9`
**Issue:** Neither route applies `requireAuth` middleware. Any unauthenticated request can enumerate all mini-leagues and the full user leaderboard (which likely includes usernames and point totals). This is an authorization gap — whether it is intentional (public leaderboard) or not, it should be a deliberate, documented decision. If user data on the leaderboard includes emails or internal IDs, this becomes a privacy/security issue.
**Fix:** If the data should be protected, add `requireAuth`:
```typescript
import { requireAuth } from '../middleware/requireAuth'
router.use(requireAuth)
router.get('/', asyncHandler(leaderboardController.list))
```
If the leaderboard is intentionally public, add a comment documenting that decision so the next developer doesn't add auth by accident and break it.

---

## Warnings

### WR-01: score-sync loops with individual `await db.update` inside a for-loop — no transaction, partial updates possible

**File:** `backend/src/jobs/score-sync.ts:81-99, 127-131`
**Issue:** Each fixture update and each prediction scoring update is executed as a separate, non-transactional DB call inside a loop. If the process crashes or is killed mid-loop, some fixtures will be updated to `FT` without their predictions being scored, and the idempotency check on `points === null` will not help because the fixture is already `FT`. The `scorePredictions` function also issues one `UPDATE` per prediction row rather than a bulk update.
**Fix:** Wrap each fixture's update + prediction scoring in a transaction. Also replace the per-row prediction update with a bulk update using `inArray`:
```typescript
import { inArray } from 'drizzle-orm'

// Bulk update all predictions for a fixture at once
await db
  .update(predictions)
  .set({ points: calculatedPoints }) // requires computing per-row, so use a CASE expression or loop within transaction
  // At minimum, wrap in a transaction:
await db.transaction(async (tx) => {
  await tx.update(fixtures).set({ ... }).where(eq(fixtures.id, id))
  await scorePredictions(tx, id, homeScore, awayScore)
})
```

---

### WR-02: `req.user` cast to `any` suppresses type safety

**File:** `backend/src/controllers/predictions.controller.ts:13,24`
**Issue:** `(req.user as any).id` will throw at runtime if `req.user` is `undefined` (i.e., `requireAuth` was bypassed or the session was destroyed between middleware and handler execution). TypeScript's type system is defeated by the `as any` cast and will not warn about this.
**Fix:** Define a typed user interface and extend Express's `Request`:
```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface User { id: string }
  }
}

// In controller:
const userId = req.user?.id
if (!userId) return res.status(401).json({ error: 'Unauthorized' })
```

---

### WR-03: `calculatePredictionPoints` returns `pointsDraw` for correct draw outcome even when the exact score is not matched, conflating two scoring cases

**File:** `backend/src/services/scoring.ts:31-32`
**Issue:** The logic on line 32 returns `weights.pointsDraw` when `homeRes === awayRes` (i.e., actual result is a draw) and the predicted outcome also matched (draw). But the exact score was already checked and ruled out on line 26. This means predicting a draw with wrong goals (e.g., predicting 1-1 when result is 2-2) returns `pointsDraw`, which appears intended — but the variable name `pointsDraw` implies "bonus for correctly predicting a draw outcome" while `pointsWinnerOnly` means "correctly predicting the winner without exact score". These are symmetric cases, yet they use different point values. The asymmetry is not documented and may be a logic error: a wrong-score draw prediction arguably deserves the same points as a correct-winner prediction.
**Fix:** Document the scoring intent explicitly with a comment, or unify to `pointsOutcome` for both cases if equal treatment is desired:
```typescript
// Both cases: correct outcome (winner or draw) but wrong exact score
if (actual !== predicted) return 0
// Draw outcome correct but not exact
if (homeRes === awayRes) return weights.pointsDraw
// Winner correct but not exact
return weights.pointsWinnerOnly
```

---

### WR-04: `leaderboard.controller.ts` filters out users with `totalPoints === null` — users with zero scored predictions are silently omitted

**File:** `backend/src/controllers/leaderboard.controller.ts:8`
**Issue:** `.filter((r) => r.totalPoints !== null)` removes users who have predictions but no points yet (all matches still in progress). This means the leaderboard is incomplete — it only shows users who have at least one scored prediction. A user who made predictions but whose fixtures haven't finished yet appears as if they don't exist on the leaderboard, which is misleading.
**Fix:** Include all users and treat `null` as `0`:
```typescript
const sorted = rows.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
```

---

### WR-05: `normalizeStatus` in score-sync does not handle `'CANC'`, `'PST'` (cancelled/postponed) statuses

**File:** `backend/src/jobs/score-sync.ts:20-27`
**Issue:** If the Bzzoiro API returns a status of `'cancelled'` or `'postponed'`, `normalizeStatus` returns the raw lowercased value (`'cancelled'`, `'postponed'`). This gets written to the DB as-is and the fixture remains in the `active` filter on the next run (because only `'NS'` and `'inprogress'` are excluded, and `'cancelled'` is neither). The fixture will be re-fetched and re-evaluated on every sync run forever.
**Fix:** Add handling for these statuses:
```typescript
if (['cancelled', 'canc', 'postponed', 'pst', 'susp', 'abandoned'].includes(s)) return 'CANC'
```
Then exclude `'CANC'` (and similar terminal non-FT statuses) from the `active` filter.

---

## Info

### IN-01: `console.log` / `console.error` used for observability throughout score-sync

**File:** `backend/src/jobs/score-sync.ts:90,103,106,133`
**Issue:** Production jobs typically use a structured logger (e.g., `pino`, `winston`) rather than `console.log` so that log levels, timestamps, and context are machine-readable. `console.log` calls also remain visible in test output.
**Fix:** Replace with a project logger when one is adopted.

---

### IN-02: `findAllMiniLeagues` returns all rows with no pagination or limit

**File:** `backend/src/models/mini-league.model.ts:4-6`
**Issue:** If the number of mini-leagues grows, this query has no upper bound. For now it is harmless but should be noted.
**Fix:** Add a `.limit()` or pagination support before the data set grows.

---

### IN-03: Magic numbers in scoring weights

**File:** `backend/src/services/scoring.ts:7-11`
**Issue:** The default point values (5, 3, 1) are defined as a constant object but there is no validation that prevents a caller from passing weights of 0 or negative values, which would produce nonsensical (or negative) scores.
**Fix:** Add a guard or document the expected range:
```typescript
// Optionally validate:
if (weights.pointsExact <= 0 || weights.pointsWinnerOnly <= 0 || weights.pointsDraw <= 0) {
  throw new Error('Scoring weights must be positive')
}
```

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
