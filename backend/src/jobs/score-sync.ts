import { db } from '../db/client'
import { fixtures, predictions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { fetchScoresForDate } from '../services/bzzoiro.service'
import { calculatePredictionPoints } from '../services/scoring'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseInt(value, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

function normalizeStatus(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : null
  if (!s) return null
  if (['ft', 'finished', 'fulltime', 'full-time', 'aet', 'pen'].includes(s)) return 'FT'
  if (['inprogress', 'live', 'in_play', '1h', '2h', 'ht'].includes(s)) return 'inprogress'
  if (['ns', 'scheduled', 'notstarted', 'not_started', 'tbd'].includes(s)) return 'NS'
  return s
}

export async function runScoreSync(): Promise<void> {
  try {
    const today = todayISO()

    // Get all active fixtures (not just today) so past fixtures that
    // were delayed or had late API updates still get scored.
    const dbFixtures = await db
      .select()
      .from(fixtures)

    const active = dbFixtures.filter((f) => {
      if (!f.status || !['NS', 'inprogress'].includes(f.status)) return false
      if (!f.date) return false
      // Include fixtures up to 2 days in the past to handle API delays.
      const fixtureDate = f.date.toISOString().slice(0, 10)
      return fixtureDate <= today
    })

    if (active.length === 0) return

    const activeIds = new Set(active.map((f) => f.id))

    // Fetch scores for every distinct date in active (handles delayed past fixtures)
    const distinctDates = [...new Set(active.map((f) => f.date!.toISOString().slice(0, 10)))]
    const rowArrays = await Promise.all(distinctDates.map((d) => fetchScoresForDate(d)))
    const rows = rowArrays.flat()

    let updated = 0

    for (const row of rows) {
      const id =
        typeof row.id === 'number'
          ? row.id
          : typeof row.id === 'string'
            ? Number.parseInt(row.id, 10)
            : NaN

      if (!Number.isFinite(id) || !activeIds.has(id)) continue

      const dbFixture = active.find((f) => f.id === id)
      if (!dbFixture) continue

      const scores = (row.scores ?? row.score) as Record<string, unknown> | null
      const homeScore = parseScore(row.home_score ?? scores?.home ?? scores?.home_score)
      const awayScore = parseScore(row.away_score ?? scores?.away ?? scores?.away_score)
      const newStatus = normalizeStatus(row.status ?? row.status_type)

      const changed =
        homeScore !== dbFixture.homeScore ||
        awayScore !== dbFixture.awayScore ||
        (newStatus !== null && newStatus !== dbFixture.status)

      if (!changed) continue

      await db
        .update(fixtures)
        .set({
          ...(homeScore !== null ? { homeScore } : {}),
          ...(awayScore !== null ? { awayScore } : {}),
          ...(newStatus !== null ? { status: newStatus } : {}),
        })
        .where(eq(fixtures.id, id))

      console.log(
        `[score-sync] Updated fixture ${id}: ${dbFixture.status} → ${newStatus ?? dbFixture.status}, score ${homeScore ?? dbFixture.homeScore}-${awayScore ?? dbFixture.awayScore}`
      )
      updated++

      // Auto-score predictions when fixture reaches FT for the first time
      const transitioningToFT = newStatus === 'FT' && dbFixture.status !== 'FT'
      if (transitioningToFT && homeScore !== null && awayScore !== null) {
        await scorePredictions(id, homeScore, awayScore)
      }
    }

    if (updated > 0) {
      console.log(`[score-sync] ${updated} fixture(s) updated`)
    }
  } catch (err) {
    console.error('[score-sync] Error during sync:', err instanceof Error ? err.message : err)
  }
}

async function scorePredictions(fixtureId: number, homeScore: number, awayScore: number): Promise<void> {
  // Only score predictions that haven't been scored yet (idempotent)
  const unscored = await db
    .select()
    .from(predictions)
    .where(eq(predictions.fixtureId, fixtureId))

  const toScore = unscored.filter((p) => p.points === null)
  if (toScore.length === 0) return

  for (const prediction of toScore) {
    const points = calculatePredictionPoints(
      prediction.homeGoals,
      prediction.awayGoals,
      homeScore,
      awayScore
    )
    await db
      .update(predictions)
      .set({ points })
      .where(eq(predictions.id, prediction.id))
  }

  console.log(`[score-sync] Fixture ${fixtureId} FT — ${toScore.length} prediction(s) scored`)
}
