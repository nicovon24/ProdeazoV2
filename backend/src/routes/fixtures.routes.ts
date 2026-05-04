import { Router } from 'express'
import { db } from '../db/client'
import { fixtures } from '../db/schema'
import { getCache, setCache } from '../services/cache.service'
import { fetchLiveScores, fetchStandings } from '../services/bzzoiro.service'

const router = Router()
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || ''

router.get('/', async (_req, res) => {
  const all = await db.select().from(fixtures)
  res.json(all)
})

router.get('/live', async (_req, res) => {
  const cacheKey = `live:${TOURNAMENT_ID}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  const data = await fetchLiveScores()
  await setCache(cacheKey, data, 60)
  res.json(data)
})

router.get('/standings', async (_req, res) => {
  const cacheKey = `standings:${TOURNAMENT_ID}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  const data = await fetchStandings()
  await setCache(cacheKey, data, 900)
  res.json(data)
})

export default router
