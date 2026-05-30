import { create } from 'zustand'
import api, { TOKEN_KEY } from '../lib/api'
import { storage } from '../lib/storage'
import { Platform } from 'react-native'
import type { User, LoginRequest } from '../types'
import base64Decode from '../lib/base64'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitializing: boolean
  error: string | null
  init: () => Promise<void>
  login: (data: LoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitializing: true,
  error: null,

  init: async () => {
    try {
      const token = await storage.getItem(TOKEN_KEY)

      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(base64Decode(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          const expiry = payload.exp
          if (expiry && expiry * 1000 > Date.now()) {
            set({
              user: {
                id: payload.user_id || 0,
                name: payload.email?.split('@')[0] || 'User',
                email: payload.email || '',
                role: payload.role || 'cashier',
              },
              token,
            })
          } else {
            await storage.deleteItem(TOKEN_KEY)
          }
        }
      }
    } catch {
      await storage.deleteItem(TOKEN_KEY).catch(() => {})
    } finally {
      set({ isInitializing: false })
    }
  },

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/login', data)
      const { token, user } = response.data
      
      await storage.setItem(TOKEN_KEY, token)
      
      set({ user, token, isLoading: false })
      return true
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Login failed'
      set({ error: message, isLoading: false })
      return false
    }
  },

  logout: async () => {
    await storage.deleteItem(TOKEN_KEY)
    set({ user: null, token: null, error: null })
  },

  clearError: () => set({ error: null }),
}))
