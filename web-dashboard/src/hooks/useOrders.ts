import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Order, CreateOrderRequest } from '../types'

export function useOrders(limit = 50, offset = 0, start?: string, end?: string, status?: string) {
  return useQuery({
    queryKey: ['orders', { limit, offset, start, end, status }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', limit.toString())
      params.set('offset', offset.toString())
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      if (status) params.set('status', status)
      const r = await api.get<Order[]>(`/orders?${params.toString()}`)
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
      // BUG FIX: order baru harus langsung sync ke Buku Kas
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
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
      // BUG FIX: void order harus update Buku Kas
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
    },
  })
}

export function useCompleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (param: number | { id: number; payment_method?: string }) => {
      const id = typeof param === 'number' ? param : param.id
      const payload = typeof param === 'number' ? {} : { payment_method: param.payment_method }
      return api.post(`/orders/${id}/complete`, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['unpaid-orders'] })
      qc.invalidateQueries({ queryKey: ['kitchen-queue'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      // BUG FIX: complete order (Cash/QRIS paid) harus sync ke Buku Kas
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
    },
  })
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// Hook untuk sinkronisasi tagihan belum lunas (Open Bills) antara kasir dan barista (Live Sync 4s)
export function useUnpaidOrders() {
  return useQuery<Order[]>({
    queryKey: ['unpaid-orders'],
    queryFn: () => api.get('/orders/unpaid').then((r) => r.data),
    refetchInterval: 4000,
  })
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payment_method }: { id: number; payment_method: string }) =>
      api.put(`/orders/${id}/payment-method`, { payment_method }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
    },
  })
}

