import { Router } from 'express'
import { db } from '../db/client'
import { predictions } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '../middleware/requireAuth'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.use(requireAuth)

router.get('/', asyncHandler(async (req, res) => {
  const userId = (req.user as any).id
  const userPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId))
  res.json(userPredictions)
}))

router.post('/', asyncHandler(async (req, res) => {
  const userId = (req.user as any).id
  const { fixtureId, homeGoals, awayGoals } = req.body

  const existing = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.userId, userId), eq(predictions.fixtureId, fixtureId)))
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db
      .update(predictions)
      .set({ homeGoals, awayGoals })
      .where(and(eq(predictions.userId, userId), eq(predictions.fixtureId, fixtureId)))
      .returning()
    return res.json(updated)
  }

  const [created] = await db
    .insert(predictions)
    .values({ userId, fixtureId, homeGoals, awayGoals })
    .returning()
  res.status(201).json(created)
}))

export default router
