import { getBzzoiroImageUrl } from './images'
import { ProviderHttpClient } from './http'
import { asNumber, asObject, asString, dedupeTeams, normalizeStatus } from './normalize'
import type {
  DataProvider,
  FixtureQuery,
  ProviderFixture,
  ProviderLeague,
  ProviderSeason,
  ProviderTeam,
} from './types'
import { applyFlatParticipantLabel } from './participant-names'

type BzzoiroProviderOptions = {
  apiKey: string
  baseUrl: string
  timezone: string
}

export function createBzzoiroProvider(options: BzzoiroProviderOptions): DataProvider {
  const client = new ProviderHttpClient({
    baseUrl: options.baseUrl,
    headers: {
      Authorization: `Token ${options.apiKey}`,
      Accept: 'application/json',
    },
  })

  return {
    name: 'bzzoiro',
    async listLeagues() {
      const rows = await client.getAllPages('/leagues/')
      return rows.map(normalizeLeague).filter(Boolean) as ProviderLeague[]
    },
    async listSeasons(params) {
      const rows = await client.getAllPages('/seasons/', {
        league: params?.leagueId,
        current: params?.current,
      })
      return rows.map(normalizeSeason).filter(Boolean) as ProviderSeason[]
    },
    async listTeams(params) {
      const rows = await client.getAllPages('/teams/', {
        country: params?.country,
        league: params?.leagueId,
      })
      return rows.map(normalizeTeam).filter(Boolean) as ProviderTeam[]
    },
    async listFixtures(params: FixtureQuery) {
      const rows = await client.getAllPages('/events/', {
        date_from: params.dateFrom,
        date_to: params.dateTo,
        season: params.seasonId,
        team_id: params.teamId,
        league: params.leagueId,
        tz: params.timezone ?? options.timezone,
        full: params.full,
      })
      const fixtures = rows.map(normalizeFixture).filter(Boolean) as ProviderFixture[]
      if (rows.length > 0 && fixtures.length === 0) {
        console.warn('[bzzoiro] /events/ returned rows but none passed normalizeFixture')
      }
      return fixtures
    },
  }
}

function normalizeLeague(value: unknown): ProviderLeague | null {
  const row = asObject(value)
  const id = asString(row.id)
  const name = asString(row.name)
  if (!id || !name) return null
  const currentSeason = asObject(row.current_season)
  return {
    id,
    name,
    country: asString(row.country),
    logoUrl: getBzzoiroImageUrl('league', id),
    currentSeasonId: asString(currentSeason.id),
    raw: value,
  }
}

function normalizeSeason(value: unknown): ProviderSeason | null {
  const row = asObject(value)
  const id = asString(row.id)
  const name = asString(row.name)
  const leagueNested = row.league
  const nestedId =
    leagueNested &&
    typeof leagueNested === 'object' &&
    'id' in (leagueNested as object)
      ? asString((leagueNested as { id?: unknown }).id)
      : null
  const leagueId =
    asString(row.league_id) ??
    nestedId ??
    asString(leagueNested) ??
    asString(asObject(row.league_obj).id)
  if (!id || !name || !leagueId) return null
  return {
    id,
    name,
    leagueId,
    startsAt: asString(row.start_date ?? row.starts_at),
    endsAt: asString(row.end_date ?? row.ends_at),
    current: row.current === true,
    raw: value,
  }
}

function normalizeTeam(value: unknown): ProviderTeam | null {
  const row = asObject(value)
  const id = asString(row.id)
  const name = asString(row.name ?? row.official_name ?? row.display_name ?? row.long_name)
  if (!id || !name) return null
  return {
    id,
    name,
    shortName: asString(row.short_name ?? row.shortName ?? row.code),
    country: asString(row.country),
    logoUrl: asString(row.logo) ?? getBzzoiroImageUrl('team', id),
    raw: value,
  }
}

function normalizeEventSideParticipant(
  row: Record<string, unknown>,
  side: 'home' | 'away'
): ProviderTeam | null {
  const nested =
    side === 'home'
      ? (row.home_team_obj ?? row.home_team ?? row.home ?? row.localteam)
      : (row.away_team_obj ?? row.away_team ?? row.away ?? row.visitorteam)
  let team = normalizeTeam(nested)
  const flatKey = side === 'home' ? 'home_team' : 'away_team'
  const idKey = side === 'home' ? 'home_team_id' : 'away_team_id'
  if (!team && typeof row[flatKey] === 'string') {
    const id = asString(row[idKey])
    const label = String(row[flatKey]).trim()
    if (id && label) {
      team = {
        id,
        name: label,
        shortName: null,
        country: null,
        logoUrl: getBzzoiroImageUrl('team', id),
        raw: { label, source: flatKey },
      }
    }
  }
  if (!team) return null
  return applyFlatParticipantLabel(team, row[flatKey])
}

function normalizeFixture(value: unknown): ProviderFixture | null {
  const row = asObject(value)
  const id = asString(row.id)
  const kickoffAt = asString(
    row.event_date ?? row.start_at ?? row.kickoff_at ?? row.date ?? row.datetime
  )
  const homeTeam = normalizeEventSideParticipant(row, 'home')
  const awayTeam = normalizeEventSideParticipant(row, 'away')
  if (!id || !kickoffAt || !homeTeam || !awayTeam) return null

  const leagueObj = asObject(row.league)
  const seasonObj = asObject(row.season)
  const scores = asObject(row.scores ?? row.score)
  return {
    id,
    leagueId: asString(leagueObj.id) ?? asString(asObject(row.league_obj).id),
    seasonId: asString(seasonObj.id) ?? asString(asObject(row.season_obj).id),
    phase: asString(row.round_name ?? row.round ?? row.stage ?? row.phase ?? row.round_number),
    kickoffAt,
    status: normalizeStatus(row.status ?? row.status_type),
    homeTeam,
    awayTeam,
    homeScore: asNumber(row.home_score ?? scores.home ?? scores.home_score),
    awayScore: asNumber(row.away_score ?? scores.away ?? scores.away_score),
    raw: value,
  }
}

export function extractTeamsFromFixtures(fixtures: ProviderFixture[]) {
  return dedupeTeams(fixtures.flatMap((f) => [f.homeTeam, f.awayTeam]))
}
