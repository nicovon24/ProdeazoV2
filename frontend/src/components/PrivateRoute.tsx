import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-secondary">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
