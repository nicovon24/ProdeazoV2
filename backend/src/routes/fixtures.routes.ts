import { Router } from 'express'
import * as fixturesController from '../controllers/fixtures.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(fixturesController.list))
router.get('/live', asyncHandler(fixturesController.live))
router.get('/standings', asyncHandler(fixturesController.standings))

export default router
