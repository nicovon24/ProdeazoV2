import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { db } from '../db/client'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.googleId, profile.id))
          .limit(1)

        if (existing.length > 0) {
          return done(null, existing[0])
        }

        const [newUser] = await db
          .insert(users)
          .values({
            googleId: profile.id,
            email: profile.emails?.[0]?.value ?? '',
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          })
          .returning()

        done(null, newUser)
      } catch (err) {
        done(err as Error)
      }
    }
  )
)

passport.serializeUser((user: any, done) => done(null, user.id))

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    done(null, user ?? null)
  } catch (err) {
    done(err)
  }
})

export default passport
