import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import type { LoginRequest } from '../types'
import { useAuthStore } from '../stores/authStore'

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const success = await login(data)
      if (!success) throw new Error('Login failed')
    },
  })
}
