import 'dotenv/config'
import { ProviderHttpClient } from '../providers/http'

function baseUrl(): string {
  return (process.env.BZZOIRO_BASE_URL ?? 'https://sports.bzzoiro.com/api').replace(/\/+$/, '')
}

function createClient(): ProviderHttpClient {
  const apiKey = process.env.BZZOIRO_API_KEY
  if (!apiKey) throw new Error('Missing BZZOIRO_API_KEY')
  return new ProviderHttpClient({
    baseUrl: baseUrl(),
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: 'application/json',
    },
  })
}

/** Live matches (paginated envelope from BSD — see openapi `/live/`). */
export async function fetchLiveScores() {
  const tz = process.env.BSD_TIMEZONE ?? 'UTC'
  return createClient().get<unknown>('/live/', { tz })
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
    `/leagues/${leagueId}/standings/`,
    season !== undefined && Number.isFinite(season) ? { season } : {}
  )
}
