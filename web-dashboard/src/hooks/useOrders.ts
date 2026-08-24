import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Order, CreateOrderRequest } from '../types'

export function useOrders(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['orders', { limit, offset }],
    queryFn: async () => {
      const r = await api.get<Order[]>(`/orders?limit=${limit}&offset=${offset}`)
      return Array.isArray(r.data) ? r.data : []
    },
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrderRequest) =>
      api.post<Order>('/orders', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
    },
  })
}

export function useVoidOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/orders/${id}/void`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
    },
  })
}

export function useCompleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/orders/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
    },
  })
}

