import type { Request, Response } from 'express'
import { paginate } from '../utils/paginate'
import { getCache, setCache } from '../services/cache.service'
import {
  fetchLiveScores,
  fetchStandings,
  fetchEventTeamLabelsForSeason,
  fetchEventTeamLabelsForLeague,
  type FixtureTeamLabels,
} from '../services/bzzoiro.service'
import { isLikelyBracketPlaceholder } from '../providers/participant-names'
import * as fixtureModel from '../models/fixture.model'

type FixtureLabelCacheEntry = [number, FixtureTeamLabels]

const TOURNAMENT_ID = process.env.TOURNAMENT_ID || ''
const LABEL_CACHE_TTL_SEC = Number(process.env.FIXTURE_TEAM_LABELS_CACHE_TTL_SEC) || 300

type FixtureListRow = Awaited<ReturnType<typeof fixtureModel.findFixturesWithTeams>>[number]

export async function list(req: Request, res: Response) {
  const rows = await fixtureModel.findFixturesWithTeams()

  const leagueRaw = process.env.BZZOIRO_LEAGUE_ID?.trim()
  const leagueNum = leagueRaw ? Number(leagueRaw) : NaN
  const seasonRaw = process.env.TOURNAMENT_ID?.trim()
  const seasonId = seasonRaw ? Number(seasonRaw) : NaN

  let out: FixtureListRow[] = rows
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

  res.json(paginate(out, req))
}

export async function live(req: Request, res: Response) {
  const cacheKey = `live:${TOURNAMENT_ID}`
  const cached = await getCache<unknown[]>(cacheKey)
  if (cached) return res.json(paginate(cached, req))

  const data = await fetchLiveScores()
  await setCache(cacheKey, data, 60)
  res.json(paginate(Array.isArray(data) ? data : [data], req))
}

export async function standings(req: Request, res: Response) {
  const cacheKey = `standings:${TOURNAMENT_ID}`
  const cached = await getCache<unknown[]>(cacheKey)
  if (cached) return res.json(paginate(cached, req))

  const data = await fetchStandings()
  await setCache(cacheKey, data, 900)
  res.json(paginate(Array.isArray(data) ? data : [data], req))
}
