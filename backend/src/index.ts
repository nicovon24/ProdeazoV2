import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import cors from 'cors'
import passport from './config/passport'
import { redis } from './config/redis'
import authRoutes from './routes/auth.routes'
import teamsRoutes from './routes/teams.routes'
import fixturesRoutes from './routes/fixtures.routes'
import predictionsRoutes from './routes/predictions.routes'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
)

app.use(passport.initialize())
app.use(passport.session())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/fixtures', fixturesRoutes)
app.use('/api/predictions', predictionsRoutes)

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
