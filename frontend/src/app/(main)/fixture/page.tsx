"use client";

import { useEffect, useState } from 'react'

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

export default function Fixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Note: Replaced temporary fetch relative to origin
    fetch('/api/fixtures')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setFixtures(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-foreground">Cargando partidos...</div>

  return (
    <div className="p-4 bg-background text-foreground min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Partidos</h2>
      <ul>
        {fixtures.length === 0 && <li>No hay partidos programados.</li>}
        {fixtures.map((f) => (
          <li key={f.id} className="py-2 border-b border-foreground/10">
            {f.round} — {new Date(f.date).toLocaleString()} — <span className="font-semibold text-green-500">{f.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
