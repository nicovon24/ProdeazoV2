import type { ProviderFixture, ProviderTeam } from './types'

export function isLikelyBracketPlaceholder(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.trim()
  if (n.length < 2 || n.length > 8) return false
  if (/^W\d+$/i.test(n)) return true
  if (/^[12][A-L]$/i.test(n)) return true
  if (/^[A-L][12]$/i.test(n)) return true
  if (/^[A-L]\d$/i.test(n)) return true
  return false
}

export function applyFlatParticipantLabel(team: ProviderTeam, flatLabelRaw: unknown): ProviderTeam {
  if (typeof flatLabelRaw !== 'string') return team
  const flat = flatLabelRaw.trim()
  if (flat.length < 3) return team
  if (!isLikelyBracketPlaceholder(team.name)) return team
  if (isLikelyBracketPlaceholder(flat)) return team
  return { ...team, name: flat, shortName: team.shortName ?? undefined }
}

export function enrichFixturesTeamsFromRoster(
  fixtures: ProviderFixture[],
  roster: ProviderTeam[]
): ProviderFixture[] {
  const byId = new Map(roster.map((t) => [t.id, t]))
  return fixtures.map((f) => ({
    ...f,
    homeTeam: mergeTeamWithRoster(f.homeTeam, byId.get(f.homeTeam.id)),
    awayTeam: mergeTeamWithRoster(f.awayTeam, byId.get(f.awayTeam.id)),
  }))
}

function mergeTeamWithRoster(side: ProviderTeam, roster?: ProviderTeam): ProviderTeam {
  if (!roster) return side
  const useRosterName =
    isLikelyBracketPlaceholder(side.name) &&
    Boolean(roster.name) &&
    !isLikelyBracketPlaceholder(roster.name)
  return {
    ...side,
    name: useRosterName ? roster.name : side.name,
    shortName: side.shortName ?? roster.shortName ?? undefined,
    country: side.country ?? roster.country,
    logoUrl: side.logoUrl ?? roster.logoUrl,
  }
}
