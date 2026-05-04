import { pgTable, text, integer, timestamp, serial } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const teams = pgTable('teams', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  logoUrl: text('logo_url'),
  group: text('group'),
})

export const players = pgTable('players', {
  id: integer('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id),
  name: text('name').notNull(),
  position: text('position'),
  photoUrl: text('photo_url'),
  number: integer('number'),
})

export const fixtures = pgTable('fixtures', {
  id: integer('id').primaryKey(),
  homeTeamId: integer('home_team_id').references(() => teams.id),
  awayTeamId: integer('away_team_id').references(() => teams.id),
  date: timestamp('date').notNull(),
  round: text('round'),
  status: text('status').default('NS'),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
})

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  googleId: text('google_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const predictions = pgTable('predictions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id),
  fixtureId: integer('fixture_id').references(() => fixtures.id),
  homeGoals: integer('home_goals').notNull(),
  awayGoals: integer('away_goals').notNull(),
  points: integer('points'),
  createdAt: timestamp('created_at').defaultNow(),
})
