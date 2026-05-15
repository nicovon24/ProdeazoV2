import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import * as tournamentsController from '../controllers/tournaments.controller'

const router = Router()
router.get('/', asyncHandler(tournamentsController.list))
export default router
