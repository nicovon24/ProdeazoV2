import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { predictions } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '../middleware/requireAuth'
import { asyncHandler } from '../utils/asyncHandler'

const predictionSchema = z.object({
  fixtureId: z.number().int().positive(),
  homeGoals: z.number().int().min(0).max(20),
  awayGoals: z.number().int().min(0).max(20),
})

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
  const parsed = predictionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const userId = (req.user as any).id
  const { fixtureId, homeGoals, awayGoals } = parsed.data

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
