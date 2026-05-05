import '../env'
import { ProviderHttpClient } from '../providers/http'
import { getBzzoiroImageUrl } from '../providers/images'
import { bzzoiroAuthorizationValue, normalizeBzzoiroApiKey } from '../providers/bzzoiro-token'

function baseUrl(): string {
  return (process.env.BZZOIRO_BASE_URL ?? 'https://sports.bzzoiro.com/api').replace(/\/+$/, '')
}

function createClient(): ProviderHttpClient {
  const raw = process.env.BZZOIRO_API_KEY ?? ''
  const apiKey = normalizeBzzoiroApiKey(raw)
  if (!apiKey) throw new Error('Missing BZZOIRO_API_KEY')
  return new ProviderHttpClient({
    baseUrl: baseUrl(),
    headers: {
      Authorization: bzzoiroAuthorizationValue(apiKey),
      Accept: 'application/json',
    },
  })
}

export type BzzoiroPlayerDto = {
  id: number
  name: string
  position: string | null
  number: number | null
  photoUrl: string | null
}

/** Squad from GET /v2/teams/{id}/squad/ (brief rows; see BSD v2 docs). */
export async function fetchPlayersForTeam(teamId: number): Promise<BzzoiroPlayerDto[]> {
  const payload = await createClient().get<Record<string, unknown>>(`/v2/teams/${teamId}/squad/`)
  const rows = payload.players
  if (!Array.isArray(rows)) return []
  const out: BzzoiroPlayerDto[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const id = typeof row.id === 'number' ? row.id : null
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (id === null || !name) continue
    const rawNum = row.jersey_number ?? row.number
    let number: number | null = null
    if (typeof rawNum === 'number' && Number.isFinite(rawNum)) number = rawNum
    else if (typeof rawNum === 'string' && rawNum.trim() !== '') {
      const n = Number.parseInt(rawNum, 10)
      if (Number.isFinite(n)) number = n
    }
    const pos = row.position
    const position = typeof pos === 'string' && pos.trim() ? pos.trim() : null
    out.push({
      id,
      name,
      position,
      number,
      photoUrl: getBzzoiroImageUrl('player', id),
    })
  }
  return out
}

export type FixtureTeamLabels = { homeTeam: string; awayTeam: string }

/**
 * Map event id → display strings from BSD v2 list (`home_team` / `away_team`).
 * Use when Postgres still has bracket placeholder names per team id but API already shows nations.
 */
function collectFixtureLabels(rows: Record<string, unknown>[]): Map<number, FixtureTeamLabels> {
  const map = new Map<number, FixtureTeamLabels>()
  for (const row of rows) {
    const rawId = row.id
    const id =
      typeof rawId === 'number'
        ? rawId
        : typeof rawId === 'string'
          ? Number.parseInt(rawId, 10)
          : NaN
    if (!Number.isFinite(id)) continue
    const ht = row.home_team
    const at = row.away_team
    if (typeof ht !== 'string' || typeof at !== 'string') continue
    const homeTeam = ht.trim()
    const awayTeam = at.trim()
    if (!homeTeam || !awayTeam) continue
    map.set(id, { homeTeam, awayTeam })
  }
  return map
}

export async function fetchEventTeamLabelsForSeason(seasonId: number): Promise<Map<number, FixtureTeamLabels>> {
  const rows = await createClient().getAllPages<Record<string, unknown>>(
    '/v2/events/',
    { season_id: seasonId, limit: 200 },
    { usePageQuery: false, maxPages: 100 }
  )
  return collectFixtureLabels(rows)
}

/** All events under a league (every season): fixes overlay when group stage uses another `season_id` than knockout. */
export async function fetchEventTeamLabelsForLeague(leagueId: number): Promise<Map<number, FixtureTeamLabels>> {
  const rows = await createClient().getAllPages<Record<string, unknown>>(
    '/v2/events/',
    { league_id: leagueId, limit: 200 },
    { usePageQuery: false, maxPages: 150 }
  )
  return collectFixtureLabels(rows)
}

/** Fetch scores for today's date — used by score sync job. */
export async function fetchScoresForDate(dateISO: string): Promise<Record<string, unknown>[]> {
  return createClient().getAllPages<Record<string, unknown>>(
    '/v2/events/',
    { date_from: dateISO, date_to: dateISO, limit: 200 },
    { usePageQuery: false, maxPages: 50 }
  )
}

/** In-play matches via v2 (replaces deprecated GET /live/). */
export async function fetchLiveScores() {
  const rows = await createClient().getAllPages<unknown>(
    '/v2/events/',
    { status: 'inprogress', limit: 200 },
    { usePageQuery: false, maxPages: 15 }
  )
  return { results: rows }
}

/**
 * League table for a season. Requires `BZZOIRO_LEAGUE_ID` (BSD league pk).
 * Optional season filter via `TOURNAMENT_ID` (BSD season pk).
 */
export async function fetchStandings() {
  const leagueId = process.env.BZZOIRO_LEAGUE_ID?.trim()
  if (!leagueId) {
    return { results: [], detail: 'Set BZZOIRO_LEAGUE_ID for standings' }
  }
  const rawSeason = process.env.TOURNAMENT_ID?.trim()
  const season = rawSeason ? Number(rawSeason) : undefined
  return createClient().get<unknown>(
    `/v2/leagues/${leagueId}/standings/`,
    season !== undefined && Number.isFinite(season) ? { season_id: season } : {}
  )
}
