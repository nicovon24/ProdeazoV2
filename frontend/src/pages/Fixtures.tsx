import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

interface Fixture {
  id: number
  date: string
  round: string | null
  status: string | null
  homeScore: number | null
  awayScore: number | null
  homeTeamId: number
  awayTeamId: number
}

export function Fixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Fixture[]>('/api/fixtures')
      .then(setFixtures)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Cargando partidos...</div>

  return (
    <div>
      <h2>Partidos</h2>
      <ul>
        {fixtures.map((f) => (
          <li key={f.id}>
            {f.round} — {new Date(f.date).toLocaleString()} — {f.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
