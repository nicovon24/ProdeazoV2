import type { Request, Response } from 'express'
import { findActiveTournaments } from '../models/tournament.model'

export async function list(_req: Request, res: Response) {
  const result = await findActiveTournaments()
  res.json({ tournaments: result.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, isDefault: t.isDefault })) })
}
