import { db } from '../db/client'
import { fixtures } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { fetchScoresForDate } from '../services/bzzoiro.service'

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

    // Get today's active fixtures from DB
    const dbFixtures = await db
      .select()
      .from(fixtures)

    const active = dbFixtures.filter((f) => {
      if (!f.status || !['NS', 'inprogress'].includes(f.status)) return false
      if (!f.date) return false
      return f.date.toISOString().slice(0, 10) === today
    })

    if (active.length === 0) return

    const activeIds = new Set(active.map((f) => f.id))

    // Fetch updated scores from Bzzoiro
    const rows = await fetchScoresForDate(today)

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
    }

    if (updated > 0) {
      console.log(`[score-sync] ${updated} fixture(s) updated`)
    }
  } catch (err) {
    console.error('[score-sync] Error during sync:', err instanceof Error ? err.message : err)
  }
}
