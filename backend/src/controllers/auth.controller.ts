import type { Request, Response } from 'express'

export function oauthCallbackSuccess(_req: Request, res: Response) {
  res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173')
}

export function logout(req: Request, res: Response, next: (err?: unknown) => void) {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr)
      res.json({ ok: true })
    })
  })
}

export function me(req: Request, res: Response) {
  if (!req.isAuthenticated()) return res.status(401).json({ user: null })
  const { id, email, name, avatar } = req.user as any
  res.json({ user: { id, email, name, avatar } })
}
