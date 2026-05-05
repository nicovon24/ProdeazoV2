import type { RequestHandler } from 'express'
import { Router } from 'express'
import passport, { isGoogleOAuthEnabled } from '../config/passport'

const router = Router()

const requireGoogleOAuth: RequestHandler = (_req, res, next) => {
  if (!isGoogleOAuthEnabled) {
    return res.status(503).json({
      error: 'Google OAuth is not configured',
      hint: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (see .env.example).',
    })
  }
  next()
}

router.get(
  '/google',
  requireGoogleOAuth,
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get(
  '/callback',
  requireGoogleOAuth,
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (_req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173')
  }
)

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr)
      res.json({ ok: true })
    })
  })
})

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ user: null })
  const { id, email, name, avatar } = req.user as any
  res.json({ user: { id, email, name, avatar } })
})

export default router
