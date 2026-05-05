import { Router } from 'express'
import { db } from '../db/client'
import { teams } from '../db/schema'
import { fetchPlayersForTeam } from '../services/bzzoiro.service'
import { getCache, setCache } from '../services/cache.service'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

const PLAYERS_CACHE_TTL_SEC = Number(process.env.BZZOIRO_PLAYERS_CACHE_TTL_SEC) || 120

router.get('/', asyncHandler(async (_req, res) => {
  const all = await db.select().from(teams)
  res.json(all)
}))

/** Proxies BSD `GET /v2/teams/:id/squad/` — short Redis cache; no reliance on deprecated `/players/`. */
router.get('/:id/players', asyncHandler(async (req, res) => {
  const teamId = Number(req.params.id)
  if (!Number.isFinite(teamId) || teamId < 1) {
    return res.status(400).json({ error: 'Invalid team id' })
  }

  const cacheKey = `players:bzzoiro:${teamId}`
  const cached = await getCache<Awaited<ReturnType<typeof fetchPlayersForTeam>>>(cacheKey)
  if (cached) return res.json(cached)

  try {
    const squad = await fetchPlayersForTeam(teamId)
    await setCache(cacheKey, squad, PLAYERS_CACHE_TTL_SEC)
    res.json(squad)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch players from provider'
    res.status(502).json({ error: message })
  }
}))

export default router
