import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function Login() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-secondary">Cargando...</div>
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-mainBg text-primary">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Prodeazo</h1>
      <p className="text-secondary">Ingresá para hacer tus predicciones</p>
      <a
        href={`${API_URL}/api/auth/google`}
        className="rounded-full bg-brand-green px-6 py-3 text-sm font-bold text-black transition-[filter] hover:brightness-95"
      >
        Iniciar sesión con Google
      </a>
    </div>
  )
}
