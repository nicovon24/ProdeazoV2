import 'dotenv/config'
import { db } from '../db/client'
import { teams, players, fixtures } from '../db/schema'
import { createBzzoiroProvider, extractTeamsFromFixtures } from '../providers/bzzoiro'
import type { ProviderFixtureStatus } from '../providers/types'
import { ProviderHttpClient } from '../providers/http'
import { getBzzoiroImageUrl } from '../providers/images'

function requireEnv(): { seasonId: string; apiKey: string } {
  const seasonId = process.env.TOURNAMENT_ID?.trim()
  const apiKey = process.env.BZZOIRO_API_KEY?.trim()
  if (!apiKey) throw new Error('Missing BZZOIRO_API_KEY')
  if (!seasonId) throw new Error('Missing TOURNAMENT_ID (BSD season id from /api/seasons/)')
  return { seasonId, apiKey }
}

function statusToDb(s: ProviderFixtureStatus): string {
  switch (s) {
    case 'live':
      return 'LIVE'
    case 'finished':
      return 'FT'
    case 'postponed':
      return 'PST'
    case 'cancelled':
      return 'CAN'
    default:
      return 'NS'
  }
}

async function seed() {
  const { seasonId, apiKey } = requireEnv()
  const tz = process.env.BSD_TIMEZONE ?? 'UTC'
  const base = (process.env.BZZOIRO_BASE_URL ?? 'https://sports.bzzoiro.com/api').replace(/\/+$/, '')

  const provider = createBzzoiroProvider({
    apiKey,
    baseUrl: base,
    timezone: tz,
  })

  console.log(`Fetching fixtures for BSD season ${seasonId}…`)
  const fixturesData = await provider.listFixtures({ seasonId })

  if (fixturesData.length === 0) {
    console.warn('No fixtures returned. Check TOURNAMENT_ID matches a valid season.')
  }

  const teamEntities = extractTeamsFromFixtures(fixturesData)
  console.log(`Seeding ${teamEntities.length} teams (and squads)…`)

  const http = new ProviderHttpClient({
    baseUrl: base,
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: 'application/json',
    },
  })

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
        group: null,
      })
      .onConflictDoNothing()

    console.log(`  ${team.name}`)

    const squad = await http.getAllPages<{ id?: number; name?: string; position?: string; jersey_number?: number | null }>(
      '/players/',
      { team: id }
    )
    for (const row of squad) {
      const pid = row.id
      if (typeof pid !== 'number' || !row.name) continue
      const photoUrl = getBzzoiroImageUrl('player', pid)
      await db
        .insert(players)
        .values({
          id: pid,
          teamId: id,
          name: row.name,
          position: row.position ?? null,
          photoUrl: photoUrl ?? null,
          number: row.jersey_number ?? null,
        })
        .onConflictDoNothing()
    }
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

    await db
      .insert(fixtures)
      .values({
        id: fid,
        homeTeamId: homeId,
        awayTeamId: awayId,
        date: new Date(fx.kickoffAt),
        round: fx.phase ?? null,
        status: statusToDb(fx.status),
        homeScore: fx.homeScore ?? null,
        awayScore: fx.awayScore ?? null,
      })
      .onConflictDoNothing()
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
