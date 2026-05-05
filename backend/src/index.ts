import './env'
import express from 'express'
import { runScoreSync } from './jobs/score-sync'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import cors from 'cors'
import morgan from 'morgan'
import passport from './config/passport'
import { redis } from './config/redis'
import authRoutes from './routes/auth.routes'
import teamsRoutes from './routes/teams.routes'
import fixturesRoutes from './routes/fixtures.routes'
import predictionsRoutes from './routes/predictions.routes'

const app = express()
const PORT = process.env.PORT || 4000

const sessionSecret =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : 'dev-session-secret-not-for-production')

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required in production')
}

const useMemorySessions = process.env.SESSION_STORE === 'memory'

if (useMemorySessions) {
  console.warn('[session] Using in-memory store (set SESSION_STORE=redis when Redis is available)')
}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))

const morganFormat =
  process.env.MORGAN_FORMAT ||
  (process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
app.use(morgan(morganFormat))

app.use(express.json())

app.use(
  session({
    ...(useMemorySessions
      ? {}
      : { store: new RedisStore({ client: redis }) }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
)

app.use(passport.initialize())
app.use(passport.session())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/fixtures', fixturesRoutes)
app.use('/api/predictions', predictionsRoutes)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  res.status(500).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
  void runScoreSync()
  setInterval(() => void runScoreSync(), 60_000)
})
