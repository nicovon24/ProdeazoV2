import { Router } from 'express'
import { db } from '../db/client'
import { teams, players } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = Router()

router.get('/', async (_req, res) => {
  const all = await db.select().from(teams)
  res.json(all)
})

router.get('/:id/players', async (req, res) => {
  const teamId = Number(req.params.id)
  const squad = await db.select().from(players).where(eq(players.teamId, teamId))
  res.json(squad)
})

export default router
