import { Router } from 'express'
import passport from '../config/passport'

const router = Router()

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get(
  '/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (_req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173')
  }
)

router.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ ok: true })
  })
})

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ user: null })
  res.json({ user: req.user })
})

export default router
