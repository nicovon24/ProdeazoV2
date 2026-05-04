import { useAuth } from '../hooks/useAuth'

export function Home() {
  const { user, logout } = useAuth()

  return (
    <div>
      <h1>Bienvenido, {user?.name}</h1>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  )
}
