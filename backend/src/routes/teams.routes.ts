import { Router } from 'express'
import * as teamsController from '../controllers/teams.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(teamsController.list))

export default router