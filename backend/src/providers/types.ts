export type DataProviderName = 'bzzoiro'

export type ProviderLeague = {
  id: string
  name: string
  country?: string | null
  logoUrl?: string | null
  currentSeasonId?: string | null
  raw?: unknown
}

export type ProviderSeason = {
  id: string
  name: string
  leagueId: string
  startsAt?: string | null
  endsAt?: string | null
  current?: boolean
  raw?: unknown
}

export type ProviderTeam = {
  id: string
  name: string
  shortName?: string | null
  country?: string | null
  logoUrl?: string | null
  raw?: unknown
}

export type ProviderFixtureStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'

export type ProviderFixture = {
  id: string
  leagueId?: string | null
  seasonId?: string | null
  phase?: string | null
  kickoffAt: string
  status: ProviderFixtureStatus
  homeTeam: ProviderTeam
  awayTeam: ProviderTeam
  homeScore?: number | null
  awayScore?: number | null
  raw?: unknown
}

export type ProviderStanding = {
  teamId: string
  position?: number | null
  points?: number | null
  played?: number | null
  raw?: unknown
}

export type FixtureQuery = {
  leagueId?: string
  seasonId?: string
  teamId?: string
  dateFrom?: string
  dateTo?: string
  timezone?: string
  full?: boolean
}

export type DataProvider = {
  name: DataProviderName
  listLeagues(): Promise<ProviderLeague[]>
  listSeasons(params?: { leagueId?: string; current?: boolean }): Promise<ProviderSeason[]>
  listTeams(params?: { country?: string; leagueId?: string }): Promise<ProviderTeam[]>
  listFixtures(params: FixtureQuery): Promise<ProviderFixture[]>
  listStandings?(params: { leagueId: string; seasonId?: string }): Promise<ProviderStanding[]>
}
