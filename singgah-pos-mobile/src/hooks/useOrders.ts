import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Order, CreateOrderRequest } from '../types'

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<Order[]>('/orders').then((r) => r.data),
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrderRequest) =>
      api.post<Order>('/orders', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useVoidOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/orders/${id}/void`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
