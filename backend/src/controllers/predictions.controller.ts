import type { Request, Response } from 'express'
import { z } from 'zod'
import * as predictionModel from '../models/prediction.model'
import * as fixtureModel from '../models/fixture.model'
import { paginate } from '../utils/paginate'
import { err } from '../utils/apiError'

const predictionSchema = z.object({
  fixtureId: z.number().int().positive(),
  homeGoals: z.number().int().min(0).max(20),
  awayGoals: z.number().int().min(0).max(20),
})

export async function list(req: Request, res: Response) {
  const userId = (req.user as any).id
  const userPredictions = await predictionModel.findPredictionsByUserId(userId)
  res.json(paginate(userPredictions, req))
}

export async function createOrUpdate(req: Request, res: Response) {
  const parsed = predictionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(err('VALIDATION_ERROR', 'Invalid request body'))
  }

  const userId = (req.user as any).id
  const { fixtureId, homeGoals, awayGoals } = parsed.data

  const [fixture] = await fixtureModel.findFixtureStatusById(fixtureId)

  if (!fixture) {
    return res.status(404).json(err('NOT_FOUND', 'Fixture not found'))
  }
  if (fixture.status !== 'NS') {
    return res.status(409).json(err('CONFLICT', 'Predictions are locked once the match has started'))
  }

  const [result] = await predictionModel.upsertPrediction(userId, fixtureId, homeGoals, awayGoals)
  res.status(201).json(result)
}
