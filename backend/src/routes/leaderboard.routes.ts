import { Router } from 'express'
import { db } from '../db/client'
import { predictions, users } from '../db/schema'
import { eq, isNotNull, sum } from 'drizzle-orm'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(async (_req, res) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      totalPoints: sum(predictions.points).mapWith(Number),
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .where(isNotNull(predictions.points))
    .groupBy(users.id, users.name, users.avatar)
    .orderBy(sum(predictions.points))

  // orderBy DESC — drizzle's sum().desc() requires sql helper; sort in JS
  const sorted = rows
    .filter((r) => r.totalPoints !== null)
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))

  res.json(sorted)
}))

export default router
