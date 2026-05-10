"use client";

import { useAuth } from '../../../hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground/70">
        Cargando...
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-display font-black tracking-tight uppercase">
              Prode<span className="text-primary">azo</span>
            </h1>
            <p className="text-foreground/60">Bienvenido, {user.name}</p>
          </div>
          <button
            onClick={() => logout()}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-bold"
          >
            Cerrar Sesión
          </button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group">
            <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Mi Perfil</h2>
            <p className="text-foreground/60 mb-4">Revisá tus estadísticas, aciertos y posición en el ranking.</p>
            <div className="text-2xl font-display font-black text-primary">0 Pts</div>
          </section>

          <Link 
            href="/fixture"
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group"
          >
            <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Próximos Partidos</h2>
            <p className="text-foreground/60 mb-4">Cargá tus pronósticos para el Mundial 2026.</p>
            <div className="text-primary font-bold flex items-center gap-2">
              Ver fixture →
            </div>
          </Link>
        </main>
      </div>
    </div>
  )
}
