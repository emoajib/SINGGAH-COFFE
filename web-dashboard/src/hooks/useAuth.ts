import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import type { AuthResponse, LoginRequest, UpdateProfileRequest, ChangePasswordRequest, User } from '../types'
import { useDispatch } from 'react-redux'
import { loginSuccess, logout, updateProfile } from '../store/authSlice'

export function useLogin() {
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<AuthResponse>('/auth/login', data).then((res) => res.data),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      dispatch(loginSuccess(data.user))
    },
  })
}

export function useLogout() {
  const dispatch = useDispatch()
  return () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    dispatch(logout())
  }
}

export function useUpdateProfile() {
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      api.put<{ user: User }>('/auth/profile', data).then((res) => res.data.user),
    onSuccess: (user) => {
      localStorage.setItem('user', JSON.stringify(user))
      dispatch(updateProfile(user))
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      api.put('/auth/change-password', data).then((res) => res.data),
  })
}

export function useUsers() {
  return {
    list: () => api.get<User[]>('/users').then((r) => r.data),
    create: useMutation({
      mutationFn: (data: Partial<User> & { password: string }) =>
        api.post<User>('/users', data).then((r) => r.data),
    }),
    update: useMutation({
      mutationFn: ({ id, ...data }: Partial<User> & { id: string }) =>
        api.put<User>(`/users/${id}`, data).then((r) => r.data),
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`/users/${id}`),
    }),
  }
}
