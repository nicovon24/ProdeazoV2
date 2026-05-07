import '../env'
import { db, pool } from '../db/client'
import { teams, fixtures } from '../db/schema'
import { createBzzoiroProvider, extractTeamsFromFixtures } from '../providers/bzzoiro'
import { enrichFixturesTeamsFromRoster, isLikelyBracketPlaceholder } from '../providers/participant-names'
import { dedupeTeams } from '../providers/normalize'
import { FixtureStatus } from '../constants/fixture-status'
import type { ProviderFixtureStatus } from '../providers/types'
import { normalizeBzzoiroApiKey } from '../providers/bzzoiro-token'

type SeedConfig =
  | { kind: 'season'; seasonId: string; apiKey: string }
  | { kind: 'seasons'; seasonIds: string[]; apiKey: string }
  | { kind: 'league'; leagueId: string; apiKey: string }
  | { kind: 'daterange'; leagueId: string; dateFrom: string; dateTo: string; apiKey: string }

function parseFixtureSeasonIds(): string[] {
  const raw = (process.env.BZZOIRO_FIXTURE_SEASON_IDS ?? '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
}

function loadSeedConfig(): SeedConfig {
  const apiKey = normalizeBzzoiroApiKey(process.env.BZZOIRO_API_KEY ?? '')
  if (!apiKey)
    throw new Error('Missing BZZOIRO_API_KEY — add it to backend/.env or backend/.env.local')

  const seasonId = normalizeBzzoiroApiKey(process.env.TOURNAMENT_ID ?? '')
  const leagueId = (process.env.BZZOIRO_LEAGUE_ID ?? '').trim()
  const dateFrom = (process.env.BZZOIRO_EVENTS_DATE_FROM ?? '').trim()
  const dateTo = (process.env.BZZOIRO_EVENTS_DATE_TO ?? '').trim()
  const fixtureSeasonIds = parseFixtureSeasonIds()

  if (leagueId && dateFrom && dateTo) {
    return { kind: 'daterange', leagueId, dateFrom, dateTo, apiKey }
  }
  if (fixtureSeasonIds.length > 0) {
    return { kind: 'seasons', seasonIds: fixtureSeasonIds, apiKey }
  }
  if (leagueId) {
    return { kind: 'league', leagueId, apiKey }
  }
  if (seasonId) {
    return { kind: 'season', seasonId, apiKey }
  }

  throw new Error(
    'Set BZZOIRO_LEAGUE_ID (all fixtures under that league: grupos + todas las temporadas BSD), ' +
      'or BZZOIRO_FIXTURE_SEASON_IDS=383,188 (solo esas temporadas, ej. grupo + eliminatoria), ' +
      'or TOURNAMENT_ID (una sola temporada), ' +
      'or BZZOIRO_LEAGUE_ID + BZZOIRO_EVENTS_DATE_FROM + BZZOIRO_EVENTS_DATE_TO (YYYY-MM-DD).'
  )
}

function statusToDb(s: ProviderFixtureStatus): string {
  switch (s) {
    case 'live':
      return FixtureStatus.InProgress
    case 'finished':
      return FixtureStatus.Finished
    case 'postponed':
      return FixtureStatus.Postponed
    case 'cancelled':
      return FixtureStatus.Cancelled
    default:
      return FixtureStatus.NotStarted
  }
}

async function seed() {
  const config = loadSeedConfig()
  console.log(`Bzzoiro: API token loaded (${config.apiKey.length} chars).`)
  const tz = process.env.BSD_TIMEZONE ?? 'UTC'
  const base = (process.env.BZZOIRO_BASE_URL ?? 'https://sports.bzzoiro.com/api').replace(/\/+$/, '')

  const provider = createBzzoiroProvider({
    apiKey: config.apiKey,
    baseUrl: base,
    timezone: tz,
  })

  let fixturesData: Awaited<ReturnType<typeof provider.listFixtures>>
  if (config.kind === 'season') {
    console.log(`Fetching fixtures for BSD season ${config.seasonId}…`)
    fixturesData = await provider.listFixtures({ seasonId: config.seasonId })
  } else if (config.kind === 'seasons') {
    console.log(`Fetching fixtures for BSD seasons ${config.seasonIds.join(', ')}…`)
    const seen = new Set<string>()
    fixturesData = []
    for (const sid of config.seasonIds) {
      const chunk = await provider.listFixtures({ seasonId: sid })
      for (const f of chunk) {
        if (seen.has(f.id)) continue
        seen.add(f.id)
        fixturesData.push(f)
      }
    }
    console.log(`  → merged ${fixturesData.length} unique fixtures`)
  } else if (config.kind === 'league') {
    console.log(
      `Fetching all fixtures for BSD league ${config.leagueId} (paginated /v2/events/?league_id=… ; grupos + todas las temporadas de esa liga)…`
    )
    fixturesData = await provider.listFixtures({ leagueId: config.leagueId })
    console.log(`  → ${fixturesData.length} fixtures`)
  } else {
    console.log(
      `Fetching fixtures for league ${config.leagueId} (${config.dateFrom} … ${config.dateTo})…`
    )
    fixturesData = await provider.listFixtures({
      leagueId: config.leagueId,
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
    })
  }

  const leagueIdForRoster =
    config.kind === 'daterange' || config.kind === 'league'
      ? config.leagueId
      : process.env.BZZOIRO_LEAGUE_ID?.trim() || fixturesData.find((f) => f.leagueId)?.leagueId || ''

  let rosterFull: Awaited<ReturnType<typeof provider.listTeams>> = []
  if (leagueIdForRoster) {
    rosterFull = await provider.listTeams({
      leagueId: leagueIdForRoster,
      inCompetition: true,
      v2Limit: Number(process.env.BZZOIRO_V2_TEAMS_LIMIT) || 1000,
    })
    fixturesData = enrichFixturesTeamsFromRoster(fixturesData, rosterFull)
  }

  if (fixturesData.length === 0) {
    if (config.kind === 'season') {
      console.warn('No fixtures returned for this season.')
      const leagueFilter = process.env.BZZOIRO_LEAGUE_ID?.trim()
      const seasons = await provider.listSeasons(leagueFilter ? { leagueId: leagueFilter } : {})
      const found = seasons.find((s) => s.id === config.seasonId)
      if (found) {
        console.warn(
          `Season ${config.seasonId} exists (${found.name}). If there are still no events, the dataset may be empty for that season on your plan, or use another TOURNAMENT_ID from GET /api/seasons/.`
        )
      } else {
        const examples = seasons
          .slice(0, 12)
          .map((s) => `${s.id}=${s.name}`)
          .join('; ')
        console.warn(
          `Season id "${config.seasonId}" not in /seasons/ results${leagueFilter ? ` for league ${leagueFilter}` : ''}. ` +
            (examples ? `Sample seasons: ${examples}. ` : '') +
            'Set TOURNAMENT_ID to the numeric `id` from https://sports.bzzoiro.com/api/seasons/ (optional: ?league=league_id).'
        )
      }
    } else if (config.kind === 'seasons') {
      console.warn(`No fixtures for any of seasons ${config.seasonIds.join(', ')}. Check ids under GET /v2/leagues/:id/seasons/.`)
    } else if (config.kind === 'league') {
      console.warn(
        `No events returned for league ${config.leagueId}. Confirm BZZOIRO_LEAGUE_ID (GET /v2/leagues/) or try BZZOIRO_FIXTURE_SEASON_IDS with grupo + knockout ids.`
      )
    } else {
      console.warn(
        `No events for league ${config.leagueId} between ${config.dateFrom} and ${config.dateTo}. ` +
          'Widen the date range, or confirm BZZOIRO_LEAGUE_ID (GET /v2/leagues/). You can also switch to TOURNAMENT_ID if /api/seasons/?league=ID lists a season for this competition.'
      )
    }
  }

  const fromFixtures = extractTeamsFromFixtures(fixturesData)
  const nationsWithCountry = rosterFull.filter((t) => Boolean(t.country?.trim()))
  const teamEntities = dedupeTeams([...fromFixtures, ...nationsWithCountry])
  if (nationsWithCountry.length > 0) {
    console.log(
      `[seed] Merged ${nationsWithCountry.length} teams with country from v2 roster + ${fromFixtures.length} sides from fixtures → ${teamEntities.length} unique teams in DB.`
    )
  }
  const placeholderCount = teamEntities.filter((t) => isLikelyBracketPlaceholder(t.name)).length
  if (placeholderCount > 0 && teamEntities.length > 0 && placeholderCount >= Math.ceil(teamEntities.length * 0.25)) {
    console.warn(
      `[seed] ${placeholderCount}/${teamEntities.length} sides look like bracket placeholders (e.g. 1A, W73, 3C/3E/…), not final country names. ` +
        'Bzzoiro models undecided World Cup slots as synthetic “teams”; after the draw / when events show real nations, run seed again.'
    )
  }
  console.log(`Seeding ${teamEntities.length} teams…`)

  for (const team of teamEntities) {
    const id = Number.parseInt(team.id, 10)
    if (!Number.isFinite(id)) throw new Error(`Unexpected non-numeric team id: ${team.id}`)

    await db
      .insert(teams)
      .values({
        id,
        name: team.name,
        shortName: team.shortName ?? null,
        logoUrl: team.logoUrl ?? null,
        groupLabel: null,
      })
      .onConflictDoNothing()

    console.log(`  ${team.name}`)
  }

  console.log('Seeding fixtures…')
  for (const fx of fixturesData) {
    const fid = Number.parseInt(fx.id, 10)
    const homeId = Number.parseInt(fx.homeTeam.id, 10)
    const awayId = Number.parseInt(fx.awayTeam.id, 10)
    if (![fid, homeId, awayId].every(Number.isFinite)) {
      console.warn(`  Skip fixture ${fx.id} (non-numeric ids)`)
      continue
    }

    const lid =
      fx.leagueId !== undefined && fx.leagueId !== null && fx.leagueId !== ''
        ? Number.parseInt(String(fx.leagueId), 10)
        : NaN
    const sid =
      fx.seasonId !== undefined && fx.seasonId !== null && fx.seasonId !== ''
        ? Number.parseInt(String(fx.seasonId), 10)
        : NaN

    await db
      .insert(fixtures)
      .values({
        id: fid,
        homeTeamId: homeId,
        awayTeamId: awayId,
        date: new Date(fx.kickoffAt),
        round: fx.phase ?? null,
        roundNumber: fx.roundNumber ?? null,
        groupLabel: fx.groupLabel ?? null,
        leagueId: Number.isFinite(lid) ? lid : null,
        seasonId: Number.isFinite(sid) ? sid : null,
        status: statusToDb(fx.status),
        homeScore: fx.homeScore ?? null,
        awayScore: fx.awayScore ?? null,
      })
      .onConflictDoNothing()
  }

  console.log('Seed complete.')
}

async function main() {
  try {
    await seed()
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  } finally {
    await pool.end().catch(() => {})
  }
}

main()
