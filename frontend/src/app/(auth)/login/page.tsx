"use client";

import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function Login() {
  const router = useRouter()
  const user = null
  const loading = false

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-foreground/70">Cargando...</div>
  
  if (user) {
    router.replace('/fixture')
    return null
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Prodeazo</h1>
      <p className="text-foreground/70">Ingresá para hacer tus predicciones</p>
      <a
        href={`${API_URL}/api/auth/google`}
        className="rounded-full bg-green-500 px-6 py-3 text-sm font-bold text-black transition-[filter] hover:brightness-95"
      >
        Iniciar sesión con Google
      </a>
    </div>
  )
}
