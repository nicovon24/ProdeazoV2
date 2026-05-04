import { create } from 'zustand'
import { apiFetch } from '../api/client'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface AuthState {
  user: User | null
  loading: boolean
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const { user } = await apiFetch<{ user: User | null }>('/api/auth/me')
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))
