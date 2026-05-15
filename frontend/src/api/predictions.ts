import { apiFetch } from './client'

export interface Prediction {
  id: string
  fixtureId: number
  homeGoals: number
  awayGoals: number
}

export function fetchPredictions(tournamentId?: string | null): Promise<Prediction[]> {
  const params = tournamentId ? `?tournamentId=${tournamentId}` : ''
  return apiFetch<Prediction[]>(`/api/predictions${params}`)
}

export function savePrediction(fixtureId: number, homeGoals: number, awayGoals: number): Promise<void> {
  return apiFetch('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({ fixtureId, homeGoals, awayGoals }),
  })
}
