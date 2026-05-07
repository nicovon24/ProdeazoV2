import { Router } from 'express'
import * as miniLeaguesController from '../controllers/mini-leagues.controller'
import { requireAuth } from '../middleware/requireAuth'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.use(requireAuth)

router.get('/mine', asyncHandler(miniLeaguesController.mine))
router.post('/', asyncHandler(miniLeaguesController.create))
router.get('/:id', asyncHandler(miniLeaguesController.detail))
router.post('/:id/join', asyncHandler(miniLeaguesController.join))
router.post('/join', asyncHandler(miniLeaguesController.join))
router.delete('/:id/leave', asyncHandler(miniLeaguesController.leave))
router.delete('/:id/members/:userId', asyncHandler(miniLeaguesController.removeMember))
router.get('/:id/leaderboard', asyncHandler(miniLeaguesController.leaderboard))

export default router
