import { Router } from 'express'
import { db } from '../db/client'
import { fixtures, teams } from '../db/schema'
import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { getCache, setCache } from '../services/cache.service'
import {
  fetchLiveScores,
  fetchStandings,
  fetchEventTeamLabelsForSeason,
  fetchEventTeamLabelsForLeague,
  type FixtureTeamLabels,
} from '../services/bzzoiro.service'
import { isLikelyBracketPlaceholder } from '../providers/participant-names'
import { asyncHandler } from '../utils/asyncHandler'

type FixtureLabelCacheEntry = [number, FixtureTeamLabels]

const router = Router()
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || ''

const LABEL_CACHE_TTL_SEC = Number(process.env.FIXTURE_TEAM_LABELS_CACHE_TTL_SEC) || 300

const homeTeam = alias(teams, 'home_team')
const awayTeam = alias(teams, 'away_team')

router.get('/', asyncHandler(async (_req, res) => {
  const rows = await db
    .select({
      id: fixtures.id,
      homeTeamId: fixtures.homeTeamId,
      awayTeamId: fixtures.awayTeamId,
      date: fixtures.date,
      round: fixtures.round,
      roundNumber: fixtures.roundNumber,
      groupLabel: fixtures.groupLabel,
      leagueId: fixtures.leagueId,
      seasonId: fixtures.seasonId,
      status: fixtures.status,
      homeScore: fixtures.homeScore,
      awayScore: fixtures.awayScore,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      homeTeamShortName: homeTeam.shortName,
      awayTeamShortName: awayTeam.shortName,
      homeTeamLogoUrl: homeTeam.logoUrl,
      awayTeamLogoUrl: awayTeam.logoUrl,
    })
    .from(fixtures)
    .leftJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))

  const leagueRaw = process.env.BZZOIRO_LEAGUE_ID?.trim()
  const leagueNum = leagueRaw ? Number(leagueRaw) : NaN
  const seasonRaw = process.env.TOURNAMENT_ID?.trim()
  const seasonId = seasonRaw ? Number(seasonRaw) : NaN

  let out = rows
  const needsOverlay =
    rows.length > 0 &&
    rows.some(
      (r) =>
        isLikelyBracketPlaceholder(r.homeTeamName ?? undefined) ||
        isLikelyBracketPlaceholder(r.awayTeamName ?? undefined)
    )

  if (needsOverlay && (Number.isFinite(leagueNum) || Number.isFinite(seasonId))) {
    try {
      const cacheKey = Number.isFinite(leagueNum)
        ? `fixture_team_labels:league:${leagueNum}`
        : `fixture_team_labels:season:${seasonId}`
      let entries = await getCache<FixtureLabelCacheEntry[]>(cacheKey)
      let labelMap: Map<number, FixtureTeamLabels>
      if (entries?.length) {
        labelMap = new Map(entries)
      } else {
        labelMap = Number.isFinite(leagueNum)
          ? await fetchEventTeamLabelsForLeague(leagueNum)
          : await fetchEventTeamLabelsForSeason(seasonId)
        await setCache(cacheKey, [...labelMap.entries()] as FixtureLabelCacheEntry[], LABEL_CACHE_TTL_SEC)
      }

      out = rows.map((r) => {
        const l = labelMap.get(r.id)
        if (!l) return r
        let homeTeamName = r.homeTeamName
        let awayTeamName = r.awayTeamName
        if (isLikelyBracketPlaceholder(homeTeamName ?? undefined) && !isLikelyBracketPlaceholder(l.homeTeam))
          homeTeamName = l.homeTeam
        if (isLikelyBracketPlaceholder(awayTeamName ?? undefined) && !isLikelyBracketPlaceholder(l.awayTeam))
          awayTeamName = l.awayTeam
        return { ...r, homeTeamName, awayTeamName }
      })
    } catch {
      out = rows
    }
  }

  res.json(out)
}))

router.get('/live', asyncHandler(async (_req, res) => {
  const cacheKey = `live:${TOURNAMENT_ID}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  const data = await fetchLiveScores()
  await setCache(cacheKey, data, 60)
  res.json(data)
}))

router.get('/standings', asyncHandler(async (_req, res) => {
  const cacheKey = `standings:${TOURNAMENT_ID}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  const data = await fetchStandings()
  await setCache(cacheKey, data, 900)
  res.json(data)
}))

export default router
